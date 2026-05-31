import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  readAt: string | undefined;
  pending?: boolean;
}

export default function MessageStatus({ readAt, pending }: Props) {
  const t = useTheme();
  const isRead = readAt != null;

  if (pending) {
    return (
      <View style={styles.container}>
        <Feather name="clock" size={11} color={t.msgOutTextMuted} style={{ opacity: 0.7 }} />
      </View>
    );
  }

  const primary = t.primary;
  const muted = t.msgOutTextMuted;

  return (
    <View style={styles.container}>
      <Svg width="15" height="13" viewBox="0 0 16 14" fill="none">
        <Defs>
          <LinearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="52%" stopColor={muted} />
            <Stop offset="52%" stopColor="transparent" />
          </LinearGradient>
        </Defs>
        <Path
          d="M8 12.8C8 12.8 1 8.2 1 4.2C1 2.2 2.6 1 4.5 1C5.9 1 7.1 1.85 8 3C8.9 1.85 10.1 1 11.5 1C13.4 1 15 2.2 15 4.2C15 8.2 8 12.8 8 12.8Z"
          fill={isRead ? primary : 'url(#grad)'}
          stroke={isRead ? primary : muted}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
