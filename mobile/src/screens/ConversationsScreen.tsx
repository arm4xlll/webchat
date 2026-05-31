import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import { getConversations } from '../api/conversations';
import { useEventStream } from '../hooks/useEventStream';
import ConversationItem, { getPartner } from '../components/ConversationItem';
import type { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Conversations'> };

export default function ConversationsScreen({ navigation }: Props) {
  const t = useTheme();
  const { conversations, setActiveConversation, presenceStatus, unreadCounts, setConversations } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEventStream();

  const load = useCallback(async () => {
    try { setConversations(await getConversations()); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openChat = (conversationId: string, name: string, avatarUrl?: string) => {
    setActiveConversation(conversationId);
    navigation.navigate('Chat', { conversationId, conversationName: name, partnerAvatarUrl: avatarUrl });
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Сообщения</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('SearchUsers')}>
            <Feather name="edit" size={20} color={t.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Feather name="user" size={20} color={t.textSoft} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={t.primary} size="large" /></View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Feather name="message-square" size={48} color={t.border} />
          <Text style={[styles.emptyTitle, { color: t.textSoft }]}>Нет чатов</Text>
          <Text style={[styles.emptyHint, { color: t.muted }]}>Нажмите карандаш чтобы начать переписку</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          renderItem={({ item }) => {
            const partner = getPartner(item, user.id);
            return (
              <ConversationItem
                conversation={item}
                currentUserId={user.id}
                onPress={() => openChat(item.id, partner.name, partner.avatarUrl)}
                unreadCount={unreadCounts[item.id] ?? 0}
                online={presenceStatus[partner.id]?.online}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: t.border }]} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={t.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyHint: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  separator: { height: 1, marginLeft: 78 },
});
