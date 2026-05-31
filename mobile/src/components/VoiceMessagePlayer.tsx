import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';

// Lazy-load expo-av to avoid crashing in Expo Go builds that don't have it
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch {}

interface Props {
  uri: string;
  isOwn: boolean;
  duration?: number;
}

export default function VoiceMessagePlayer({ uri, isOwn, duration }: Props) {
  const t = useTheme();
  const sound = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  const [available] = useState(() => !!Audio);

  useEffect(() => () => { sound.current?.unloadAsync?.(); }, []);

  const toggle = async () => {
    if (!Audio) return;
    if (playing) { await sound.current?.pauseAsync(); setPlaying(false); return; }
    if (!sound.current) {
      const { sound: s } = await Audio.Sound.createAsync(
        { uri }, { progressUpdateIntervalMillis: 200 },
        (status: any) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis);
          setTotal(status.durationMillis ?? 0);
          if (status.didJustFinish) { setPlaying(false); setPosition(0); }
        }
      );
      sound.current = s;
    }
    await sound.current.playAsync();
    setPlaying(true);
  };

  const textColor = isOwn ? t.msgOutText : t.text;
  const metaColor = isOwn ? t.msgOutTextMuted : t.muted;
  const progress = total > 0 ? position / total : 0;

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={toggle}
        disabled={!available}
        style={[styles.playBtn, { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : t.primary + '33' }]}
      >
        <Feather
          name={playing ? 'pause' : 'play'}
          size={18}
          color={available ? (isOwn ? t.msgOutText : t.primary) : t.muted}
        />
      </TouchableOpacity>
      <View style={styles.right}>
        <View style={[styles.track, { backgroundColor: metaColor + '44' }]}>
          <View style={[styles.fill, { width: `${progress * 100}%` as any, backgroundColor: isOwn ? t.msgOutText : t.primary }]} />
        </View>
        <Text style={[styles.time, { color: metaColor }]}>
          {playing ? fmt(position) : fmt(total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, minWidth: 160 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  right: { flex: 1, gap: 4 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  time: { fontSize: 11 },
});
