import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCallStore } from '../../store/callStore';
import { useCall } from '../../hooks/useCall';
import { useTheme } from '../../store/themeStore';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveCallBar() {
  const t = useTheme();
  const status = useCallStore(s => s.status);
  const callerName = useCallStore(s => s.callerName);
  const { isMuted, toggleMute, remoteCount, handleEnd } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'active') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  if (status !== 'calling' && status !== 'active') return null;

  const isCalling = status === 'calling';

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderBottomColor: 'rgba(34, 197, 94, 0.2)' }]}>
      <View style={styles.left}>
        {isCalling ? (
          <ActivityIndicator size="small" color="#4ade80" />
        ) : (
          <View style={[styles.dot, { backgroundColor: '#4ade80' }]} />
        )}
        <Text style={[styles.text, { color: t.text }]} numberOfLines={1}>
          {isCalling
            ? `Звонок...`
            : remoteCount > 0
              ? formatDuration(elapsed)
              : 'Ожидание собеседника...'}
        </Text>
      </View>

      <View style={styles.right}>
        {status === 'active' && (
          <TouchableOpacity
            onPress={toggleMute}
            style={[
              styles.iconBtn,
              isMuted ? { backgroundColor: 'rgba(244, 63, 94, 0.2)' } : { backgroundColor: t.border }
            ]}
          >
            <Feather
              name={isMuted ? 'mic-off' : 'mic'}
              size={16}
              color={isMuted ? '#fb7185' : t.muted}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleEnd}
          style={[styles.iconBtn, { backgroundColor: '#f43f5e' }]}
        >
          <Feather name="phone-off" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
