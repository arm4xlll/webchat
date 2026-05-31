import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';
import type { PinnedMessage } from '../types';

interface Props {
  pin: PinnedMessage;
  onPress?: () => void;
  onClose?: () => void;
}

export default function PinnedBanner({ pin, onPress, onClose }: Props) {
  const t = useTheme();
  return (
    <TouchableOpacity style={[styles.wrap, { backgroundColor: t.card, borderBottomColor: t.border }]} onPress={onPress} activeOpacity={0.8}>
      <Feather name="chevrons-right" size={16} color={t.primary} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: t.primary }]}>Закреплённое сообщение</Text>
        <Text style={[styles.text, { color: t.textSoft }]} numberOfLines={1}>{pin.content}</Text>
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={16} color={t.muted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 10, borderBottomWidth: 1 },
  content: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
  text: { fontSize: 13 },
});
