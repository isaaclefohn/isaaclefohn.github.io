/**
 * Score display component with combo indicator and level objective progress.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
import { formatScore } from '../utils/formatters';

interface ScoreDisplayProps {
  score: number;
  combo: number;
  objective: { type: 'score'; target: number };
  level: number;
  stars: 0 | 1 | 2 | 3;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  combo,
  objective,
  level,
  stars,
}) => {
  const progress = Math.min(1, score / objective.target);

  return (
    <View style={styles.container}>
      {/* Level and stars */}
      <View style={styles.levelRow}>
        <Text style={styles.levelText}>Level {level}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3].map((star) => (
            <Text
              key={star}
              style={[styles.star, star <= stars && styles.starActive]}
            >
              {star <= stars ? '\u2605' : '\u2606'}
            </Text>
          ))}
        </View>
      </View>

      {/* Score */}
      <Text style={styles.scoreText}>{formatScore(score)}</Text>

      {/* Combo */}
      {combo > 0 && (
        <Text style={styles.comboText}>
          {combo}x COMBO!
        </Text>
      )}

      {/* Objective progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.targetText}>
          {formatScore(score)} / {formatScore(objective.target)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  starActive: {
    color: COLORS.accentGold,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  comboText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accentGold,
    marginTop: 2,
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.gridEmpty,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  targetText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
