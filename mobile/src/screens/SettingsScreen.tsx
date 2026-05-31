import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useThemeStore, THEMES } from '../store/themeStore';
import type { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'> };

const FONT_SIZES = [
  { label: 'Маленький', value: 13 },
  { label: 'Средний', value: 15 },
  { label: 'Крупный', value: 17 },
];

export default function SettingsScreen({ navigation }: Props) {
  const t = useTheme();
  const { themeId, fontSize, setTheme, setFontSize } = useThemeStore();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Настройки</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme */}
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Тема оформления</Text>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {THEMES.map((theme, i) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeRow,
                i < THEMES.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border },
              ]}
              onPress={() => setTheme(theme.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.themePreview, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border }]}>
                <View style={[styles.themePreviewMsg, { backgroundColor: theme.colors.msgOut }]} />
              </View>
              <Text style={[styles.themeName, { color: t.text }]}>{theme.name}</Text>
              {themeId === theme.id && <Feather name="check" size={18} color={t.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Font size */}
        <Text style={[styles.sectionLabel, { color: t.muted }]}>Размер текста</Text>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {FONT_SIZES.map((fs, i) => (
            <TouchableOpacity
              key={fs.value}
              style={[
                styles.themeRow,
                i < FONT_SIZES.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border },
              ]}
              onPress={() => setFontSize(fs.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.themeName, { color: t.text, fontSize: fs.value }]}>{fs.label}</Text>
              {fontSize === fs.value && <Feather name="check" size={18} color={t.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sessions */}
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={() => navigation.navigate('Sessions')}
          activeOpacity={0.7}
        >
          <Feather name="smartphone" size={18} color={t.primary} />
          <Text style={[styles.menuItemLabel, { color: t.text }]}>Активные сессии</Text>
          <Feather name="chevron-right" size={18} color={t.muted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  themeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  themePreview: { width: 36, height: 24, borderRadius: 6, borderWidth: 1, justifyContent: 'flex-end', padding: 3 },
  themePreviewMsg: { height: 8, borderRadius: 3, width: '60%', alignSelf: 'flex-end' },
  themeName: { flex: 1, fontSize: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  menuItemLabel: { flex: 1, fontSize: 15 },
});
