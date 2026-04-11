/**
 * Sticker album modal.
 * Displays collected stickers organized by album pages,
 * with page completion rewards.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  STICKERS,
  ALBUM_PAGES,
  RARITY_COLORS,
  getCollectionStats,
  isPageComplete,
  AlbumPage,
  Sticker,
} from '../game/systems/StickerAlbum';
import { usePlayerStore } from '../store/playerStore';
import { Modal } from './common/Modal';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface StickerAlbumModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StickerAlbumModal: React.FC<StickerAlbumModalProps> = ({ visible, onClose }) => {
  const { collectedStickers, claimedAlbumPages } = usePlayerStore();
  const [selectedPage, setSelectedPage] = useState<string>(ALBUM_PAGES[0].id);

  const stats = useMemo(() => getCollectionStats(collectedStickers), [collectedStickers]);
  const currentPage = ALBUM_PAGES.find(p => p.id === selectedPage) ?? ALBUM_PAGES[0];
  const pageStickers = currentPage.stickerIds.map(id => STICKERS.find(s => s.id === id)!).filter(Boolean);
  const pageComplete = isPageComplete(currentPage.id, collectedStickers);
  const pageClaimed = claimedAlbumPages.includes(currentPage.id);

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <GameIcon name="book" size={24} color={COLORS.accentGold} />
          <Text style={styles.title}>Sticker Album</Text>
        </View>

        {/* Collection progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(stats.collected / stats.total) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{stats.collected}/{stats.total}</Text>
        </View>

        {/* Page tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {ALBUM_PAGES.map((page) => {
            const isSelected = page.id === selectedPage;
            const complete = isPageComplete(page.id, collectedStickers);
            return (
              <TouchableOpacity
                key={page.id}
                style={[styles.tab, isSelected && { borderColor: page.color, backgroundColor: `${page.color}15` }]}
                onPress={() => setSelectedPage(page.id)}
              >
                <GameIcon name={page.icon as any} size={14} color={isSelected ? page.color : COLORS.textMuted} />
                <Text style={[styles.tabText, isSelected && { color: page.color }]}>{page.name}</Text>
                {complete && <View style={[styles.tabDot, { backgroundColor: COLORS.success }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Stickers grid */}
        <View style={styles.stickersGrid}>
          {pageStickers.map((sticker) => {
            const owned = collectedStickers.includes(sticker.id);
            const rarityColor = RARITY_COLORS[sticker.rarity];
            return (
              <View key={sticker.id} style={[styles.stickerCard, owned && { borderColor: rarityColor }]}>
                <View style={[styles.stickerIcon, { backgroundColor: owned ? `${rarityColor}15` : COLORS.surfaceLight }]}>
                  {owned ? (
                    <GameIcon name={sticker.icon as any} size={22} color={rarityColor} />
                  ) : (
                    <Text style={styles.lockedText}>?</Text>
                  )}
                </View>
                <Text style={[styles.stickerName, !owned && styles.stickerNameLocked]} numberOfLines={1}>
                  {owned ? sticker.name : '???'}
                </Text>
                <View style={[styles.rarityDot, { backgroundColor: owned ? rarityColor : COLORS.textMuted }]} />
                {owned && (
                  <Text style={[styles.stickerDesc, { color: COLORS.textMuted }]} numberOfLines={2}>
                    {sticker.description}
                  </Text>
                )}
                {!owned && (
                  <Text style={styles.sourceText}>{sticker.source}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Page reward */}
        <View style={[styles.pageReward, pageComplete && { borderColor: currentPage.color }]}>
          <Text style={styles.rewardTitle}>
            {pageComplete ? (pageClaimed ? 'Page Complete!' : 'Page Complete! Reward ready!') : 'Complete this page for:'}
          </Text>
          <View style={styles.rewardItems}>
            <View style={styles.rewardItem}>
              <GameIcon name="coin" size={14} />
              <Text style={styles.rewardAmount}>{currentPage.reward.coins}</Text>
            </View>
            <View style={styles.rewardItem}>
              <GameIcon name="gem" size={14} />
              <Text style={styles.rewardAmount}>{currentPage.reward.gems}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxHeight: 480,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accentGold,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  tabs: {
    marginBottom: SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginRight: 6,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stickersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  stickerCard: {
    width: '46%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  stickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockedText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  stickerName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stickerNameLocked: {
    color: COLORS.textMuted,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stickerDesc: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pageReward: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  rewardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  rewardItems: {
    flexDirection: 'row',
    gap: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
});
