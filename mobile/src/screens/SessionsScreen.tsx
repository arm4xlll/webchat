import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../store/themeStore';
import { api } from '../api/client';
import type { Session } from '../types';
import type { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Sessions'> };

export default function SessionsScreen({ navigation }: Props) {
  const t = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    try { setSessions(await api.get<Session[]>('/sessions')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const revoke = (session: Session) => {
    if (session.current) return;
    Alert.alert('Завершить сессию?', session.label ?? session.userAgent ?? 'Неизвестное устройство', [
      { text: 'Завершить', style: 'destructive', onPress: async () => {
        setRevoking(session.id);
        try { await api.delete(`/sessions/${session.id}`); setSessions(s => s.filter(x => x.id !== session.id)); }
        finally { setRevoking(null); }
      }},
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Активные сессии</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={t.primary} size="large" /></View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: t.card, borderColor: item.current ? t.primary : t.border }]}>
              <View style={styles.cardHeader}>
                <Feather name="smartphone" size={18} color={item.current ? t.primary : t.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.device, { color: t.text }]} numberOfLines={1}>
                    {item.label ?? item.userAgent ?? 'Неизвестное устройство'}
                  </Text>
                  <Text style={[styles.meta, { color: t.muted }]}>
                    {item.ipAddress} · {formatDate(item.lastActiveAt)}
                  </Text>
                </View>
                {item.current ? (
                  <Text style={[styles.currentBadge, { color: t.primary }]}>Текущая</Text>
                ) : (
                  <TouchableOpacity onPress={() => revoke(item)} disabled={revoking === item.id}>
                    {revoking === item.id
                      ? <ActivityIndicator size="small" color={t.muted} />
                      : <Feather name="x" size={18} color="#f87171" />
                    }
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  device: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 12, marginTop: 2 },
  currentBadge: { fontSize: 12, fontWeight: '600' },
});
