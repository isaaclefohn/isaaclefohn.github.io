/**
 * One achievement "beat" for the game-over modals: either a just-earned
 * achievement (a stat crossed its threshold this run but isn't stamped yet —
 * `checkAchievements()` only runs on the Home screen) or the nearest
 * still-locked milestone as a come-back carrot.
 *
 * Self-contained: reads the store and resolves the display name itself, so
 * GameScreen only has to drop <RunMilestoneNudge /> into each modal. The
 * decision logic lives in the pure, tested `getRunAchievementBeat`.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore, ACHIEVEMENTS } from '../store/playerStore';
import { getRunAchievementBeat, formatProgress } from '../game/progression/AchievementProgress';
import { GameIcon } from './GameIcon';
import { COLORS, RADII } from '../utils/constants';

export const RunMilestoneNudge: React.FC = () => {
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

  const beat = getRunAchievementBeat(unlockedAchievements, {
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
  });
  if (!beat) return null;

  const name = ACHIEVEMENTS.find((a) => a.id === beat.achievementId)?.name ?? beat.achievementId;
  const unlocked = beat.kind === 'unlocked';

  return (
    <View style={[styles.card, unlocked ? styles.cardUnlocked : styles.cardNearest]}>
      <GameIcon name={unlocked ? 'trophy' : 'target'} size={16} color={unlocked ? COLORS.accentGold : COLORS.accent} />
      <Text style={styles.text} numberOfLines={1}>
        {unlocked ? `Achievement unlocked: ${name}!` : `Next up: ${name}`}
      </Text>
      {!unlocked && <Text style={styles.progress}>{formatProgress(beat.progress)}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
    marginVertical: 6,
  },
  cardUnlocked: {
    backgroundColor: `${COLORS.accentGold}14`,
    borderColor: `${COLORS.accentGold}40`,
  },
  cardNearest: {
    backgroundColor: `${COLORS.surface}80`,
    borderColor: COLORS.surfaceBorder,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progress: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
