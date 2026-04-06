/**
 * Premium score display with animated counter, pulsing combo badge,
 * glowing progress bar with milestone markers, and star animations.
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
  const progressGlow = useRef(new Animated.Value(0.4)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const starBounce = useRef(new Animated.Value(1)).current;

  // Score bump animation on change
  useEffect(() => {
    if (score > 0) {
      Animated.sequence([
        Animated.timing(scoreScale, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.spring(scoreScale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 6 }),
      ]).start();
    }
  }, [score]);

  // Combo pulse animation
  useEffect(() => {
    if (combo > 0) {
      Animated.sequence([
        Animated.timing(comboScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
        Animated.spring(comboScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 5 }),
      ]).start();
    }
  }, [combo, comboScale]);

  // Star bounce when earned
  useEffect(() => {
    if (stars > 0) {
      Animated.sequence([
        Animated.timing(starBounce, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.spring(starBounce, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }),
      ]).start();
    }
  }, [stars]);

  // Progress bar glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressGlow, { toValue: 0.9, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(progressGlow, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [progressGlow]);

  // Star threshold markers on progress bar
  const starThresholds = [0.33, 0.66, 1.0];

  return (
    <View style={styles.container} accessible accessibilityLabel={`Level ${level}, Score ${formatScore(score)} of ${formatScore(objective.target)}, ${stars} stars${combo > 1 ? `, ${combo}x combo` : ''}`} accessibilityRole="summary">
      {/* Level badge and stars row */}
      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LEVEL {level}</Text>
        </View>
        <Animated.View style={[styles.starsContainer, { transform: [{ scale: starBounce }] }]}>
          {[1, 2, 3].map((star) => (
            <GameIcon key={star} name={star <= stars ? 'star' : 'star-outline'} size={22} />
          ))}
        </Animated.View>
      </View>

      {/* Score with bump animation */}
      <Animated.Text style={[styles.scoreText, { transform: [{ scale: scoreScale }] }]}>
        {formatScore(score)}
      </Animated.Text>

      {/* Combo indicator */}
      {combo > 0 && (
        <Animated.View style={[styles.comboBadge, { transform: [{ scale: comboScale }] }]}>
          <View style={styles.comboInner}>
            <GameIcon name="fire" size={14} />
            <Text style={styles.comboText}>{combo}x COMBO</Text>
          </View>
        </Animated.View>
      )}

      {/* Progress bar with star milestones */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {/* Glow layer */}
          <Animated.View
            style={[
              styles.progressGlow,
              { width: `${progress * 100}%`, opacity: progressGlow },
            ]}
          />
          {/* Solid fill */}
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          {/* Leading edge glow dot */}
          {progress > 0.02 && progress < 1 && (
            <Animated.View
              style={[
                styles.progressDot,
                {
                  left: `${progress * 100}%`,
                  opacity: progressGlow,
                },
              ]}
            />
          )}
          {/* Star milestone markers */}
          {starThresholds.map((threshold, i) => (
            <View
              key={i}
              style={[
                styles.milestone,
                {
                  left: `${threshold * 100}%`,
                  backgroundColor: progress >= threshold ? COLORS.accentGold : COLORS.surfaceBorder,
                },
              ]}
            />
          ))}
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  scoreText: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  comboBadge: {
    backgroundColor: `${COLORS.accent}18`,
    borderWidth: 1.5,
    borderColor: `${COLORS.accentGold}50`,
    borderRadius: RADII.round,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 4,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  comboInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comboText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 1.5,
  },
  progressContainer: {
    width: '100%',
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.gridEmpty,
    borderRadius: 5,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: `${COLORS.surfaceBorder}60`,
  },
  progressGlow: {
    position: 'absolute',
    height: '100%',
    backgroundColor: COLORS.accentLight,
    borderRadius: 5,
  },
  progressFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 5,
    opacity: 0.85,
  },
  progressDot: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.accentLight,
    marginLeft: -4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  milestone: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 14,
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  targetText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
