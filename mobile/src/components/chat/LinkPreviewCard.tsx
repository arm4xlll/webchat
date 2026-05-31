import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { getLinkPreview } from '../../api/linkPreview';
import type { LinkPreviewData } from '../../types';
import { useTheme } from '../../store/themeStore';

interface Props {
  url: string;
  isOwn: boolean;
}

export default function LinkPreviewCard({ url, isOwn }: Props) {
  const t = useTheme();
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLinkPreview(url).then(d => {
      if (!cancelled) { setData(d); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, [url]);

  if (!loaded || !data || !data.title) return null;

  const handlePress = () => {
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.container,
        isOwn
          ? { backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'rgba(255,255,255,0.1)' }
          : { backgroundColor: t.card, borderColor: t.border }
      ]}
    >
      {!!data.imageUrl && (
        <Image
          source={{ uri: data.imageUrl }}
          style={styles.image}
        />
      )}
      <View style={styles.content}>
        {!!data.siteName && (
          <Text style={[styles.siteName, { color: t.primary }]} numberOfLines={1}>
            {data.siteName}
          </Text>
        )}
        <Text
          style={[
            styles.title,
            isOwn ? { color: t.msgOutText } : { color: t.text }
          ]}
          numberOfLines={2}
        >
          {data.title}
        </Text>
        {!!data.description && (
          <Text
            style={[
              styles.description,
              isOwn ? { color: t.msgOutTextMuted } : { color: t.textSoft }
            ]}
            numberOfLines={2}
          >
            {data.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 260,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  siteName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
});
