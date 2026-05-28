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

/**
 * Achievements already shown as an "unlocked" beat this app session.
 * checkAchievements() only stamps on the Home screen, and Next Level / Retry
 * don't pass through it — so without this dedupe a crossed-but-unstamped
 * achievement would re-fire its celebration on every subsequent game-over.
 * Module scope survives the per-modal remount; it's irrelevant once Home
 * stamps the achievement (it then leaves the complete-but-unstamped state)
 * and resets on app restart (by which point unlockedAchievements persisted).
 */
const celebratedThisSession = new Set<string>();

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

  // Compute once on mount: each game-over modal mounts a fresh instance, the
  // run is already over so the stats are stable, and freezing prevents the
  // beat from flipping (e.g. unlocked -> nearest) mid-display if the store
  // updates. The session-dedupe set is read as of mount.
  const [beat] = React.useState(() =>
    getRunAchievementBeat(
      unlockedAchievements,
      {
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
      },
      [...celebratedThisSession],
    ),
  );

  // Once an unlock beat has been shown, remember it so it isn't re-celebrated
  // on later game-overs before the player returns Home (where it gets stamped).
  React.useEffect(() => {
    if (beat?.kind === 'unlocked') celebratedThisSession.add(beat.achievementId);
  }, [beat]);

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
