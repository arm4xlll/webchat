import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from './Avatar';
import { useTheme } from '../store/themeStore';
import type { Conversation, User } from '../types';

interface Props {
  conversation: Conversation;
  currentUserId: number;
  onPress: () => void;
  unreadCount: number;
  online?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'вчера';
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

export function getPartner(conv: Conversation, currentUserId: number): User {
  return conv.members.find(m => m.id !== currentUserId) ?? conv.members[0];
}

const ConversationItem = memo(function ConversationItem({ conversation, currentUserId, onPress, unreadCount, online }: Props) {
  const t = useTheme();
  const partner = getPartner(conversation, currentUserId);
  const lastTime = conversation.lastMessageAt ?? conversation.createdAt;

  return (
    <TouchableOpacity style={[styles.row, { backgroundColor: t.bg }]} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={partner.name} avatarUrl={partner.avatarUrl} size={50} online={online} />
      <View style={styles.middle}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{partner.name}</Text>
        <Text style={[styles.preview, { color: unreadCount > 0 ? t.textSoft : t.muted }]} numberOfLines={1}>
          {conversation.lastMessageContent ?? 'Нет сообщений'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.time, { color: t.muted }]}>{formatTime(lastTime)}</Text>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: t.primary }]}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default ConversationItem;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  middle: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '600' },
  preview: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 12 },
  badge: { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
