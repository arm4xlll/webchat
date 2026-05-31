import { memo } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useFontSize } from '../store/themeStore';
import type { Message } from '../types';
import { isStickerMessage, isImageMessage, isAudioMessage } from '../types';
import VoiceMessagePlayer from './VoiceMessagePlayer';

interface Props {
  message: Message;
  isOwn: boolean;
  showName: boolean;
  onLongPress?: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MessageBubble = memo(function MessageBubble({ message, isOwn, showName, onLongPress }: Props) {
  const t = useTheme();
  const fontSize = useFontSize();

  const bubbleBg = isOwn ? t.msgOut : t.msgIn;
  const textColor = isOwn ? t.msgOutText : t.text;
  const metaColor = isOwn ? t.msgOutTextMuted : t.muted;

  if (message.deleted) {
    return (
      <View style={[styles.wrap, isOwn ? styles.wrapRight : styles.wrapLeft]}>
        <View style={[styles.bubble, { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }]}>
          <Text style={[styles.deletedText, { color: t.muted }]}>Сообщение удалено</Text>
        </View>
      </View>
    );
  }

  const isSticker = isStickerMessage(message.fileUrl, message.fileName);
  const isImage = !isSticker && isImageMessage(message.fileType);
  const isAudio = isAudioMessage(message.fileType);
  const hasFile = !!message.fileUrl && !isSticker && !isImage && !isAudio;

  return (
    <View style={[styles.wrap, isOwn ? styles.wrapRight : styles.wrapLeft]}>
      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={300}
        activeOpacity={0.85}
        style={[
          isSticker ? styles.bubbleSticker : styles.bubble,
          !isSticker && { backgroundColor: bubbleBg },
          message.pending && styles.pending,
        ]}
      >
        {!isOwn && showName && (
          <Text style={[styles.senderName, { color: t.primary }]}>{message.senderName}</Text>
        )}

        {/* Reply preview */}
        {message.replyToId && (
          <View style={[styles.reply, { borderLeftColor: isOwn ? 'rgba(255,255,255,0.4)' : t.primary }]}>
            <Text style={[styles.replyName, { color: isOwn ? 'rgba(255,255,255,0.8)' : t.primary }]}>
              {message.replyToSenderName}
            </Text>
            <Text style={[styles.replyContent, { color: metaColor }]} numberOfLines={2}>
              {message.replyToContent}
            </Text>
          </View>
        )}

        {/* Sticker */}
        {isSticker && message.fileUrl && (
          <Image source={{ uri: message.fileUrl }} style={styles.sticker} resizeMode="contain" />
        )}

        {/* Image */}
        {isImage && message.fileUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(message.fileUrl!)} activeOpacity={0.9}>
            <Image source={{ uri: message.fileUrl }} style={styles.imageAttachment} resizeMode="cover" />
          </TouchableOpacity>
        )}

        {/* Audio/Voice */}
        {isAudio && message.fileUrl && (
          <VoiceMessagePlayer uri={message.fileUrl} isOwn={isOwn} duration={message.fileSize} />
        )}

        {/* File */}
        {hasFile && (
          <TouchableOpacity style={[styles.fileBox, { backgroundColor: isOwn ? 'rgba(0,0,0,0.15)' : t.bg }]} onPress={() => Linking.openURL(message.fileUrl!)}>
            <Feather name="file" size={20} color={isOwn ? t.msgOutText : t.primary} />
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{message.fileName}</Text>
              <Text style={[styles.fileSize, { color: metaColor }]}>{formatFileSize(message.fileSize)}</Text>
            </View>
            <Feather name="download" size={16} color={metaColor} />
          </TouchableOpacity>
        )}

        {/* Text content */}
        {!!message.content && !isSticker && (
          <Text style={[styles.content, { color: textColor, fontSize }]}>{message.content}</Text>
        )}

        {/* Meta row */}
        {!isSticker && (
          <View style={styles.meta}>
            {message.editedAt && <Text style={[styles.edited, { color: metaColor }]}>ред.</Text>}
            <Text style={[styles.time, { color: metaColor }]}>{formatTime(message.createdAt)}</Text>
            {isOwn && (
              <Feather
                name={message.readAt ? 'check-circle' : 'check'}
                size={12}
                color={message.readAt ? t.primary : metaColor}
              />
            )}
          </View>
        )}

        {/* Reactions */}
        {message.reactions && Object.entries(message.reactions).some(([, users]) => users.length > 0) && (
          <View style={styles.reactions}>
            {Object.entries(message.reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <View key={emoji} style={[styles.reaction, { backgroundColor: isOwn ? 'rgba(0,0,0,0.2)' : t.bg }]}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, { color: textColor }]}>{users.length}</Text>
                </View>
              ) : null
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

export default MessageBubble;

const styles = StyleSheet.create({
  wrap: { marginVertical: 1, paddingHorizontal: 10 },
  wrapRight: { alignItems: 'flex-end' },
  wrapLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 6, gap: 2 },
  bubbleSticker: { maxWidth: '60%' },
  pending: { opacity: 0.55 },
  senderName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  reply: { borderLeftWidth: 2, paddingLeft: 8, marginBottom: 6, borderRadius: 2 },
  replyName: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
  replyContent: { fontSize: 12 },
  sticker: { width: 160, height: 160 },
  imageAttachment: { width: 220, height: 180, borderRadius: 10, marginBottom: 4 },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 4 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '500' },
  fileSize: { fontSize: 11 },
  content: { lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 },
  time: { fontSize: 11 },
  edited: { fontSize: 11, fontStyle: 'italic' },
  deletedText: { fontStyle: 'italic', fontSize: 14 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: '500' },
});
