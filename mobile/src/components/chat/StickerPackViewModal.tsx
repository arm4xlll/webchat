import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { findPackBySticker, getPackBySlug, subscribeToPack } from '../../api/stickers';
import { useStickerStore } from '../../store/stickerStore';
import { useAuthStore } from '../../store/authStore';
import type { StickerPack, StickerItem } from '../../types/sticker';
import { useTheme } from '../../store/themeStore';

interface Props {
  fileUrl?: string;
  slug?: string;
  onClose: () => void;
  onSend?: (sticker: StickerItem) => void;
}

export default function StickerPackViewModal({ fileUrl, slug, onClose, onSend }: Props) {
  const t = useTheme();
  const user = useAuthStore(s => s.user);
  const { packs, invalidate, loadUserPacks } = useStickerStore();

  const [pack, setPack] = useState<StickerPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        let loaded: StickerPack;
        if (fileUrl) {
          loaded = await findPackBySticker(fileUrl);
        } else if (slug) {
          loaded = await getPackBySlug(slug);
        } else {
          throw new Error('fileUrl или slug обязателен');
        }
        if (!cancelled) {
          setPack(loaded);
          const alreadyHave = packs.some(p => p.id === loaded.id);
          if (alreadyHave) setSubscribed(true);
        }
      } catch {
        if (!cancelled) setError('Не удалось загрузить стикерпак');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fileUrl, slug]);

  const isOwn = pack?.creatorId && user?.id && pack.creatorId === user.id;
  const alreadyInCollection = subscribed || packs.some(p => p.id === pack?.id);

  const handleSubscribe = async () => {
    if (!pack) return;
    setSubscribing(true);
    try {
      await subscribeToPack(pack.slug);
      setSubscribed(true);
      invalidate();
      await loadUserPacks();
    } catch {
      // ignore
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: t.bg }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: t.border }]}>
                <View style={{ flex: 1 }}>
                  {loading ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <>
                      <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>{pack?.title ?? '—'}</Text>
                      {pack && (
                        <Text style={[styles.subtitle, { color: t.muted }]}>
                          @{pack.slug} · {pack.stickers.length} стикеров
                        </Text>
                      )}
                    </>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={t.muted} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView style={styles.body}>
                {loading ? null : error ? (
                  <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>
                ) : pack ? (
                  <View style={styles.grid}>
                    {pack.stickers.map(sticker => (
                      <TouchableOpacity
                        key={sticker.id}
                        style={styles.cell}
                        onPress={() => { if (onSend) { onSend(sticker); onClose(); } }}
                      >
                        <Image source={{ uri: sticker.fileUrl }} style={styles.stickerImg} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </ScrollView>

              {/* Footer */}
              {!loading && !error && (
                <View style={[styles.footer, { borderTopColor: t.border }]}>
                  {isOwn ? (
                    <TouchableOpacity style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
                      <Text style={{ color: t.text }}>Управление паком (скоро)</Text>
                    </TouchableOpacity>
                  ) : !alreadyInCollection ? (
                    <TouchableOpacity
                      onPress={handleSubscribe}
                      disabled={subscribing}
                      style={[styles.btn, { backgroundColor: t.primary }]}
                    >
                      {subscribing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Добавить себе</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
                      <Feather name="check" size={16} color={t.primary} />
                      <Text style={{ color: t.muted, marginLeft: 8 }}>Уже в коллекции</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  body: {
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '25%',
    aspectRatio: 1,
    padding: 4,
  },
  stickerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  btn: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
