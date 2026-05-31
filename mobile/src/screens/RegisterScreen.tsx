import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { register, ApiError } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import type { AuthStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const t = useTheme();
  const setAuth = useAuthStore(s => s.setAuth);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !password.trim()) return;
    setError(''); setLoading(true);
    try {
      const data = await register(name.trim(), username.trim(), password);
      setAuth({ id: data.userId, name: data.name, username: data.username, bio: data.bio, avatarUrl: data.avatarUrl, isAdmin: data.isAdmin }, data.accessToken);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось подключиться к серверу');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={[styles.logoBox, { backgroundColor: t.primary }]}>
              <Feather name="message-square" size={30} color="#fff" />
            </View>
            <Text style={[styles.appName, { color: t.text }]}>WebChat</Text>
          </View>

          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.title, { color: t.text }]}>Регистрация</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>Создайте аккаунт, это займёт секунду</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: t.textSoft }]}>Имя</Text>
              <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Feather name="user" size={16} color={t.muted} />
                <TextInput style={[styles.input, { color: t.text }]} value={name} onChangeText={setName}
                  placeholder="Имя Фамилия" placeholderTextColor={t.muted} autoCapitalize="words" returnKeyType="next" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: t.textSoft }]}>Юзернейм</Text>
              <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Text style={{ color: t.muted, fontSize: 16 }}>@</Text>
                <TextInput style={[styles.input, { color: t.text }]} value={username} onChangeText={setUsername}
                  placeholder="username" placeholderTextColor={t.muted} autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
              </View>
              <Text style={[styles.hint, { color: t.muted }]}>Только латинские буквы, цифры и _</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: t.textSoft }]}>Пароль</Text>
              <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Feather name="lock" size={16} color={t.muted} />
                <TextInput style={[styles.input, { color: t.text }]} value={password} onChangeText={setPassword}
                  placeholder="Минимум 6 символов" placeholderTextColor={t.muted} secureTextEntry={!showPass}
                  returnKeyType="done" onSubmitEditing={handleRegister} />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={t.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {error !== '' && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.button, { backgroundColor: loading ? t.muted : t.primary }]}
              onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Создать аккаунт</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: t.muted }]}>Уже есть аккаунт? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.link, { color: t.primary }]}>Войти</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  appName: { fontSize: 26, fontWeight: '700', letterSpacing: 0.3 },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 4 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 13 },
  hint: { fontSize: 12, marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, padding: 12, marginBottom: 8 },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },
  button: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '600' },
});
