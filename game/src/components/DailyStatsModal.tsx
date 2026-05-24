/**
 * Daily Puzzle stats modal.
 *
 * Shown when the player has already used today's attempt and taps the
 * daily puzzle banner on Home. Surfaces:
 *   - Today's score + stars, with a prominent Share button (re-emits the
 *     same Wordle-style card the end-of-run modal produces).
 *   - Live countdown to local midnight (next puzzle unlock).
 *   - Lifetime daily puzzle stats (best score, streak, play count).
 *
 * The design goal is Wordle-adjacent: once the daily is done, the player
 * should feel rewarded, know their streak, and get a dead-obvious "tell
 * your friends" button. Coming back tomorrow is the whole point.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { usePlayerStore } from '../store/playerStore';
import { COLORS, RADII, SPACING } from '../utils/constants';
import {
  buildDailyShareCard,
  formatCountdown,
  getDailyPuzzleId,
  getDailyPuzzleLabel,
  getDailyPuzzleNumber,
  getMsUntilNextPuzzle,
} from '../game/challenges/DailyPuzzle';

interface DailyStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface StatRowProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

const StatRow: React.FC<StatRowProps> = ({ icon, label, value, color = COLORS.accentGold }) => (
  <View style={styles.statRow}>
    <GameIcon name={icon as any} size={18} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

export const DailyStatsModal: React.FC<DailyStatsModalProps> = ({ visible, onClose }) => {
  const {
    dailyPuzzleLastPlayedId,
    dailyPuzzleLastPlayedScore,
    dailyPuzzleLastPlayedStars,
    dailyPuzzleBestScore,
    dailyPuzzleStreak,
    dailyPuzzlePlayCount,
  } = usePlayerStore();

  // Live countdown — tick every second while the modal is visible.
  const [countdown, setCountdown] = useState(() => getMsUntilNextPuzzle());
  useEffect(() => {
    if (!visible) return;
    setCountdown(getMsUntilNextPuzzle());
    const id = setInterval(() => setCountdown(getMsUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const todayId = getDailyPuzzleId();
  const playedToday = dailyPuzzleLastPlayedId === todayId;
  const puzzleNumber = getDailyPuzzleNumber();
  const dateLabel = getDailyPuzzleLabel();

  const handleShare = async () => {
    if (!playedToday) return;
    // Same sharing path as the end-of-run modal. 3-star threshold is
    // 8000 — hardcoded here to avoid importing the star thresholds
    // array; a drift in that number would just make the bar shape
    // slightly off on re-shares from this dialog.
    const card = buildDailyShareCard({
      puzzleNumber,
      dateLabel,
      stars: dailyPuzzleLastPlayedStars,
      score: dailyPuzzleLastPlayedScore,
      linesCleared: 0,
      bestCombo: 0,
      piecesPlaced: 0,
      streak: dailyPuzzleStreak,
      chromaticClears: 0,
      scoreFraction: Math.min(1, dailyPuzzleLastPlayedScore / 8000),
    });
    try {
      await Share.share({ message: card });
    } catch {
      // User cancelled or share unavailable — silent.
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <GameIcon name="sparkle" size={32} color={COLORS.accentGold} />
        <Text style={styles.title}>Chroma Drop #{puzzleNumber}</Text>
        <Text style={styles.subtitle}>{dateLabel}</Text>
      </View>

      {playedToday ? (
        <>
          <View style={styles.starRow}>
            {[1, 2, 3].map(s => (
              <GameIcon
                key={s}
                name={s <= dailyPuzzleLastPlayedStars ? 'star' : 'star-outline'}
                size={36}
              />
            ))}
          </View>
          <Text style={styles.score}>{dailyPuzzleLastPlayedScore.toLocaleString()} pts</Text>
          {dailyPuzzleStreak > 1 && (
            <Text style={styles.streakText}>
              {'\uD83D\uDD25'} {dailyPuzzleStreak}-day streak
            </Text>
          )}

          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>NEXT PUZZLE IN</Text>
            <Text style={styles.countdownValue}>{formatCountdown(countdown)}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.notPlayedText}>
          You haven't played today's puzzle yet. Tap the banner on home to begin!
        </Text>
      )}

      <Text style={styles.sectionTitle}>LIFETIME</Text>
      <View style={styles.section}>
        <StatRow icon="trophy" label="Best Score" value={dailyPuzzleBestScore.toLocaleString()} />
        <StatRow
          icon="fire"
          label="Current Streak"
          value={`${dailyPuzzleStreak} day${dailyPuzzleStreak === 1 ? '' : 's'}`}
          color={COLORS.blocks[6]}
        />
        <StatRow icon="map" label="Puzzles Played" value={dailyPuzzlePlayCount} />
      </View>

      <View style={styles.buttonRow}>
        {playedToday && (
          <Button title="Share Result" onPress={handleShare} variant="primary" size="medium" />
        )}
        <Button title="Close" onPress={onClose} variant="ghost" size="small" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  score: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  streakText: {
    fontSize: 14,
    color: COLORS.accentGold,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  notPlayedText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  countdownCard: {
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 2,
  },
  countdownValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  section: {
    backgroundColor: `${COLORS.surface}80`,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  buttonRow: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
