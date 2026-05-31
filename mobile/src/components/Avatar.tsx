import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/themeStore';

interface Props {
  name: string;
  avatarUrl?: string;
  size?: number;
  online?: boolean;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const PALETTE = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316'];
function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export default function Avatar({ name, avatarUrl, size = 42, online }: Props) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: nameColor(name) }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
        </View>
      )}
      {online !== undefined && (
        <View style={[styles.dot, {
          width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
          backgroundColor: online ? '#22c55e' : t.border,
          borderColor: t.bg,
        }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
  dot: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2 },
});
