/**
 * Premium score display with animated counter, pulsing combo, and glowing progress bar.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { GameIcon } from './GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
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
  const comboScale = useRef(new Animated.Value(1)).current;
  const comboPulse = useRef(new Animated.Value(1)).current;
  const progressGlow = useRef(new Animated.Value(0.4)).current;

  // Combo pulse animation
  useEffect(() => {
    if (combo > 0) {
      Animated.sequence([
        Animated.timing(comboScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.spring(comboScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }),
      ]).start();
    }
  }, [combo, comboScale]);

  // Progress bar glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressGlow, { toValue: 0.8, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(progressGlow, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [progressGlow]);

  return (
    <View style={styles.container}>
      {/* Level and stars row */}
      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {level}</Text>
        </View>
        <View style={styles.starsContainer}>
          {[1, 2, 3].map((star) => (
            <GameIcon key={star} name={star <= stars ? 'star' : 'star-outline'} size={20} />
          ))}
        </View>
      </View>

      {/* Score */}
      <Text style={styles.scoreText}>{formatScore(score)}</Text>

      {/* Combo indicator */}
      {combo > 0 && (
        <Animated.View style={[styles.comboBadge, { transform: [{ scale: comboScale }] }]}>
          <Text style={styles.comboText}>{combo}x COMBO</Text>
        </Animated.View>
      )}

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, opacity: progressGlow },
            ]}
          />
          <View style={[styles.progressFillSolid, { width: `${progress * 100}%` }]} />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  levelBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  scoreText: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  comboBadge: {
    backgroundColor: `${COLORS.accentGold}20`,
    borderWidth: 1,
    borderColor: COLORS.accentGold,
    borderRadius: RADII.round,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginTop: 2,
  },
  comboText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 1,
  },
  progressContainer: {
    width: '100%',
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.gridEmpty,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
  },
  progressFillSolid: {
    position: 'absolute',
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    opacity: 0.8,
  },
  targetText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
