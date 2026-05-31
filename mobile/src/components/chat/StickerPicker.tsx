import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';
import { useStickerStore } from '../../store/stickerStore';
import type { StickerItem, StickerPack } from '../../types/sticker';
import { isStickerVideoType } from '../../types/sticker';
import StickerPackViewModal from './StickerPackViewModal';
import CreatePackModal from './CreatePackModal';

interface Props {
  onSend: (sticker: StickerItem) => void;
  onClose: () => void;
}

const RECENT_TAB = '__recent__';

export default function StickerPicker({ onSend, onClose }: Props) {
  const t = useTheme();
  const { packs, recentStickers, loadedSlugs, packsLoaded, loadUserPacks, loadPackStickers, trackUsed } = useStickerStore();

  const [activeTab, setActiveTab] = useState<string>(RECENT_TAB);
  const [createOpen, setCreateOpen] = useState(false);
  const [packViewSlug, setPackViewSlug] = useState<string | null>(null);
  const [loadingTab, setLoadingTab] = useState(false);
  const [displayedStickers, setDisplayedStickers] = useState<StickerItem[]>([]);
  const [activePack, setActivePack] = useState<StickerPack | null>(null);

  useEffect(() => {
    loadUserPacks();
  }, [loadUserPacks]);

  useEffect(() => {
    if (packsLoaded && packs.length > 0 && recentStickers.length === 0 && activeTab === RECENT_TAB) {
      selectTab(packs[0].slug);
    }
  }, [packsLoaded]);

  useEffect(() => {
    if (activeTab === RECENT_TAB) {
      setDisplayedStickers(recentStickers);
      setActivePack(null);
      return;
    }
    const cached = loadedSlugs[activeTab];
    if (cached) {
      setDisplayedStickers(cached);
      setActivePack(packs.find(p => p.slug === activeTab) ?? null);
    }
  }, [activeTab, loadedSlugs, recentStickers, packs]);

  const selectTab = useCallback(async (slug: string) => {
    if (slug === RECENT_TAB) {
      setActiveTab(RECENT_TAB);
      return;
    }
    setActiveTab(slug);
    if (!loadedSlugs[slug]) {
      setLoadingTab(true);
      await loadPackStickers(slug);
      setLoadingTab(false);
    }
  }, [loadedSlugs, loadPackStickers]);

  const handleSend = (sticker: StickerItem) => {
    trackUsed(sticker);
    onSend(sticker);
    onClose();
  };

  const hasRecent = recentStickers.length > 0;
  const currentPackName = activeTab === RECENT_TAB ? 'Недавние' : (activePack?.title ?? activeTab);

  return (
    <>
      <View style={[styles.container, { backgroundColor: t.bg, borderColor: t.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: t.border }]}>
          {hasRecent && (
            <TabButton active={activeTab === RECENT_TAB} onPress={() => selectTab(RECENT_TAB)}>
              <Feather name="clock" size={18} color={activeTab === RECENT_TAB ? t.primary : t.muted} />
            </TabButton>
          )}

          {packs.map(pack => {
            const firstSticker = loadedSlugs[pack.slug]?.[0];
            const isActive = activeTab === pack.slug;
            return (
              <TabButton key={pack.slug} active={isActive} onPress={() => selectTab(pack.slug)}>
                {firstSticker ? (
                  <Image source={{ uri: firstSticker.fileUrl }} style={styles.tabIcon} />
                ) : (
                  <Text style={{ color: isActive ? t.primary : t.muted, fontWeight: 'bold' }}>
                    {pack.title.charAt(0).toUpperCase()}
                  </Text>
                )}
              </TabButton>
            );
          })}

          {!packsLoaded && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={t.muted} />
            </View>
          )}

          <TabButton active={false} onPress={() => setCreateOpen(true)}>
            <Feather name="plus" size={18} color={t.muted} />
          </TabButton>
        </ScrollView>

        <View style={styles.packLabelContainer}>
          <Text style={[styles.packLabel, { color: t.muted }]}>{currentPackName}</Text>
          {activeTab !== RECENT_TAB && activePack && (
            <TouchableOpacity onPress={() => setPackViewSlug(activePack.slug)} style={styles.settingsBtn}>
              <Feather name="settings" size={14} color={t.muted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.gridScroll}>
          {loadingTab ? (
            <ActivityIndicator size="large" color={t.muted} style={{ marginTop: 20 }} />
          ) : displayedStickers.length === 0 ? (
            <Text style={[styles.emptyText, { color: t.muted }]}>
              {activeTab === RECENT_TAB ? 'Вы ещё не отправляли стикеры' : 'Нет стикеров'}
            </Text>
          ) : (
            <View style={styles.grid}>
              {displayedStickers.map(sticker => (
                <TouchableOpacity key={sticker.id} style={styles.cell} onPress={() => handleSend(sticker)}>
                  <Image source={{ uri: sticker.fileUrl }} style={styles.stickerImg} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {createOpen && <CreatePackModal onClose={() => setCreateOpen(false)} />}
      {packViewSlug && (
        <StickerPackViewModal
          slug={packViewSlug}
          onClose={() => {
            const slug = packViewSlug;
            setPackViewSlug(null);
            useStickerStore.getState().invalidatePackCache(slug);
            useStickerStore.getState().loadPackStickers(slug);
          }}
        />
      )}
    </>
  );
}

function TabButton({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && { backgroundColor: t.primary + '33' }]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 10,
    right: 10,
    height: 300,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 5,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    maxHeight: 50,
  },
  loaderContainer: {
    padding: 8,
    justifyContent: 'center',
  },
  tabButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginRight: 4,
  },
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  packLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  packLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  settingsBtn: {
    padding: 4,
  },
  gridScroll: {
    flex: 1,
    paddingHorizontal: 4,
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
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  }
});
