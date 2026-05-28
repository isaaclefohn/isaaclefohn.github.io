/**
 * Achievement trophy grid modal.
 * Shows all achievements with locked/unlocked state and progress.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Modal } from './common/Modal';
import { GameIcon } from './GameIcon';
import { ACHIEVEMENTS, usePlayerStore } from '../store/playerStore';
import { getAchievementProgress, formatProgress } from '../game/progression/AchievementProgress';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

interface AchievementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({ visible, onClose }) => {
  const {
    unlockedAchievements,
    totalLinesCleared,
    highestLevel,
    totalScore,
    longestStreak,
    levelStars,
    coins,
    totalPowerUpsUsed,
    totalChromaticClears,
    bestWaveReached,
    bestCombo,
  } = usePlayerStore();
  const unlockedCount = unlockedAchievements.length;

  // Snapshot of the stats that drive achievement progress, fed to the
  // pure progress helper so each locked card can show a "X / Y" bar.
  const statsSnapshot = {
    totalLinesCleared,
    highestLevel,
    totalScore,
    longestStreak,
    levelStars,
    coins,
    totalPowerUpsUsed,
    totalChromaticClears,
    bestWaveReached,
    bestCombo,
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <GameIcon name="trophy" size={32} color={COLORS.accentGold} />
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.subtitle}>
          {unlockedCount} / {ACHIEVEMENTS.length} Unlocked
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = unlockedAchievements.includes(achievement.id);
          // Only locked cards show a bar; unlocked ones carry the check badge.
          const progress = unlocked ? null : getAchievementProgress(achievement.id, statsSnapshot);

          return (
            <View
              key={achievement.id}
              style={[
                styles.card,
                unlocked ? styles.cardUnlocked : styles.cardLocked,
              ]}
            >
              <View style={styles.cardIcon}>
                <GameIcon
                  name={achievement.icon as any}
                  size={24}
                  color={unlocked ? COLORS.accentGold : COLORS.textMuted}
                />
                {unlocked && (
                  <View style={styles.checkBadge}>
                    <GameIcon name="check" size={10} color={COLORS.success} />
                  </View>
                )}
              </View>
              <View style={styles.cardMiddle}>
                <Text
                  style={[styles.cardName, !unlocked && styles.cardNameLocked]}
                  numberOfLines={1}
                >
                  {achievement.name}
                </Text>
                <Text
                  style={[styles.cardDesc, !unlocked && styles.cardDescLocked]}
                  numberOfLines={2}
                >
                  {achievement.description}
                </Text>
                {progress && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(progress.pct * 100)}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>{formatProgress(progress)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rewardRow}>
                {achievement.reward.coins && (
                  <View style={styles.rewardItem}>
                    <GameIcon name="coin" size={12} color={unlocked ? COLORS.accentGold : COLORS.textMuted} />
                    <Text style={[styles.rewardText, !unlocked && styles.rewardTextLocked]}>
                      {achievement.reward.coins}
                    </Text>
                  </View>
                )}
                {achievement.reward.gems && (
                  <View style={styles.rewardItem}>
                    <GameIcon name="gem" size={12} color={unlocked ? COLORS.accent : COLORS.textMuted} />
                    <Text style={[styles.rewardText, !unlocked && styles.rewardTextLocked]}>
                      {achievement.reward.gems}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scrollArea: {
    maxHeight: 380,
    width: '100%',
  },
  grid: {
    gap: 8,
    paddingBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
    gap: 10,
    ...SHADOWS.small,
  },
  cardUnlocked: {
    backgroundColor: `${COLORS.accentGold}10`,
    borderColor: `${COLORS.accentGold}30`,
  },
  cardLocked: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    opacity: 0.7,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: RADII.sm,
    backgroundColor: `${COLORS.surface}80`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  cardMiddle: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardNameLocked: {
    color: COLORS.textMuted,
  },
  cardDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  cardDescLocked: {
    color: COLORS.textMuted,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: `${COLORS.textMuted}25`,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.accentGold,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    minWidth: 44,
    textAlign: 'right',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  rewardTextLocked: {
    color: COLORS.textMuted,
  },
});
