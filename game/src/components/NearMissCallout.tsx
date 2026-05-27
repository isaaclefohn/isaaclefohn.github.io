/**
 * Near-miss "SO CLOSE!" callout for the game-over modal.
 *
 * Loss-aversion is the second-strongest dopamine driver in puzzle
 * games behind variable reward schedules (Block Blast / Royal Match
 * teardowns). At the moment of loss, telling the player how close
 * they came to their personal best converts the regret moment into
 * "one more try" energy.
 *
 * Behavior:
 *   - Renders null if the player has no best score on record yet,
 *     OR if they actually BEAT their best (handled elsewhere — that's
 *     a celebration moment, different emotion).
 *   - Renders null if they were not "close enough" — 85% threshold
 *     keeps the callout from firing on every run; only the genuinely
 *     near-miss runs trigger it, preserving its emotional weight.
 *   - Otherwise renders an orange callout with a fire emoji + the
 *     exact point delta + brief subliminal "one more try" subtext.
 *
 * Pure presentation; the math is one comparison, intentionally
 * inlined here so callers don't have to do conditional rendering.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, RADII, SPACING } from '../utils/constants';
import { isNearMiss } from '../utils/nearMiss';

interface NearMissCalloutProps {
  /** Current run's final score */
  score: number;
  /** Player's all-time best for this mode (zenHighScore, dailyPuzzleBestScore, etc.) */
  best: number;
}

/** Warm orange — between regret (red) and celebration (gold). The "almost"
 *  emotion lives here. Tailwind orange-500, slightly desaturated. */
const NEAR_MISS_COLOR = '#FB923C';

export const NearMissCallout: React.FC<NearMissCalloutProps> = ({ score, best }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Gate computation BEFORE deciding to mount the animation so
  // we don't waste cycles when the callout won't render. The early
  // return below skips rendering, but useEffect always runs — keep
  // its work cheap when the gate fails.
  const showCallout = isNearMiss(score, best);
  const delta = best - score;

  useEffect(() => {
    if (!showCallout) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 140,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing pulse so the eye keeps coming back to it.
    // Loop is intentionally slow (1.4s round-trip) — anything faster
    // reads as anxious; this reads as "alive."
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showCallout, scaleAnim, opacityAnim, pulseAnim]);

  if (!showCallout) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
        },
      ]}
    >
      <Text style={styles.headline}>
        <Text style={styles.emoji}>🔥 </Text>
        <Text style={styles.headlineText}>SO CLOSE!</Text>
      </Text>
      <Text style={styles.subline}>
        Only <Text style={styles.deltaNumber}>{delta.toLocaleString()}</Text> points from your best.
      </Text>
      <Text style={styles.cta}>One more try?</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: `${NEAR_MISS_COLOR}18`, // 18 = ~9% opacity, subtle background
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: `${NEAR_MISS_COLOR}80`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  headlineText: {
    color: NEAR_MISS_COLOR,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subline: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 2,
    textAlign: 'center',
  },
  deltaNumber: {
    fontWeight: '800',
    color: NEAR_MISS_COLOR,
  },
  cta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
});
