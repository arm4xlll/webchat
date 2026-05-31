import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { searchUsers } from '../api/users';
import { createConversation } from '../api/conversations';
import { useChatStore } from '../store/chatStore';
import { useTheme } from '../store/themeStore';
import Avatar from '../components/Avatar';
import type { RootStackParamList } from '../../App';
import type { User } from '../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'SearchUsers'> };

export default function SearchUsersScreen({ navigation }: Props) {
  const t = useTheme();
  const { addConversation, setActiveConversation } = useChatStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try { setResults(await searchUsers(q.trim())); }
    catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const openChat = async (targetUser: User) => {
    if (openingId) return;
    setOpeningId(targetUser.id);
    try {
      const conv = await createConversation(targetUser.id);
      addConversation(conv);
      setActiveConversation(conv.id);
      navigation.replace('Chat', { conversationId: conv.id, conversationName: targetUser.name, partnerAvatarUrl: targetUser.avatarUrl });
    } catch { setOpeningId(null); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="x" size={22} color={t.textSoft} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Новый чат</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: t.card, borderColor: t.border, margin: 12 }]}>
        <Feather name="search" size={16} color={t.muted} style={{ marginLeft: 12 }} />
        <TextInput style={[styles.searchInput, { color: t.text }]} value={query} onChangeText={search}
          placeholder="Поиск пользователей..." placeholderTextColor={t.muted}
          autoFocus autoCapitalize="none" autoCorrect={false} />
        {loading && <ActivityIndicator color={t.primary} size="small" style={{ marginRight: 12 }} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={u => String(u.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userRow} onPress={() => openChat(item)} disabled={openingId === item.id} activeOpacity={0.7}>
            <Avatar name={item.name} avatarUrl={item.avatarUrl} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: t.text }]}>{item.name}</Text>
              <Text style={[styles.userUsername, { color: t.muted }]}>@{item.username}</Text>
            </View>
            {openingId === item.id && <ActivityIndicator color={t.primary} size="small" />}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: t.border }]} />}
        ListEmptyComponent={query.length > 0 && !loading ? (
          <View style={styles.empty}><Text style={[styles.emptyText, { color: t.muted }]}>Пользователи не найдены</Text></View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, paddingHorizontal: 10, paddingVertical: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  userName: { fontSize: 15, fontWeight: '600' },
  userUsername: { fontSize: 13 },
  separator: { height: 1, marginLeft: 74 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
