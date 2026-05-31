import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import { updateProfile } from '../api/users';
import Avatar from '../components/Avatar';
import type { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'> };

export default function ProfileScreen({ navigation }: Props) {
  const t = useTheme();
  const { user, updateUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const hasChanges = name !== user.name || bio !== (user.bio ?? '');

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await updateProfile(name.trim(), bio.trim());
      updateUser({ ...user, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Профиль</Text>
        {hasChanges && (
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={t.primary} size="small" />
              : <Text style={[styles.saveBtn, { color: saved ? '#22c55e' : t.primary }]}>
                  {saved ? 'Сохранено' : 'Сохранить'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={90} />
          <Text style={[styles.username, { color: t.muted }]}>@{user.username}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.muted }]}>Имя</Text>
            <TextInput style={[styles.input, { color: t.text }]} value={name} onChangeText={setName}
              placeholder="Ваше имя" placeholderTextColor={t.muted} autoCapitalize="words" />
          </View>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.muted }]}>О себе</Text>
            <TextInput style={[styles.input, styles.bioInput, { color: t.text }]} value={bio} onChangeText={setBio}
              placeholder="Расскажите о себе..." placeholderTextColor={t.muted} multiline maxLength={300} />
          </View>
        </View>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
          <Feather name="settings" size={18} color={t.primary} />
          <Text style={[styles.menuLabel, { color: t.text }]}>Настройки</Text>
          <Feather name="chevron-right" size={18} color={t.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: t.card, borderColor: t.border }]} onPress={logout}>
          <Feather name="log-out" size={18} color="#f87171" />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  saveBtn: { fontSize: 15, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  avatarWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  username: { fontSize: 15 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  field: { padding: 16 },
  label: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  input: { fontSize: 15 },
  bioInput: { minHeight: 60 },
  divider: { height: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  menuLabel: { flex: 1, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#f87171' },
});
