import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';

// Lazy-load expo-av — unavailable in outdated Expo Go builds
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {}
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import {
  getMessages, sendMessage as apiSend, editMessage, deleteMessage,
  sendTyping, markRead, toggleReaction,
} from '../api/conversations';
import { getPins } from '../api/pins';
import { API_BASE } from '../constants';
import MessageBubble from '../components/MessageBubble';
import MessageContextMenu from '../components/MessageContextMenu';
import PinnedBanner from '../components/PinnedBanner';
import Avatar from '../components/Avatar';
import type { RootStackParamList } from '../../App';
import type { Message, PinnedMessage } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

type ListItem = Message | { _type: 'date'; label: string; key: string };
const isDate = (i: ListItem): i is { _type: 'date'; label: string; key: string } => '_type' in i;

function dateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Сегодня';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function uploadFile(uri: string, name: string, type: string, token: string) {
  const form = new FormData();
  form.append('file', { uri, name, type } as any);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json() as Promise<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }>;
}

export default function ChatScreen({ navigation, route }: Props) {
  const { conversationId, conversationName, partnerAvatarUrl } = route.params;
  const t = useTheme();
  const { user } = useAuthStore();
  const { messages, setMessages, prependMessages, addMessage, updateMessage: storeUpdate,
    removeMessage: storeRemove, typingUsers, presenceStatus, conversations } = useChatStore();

  const convMsgs = messages[conversationId] ?? [];
  const typingList = typingUsers[conversationId] ?? [];
  const conv = conversations.find(c => c.id === conversationId);
  const partner = conv?.members.find(m => m.id !== user?.id);
  const presence = partner ? presenceStatus[partner.id] : undefined;

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Edit state
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);

  // Context menu
  const [ctxMsg, setCtxMsg] = useState<Message | null>(null);

  // Pins
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [showPin, setShowPin] = useState(true);

  // Voice recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const flatRef = useRef<FlatList<ListItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [msgs, pinList] = await Promise.all([
          getMessages(conversationId, 0),
          getPins(conversationId),
        ]);
        setMessages(conversationId, msgs);
        setPins(pinList);
        setHasMore(msgs.length === 30);
        await markRead(conversationId);
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId]);

  useEffect(() => {
    // Scroll to end is no longer needed with inverted FlatList
  }, [convMsgs.length]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const msgs = await getMessages(conversationId, next);
      if (msgs.length > 0) { prependMessages(conversationId, msgs); setPage(next); }
      setHasMore(msgs.length === 30);
    } finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, page, conversationId]);

  const handleTextChange = (val: string) => {
    setText(val);
    sendTyping(conversationId, true).catch(() => {});
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(conversationId, false).catch(() => {}), 2000);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setText('');
    setReplyTo(null);
    setEditingMsg(null);

    if (editingMsg) {
      try { const updated = await editMessage(conversationId, editingMsg.id, content); storeUpdate(updated); }
      catch {}
      return;
    }

    const tempMsg: Message = {
      id: Date.now(), conversationId, senderId: user.id,
      senderUsername: user.username, senderName: user.name,
      content, createdAt: new Date().toISOString(), pending: true,
      replyToId: replyTo?.id, replyToContent: replyTo?.content, replyToSenderName: replyTo?.senderName,
    };
    addMessage(tempMsg);
    try { await apiSend(conversationId, content, replyTo?.id); } catch {}
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const token = useAuthStore.getState().accessToken!;
      const att = await uploadFile(asset.uri, asset.fileName ?? 'image.jpg', asset.mimeType ?? 'image/jpeg', token);
      await apiSend(conversationId, '', replyTo?.id);
    } catch { Alert.alert('Ошибка', 'Не удалось загрузить файл'); }
    finally { setUploading(false); setReplyTo(null); }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const token = useAuthStore.getState().accessToken!;
      const att = await uploadFile(asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream', token);
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: '', ...att, replyToId: replyTo?.id }),
      });
      if (res.ok) { const msg = await res.json(); storeUpdate(msg); }
    } catch { Alert.alert('Ошибка', 'Не удалось загрузить файл'); }
    finally { setUploading(false); setReplyTo(null); }
  };

  const startRecording = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
    setRecordingMs(0);
    recordTimer.current = setInterval(() => setRecordingMs(ms => ms + 100), 100);
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (recordTimer.current) clearInterval(recordTimer.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordingMs(0);
    if (!uri || recordingMs < 500) return;
    setUploading(true);
    try {
      const token = useAuthStore.getState().accessToken!;
      const att = await uploadFile(uri, 'voice.m4a', 'audio/m4a', token);
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: '', ...att, replyToId: replyTo?.id }),
      });
      if (res.ok) { const msg = await res.json(); addMessage(msg); }
    } catch {}
    finally { setUploading(false); setReplyTo(null); }
  };

  const handleDelete = (msg: Message) => {
    Alert.alert('Удалить сообщение', 'Выберите способ удаления', [
      { text: 'Только у меня', onPress: async () => { await deleteMessage(conversationId, msg.id, false); storeRemove(conversationId, msg.id); } },
      { text: 'У всех', style: 'destructive', onPress: async () => { await deleteMessage(conversationId, msg.id, true); storeRemove(conversationId, msg.id); } },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const startEdit = (msg: Message) => {
    setEditingMsg(msg);
    setText(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => { setEditingMsg(null); setText(''); };
  const cancelReply = () => setReplyTo(null);

  // Build list with date separators
  const listData: ListItem[] = [];
  let lastDate = '';
  for (const msg of convMsgs) {
    const dl = dateLabel(msg.createdAt);
    if (dl !== lastDate) { listData.push({ _type: 'date', label: dl, key: `d-${dl}` }); lastDate = dl; }
    listData.push(msg);
  }
  const reversedListData = listData.slice().reverse();

  const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (isDate(item)) {
      return (
        <View style={styles.dateWrap}>
          <Text style={[styles.dateLabel, { backgroundColor: t.card, color: t.muted }]}>{item.label}</Text>
        </View>
      );
    }
    const isOwn = item.senderId === user?.id;
    // In reversed list, the 'previous' message chronologically is the NEXT item in the array
    const prev = reversedListData[index + 1];
    const prevIsDate = !prev || isDate(prev);
    const prevMsg = prevIsDate ? null : (reversedListData[index + 1] as Message);
    const showName = !isOwn && (!prevMsg || prevMsg.senderId !== item.senderId);
    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showName={showName}
        onLongPress={() => setCtxMsg(item)}
      />
    );
  }, [listData, user?.id, t]);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const topPin = showPin && pins.length > 0 ? pins[pins.length - 1] : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={t.text} />
        </TouchableOpacity>
        <Avatar name={conversationName} avatarUrl={partnerAvatarUrl} size={38} online={presence?.online} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: t.text }]} numberOfLines={1}>{conversationName}</Text>
          <Text style={[styles.headerStatus, { color: t.muted }]}>
            {presence?.online ? 'онлайн'
              : presence?.lastSeenAt
                ? `был(а) в ${new Date(presence.lastSeenAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
          </Text>
        </View>
      </View>

      {/* Pinned banner */}
      {topPin && <PinnedBanner pin={topPin} onClose={() => setShowPin(false)} />}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={t.primary} size="large" /></View>
        ) : (
          <FlatList
            ref={flatRef}
            data={reversedListData}
            inverted
            keyExtractor={item => isDate(item) ? item.key : String(item.id)}
            renderItem={renderItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={t.primary} style={{ padding: 12 }} /> : null}
            contentContainerStyle={styles.msgList}
            removeClippedSubviews
            maxToRenderPerBatch={15}
            windowSize={10}
          />
        )}

        {/* Typing */}
        {typingList.length > 0 && (
          <Text style={[styles.typing, { color: t.muted }]}>
            {typingList.map(u => u.username).join(', ')} печатает...
          </Text>
        )}

        {/* Reply / Edit bar */}
        {(replyTo || editingMsg) && (
          <View style={[styles.contextBar, { backgroundColor: t.card, borderTopColor: t.border }]}>
            <Feather name={editingMsg ? 'edit-2' : 'corner-up-left'} size={16} color={t.primary} />
            <View style={styles.contextBarText}>
              <Text style={[styles.contextBarTitle, { color: t.primary }]}>
                {editingMsg ? 'Редактирование' : `Ответ ${replyTo?.senderName}`}
              </Text>
              <Text style={[styles.contextBarContent, { color: t.muted }]} numberOfLines={1}>
                {editingMsg?.content ?? replyTo?.content}
              </Text>
            </View>
            <TouchableOpacity onPress={editingMsg ? cancelEdit : cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={t.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Voice recording bar */}
        {recording && (
          <View style={[styles.recordingBar, { backgroundColor: t.card, borderTopColor: t.border }]}>
            <View style={[styles.recDot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.recTime, { color: t.text }]}>{formatMs(recordingMs)}</Text>
            <Text style={[styles.recHint, { color: t.muted }]}>Отпустите чтобы отправить</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: t.border, backgroundColor: t.card }]}>
          {!recording && (
            <TouchableOpacity style={styles.attachBtn} onPress={() => {
              Alert.alert('Вложение', 'Что отправить?', [
                { text: 'Фото/Видео', onPress: handlePickImage },
                { text: 'Файл', onPress: handlePickFile },
                { text: 'Отмена', style: 'cancel' },
              ]);
            }}>
              {uploading
                ? <ActivityIndicator size="small" color={t.primary} />
                : <Feather name="paperclip" size={22} color={t.muted} />
              }
            </TouchableOpacity>
          )}

          {recording ? (
            <View style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, justifyContent: 'center' }]}>
              <Text style={{ color: t.muted }}>Запись...</Text>
            </View>
          ) : (
            <TextInput
              ref={inputRef}
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              value={text}
              onChangeText={handleTextChange}
              placeholder="Сообщение..."
              placeholderTextColor={t.muted}
              multiline
              maxLength={4000}
            />
          )}

          {text.trim() ? (
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: t.primary }]} onPress={handleSend}>
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: recording ? '#ef4444' : t.primary }]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.85}
            >
              <Feather name="mic" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Context menu */}
      {ctxMsg && (
        <MessageContextMenu
          visible
          onClose={() => setCtxMsg(null)}
          isOwn={ctxMsg.senderId === user?.id}
          onReact={async (emoji) => { try { await toggleReaction(ctxMsg.id, emoji); } catch {} }}
          onReply={() => { setReplyTo(ctxMsg); setCtxMsg(null); inputRef.current?.focus(); }}
          onCopy={() => Clipboard.setStringAsync(ctxMsg.content)}
          onEdit={ctxMsg.senderId === user?.id ? () => startEdit(ctxMsg) : undefined}
          onDelete={ctxMsg.senderId === user?.id ? () => handleDelete(ctxMsg) : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '600' },
  headerStatus: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList: { paddingVertical: 8 },
  dateWrap: { alignItems: 'center', marginVertical: 10 },
  dateLabel: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  typing: { fontSize: 12, fontStyle: 'italic', paddingHorizontal: 16, paddingBottom: 4 },
  contextBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderTopWidth: 1 },
  contextBarText: { flex: 1 },
  contextBarTitle: { fontSize: 12, fontWeight: '600' },
  contextBarContent: { fontSize: 13 },
  recordingBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderTopWidth: 1 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recTime: { fontSize: 16, fontWeight: '600', minWidth: 45 },
  recHint: { fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Platform.OS === 'android' ? 14 : 8, gap: 8, borderTopWidth: 1 },
  attachBtn: { padding: 8, marginBottom: 2 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});
