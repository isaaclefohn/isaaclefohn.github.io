/**
 * "NEW PERSONAL BEST!" celebration for the game-over modal.
 *
 * Mirror to `NearMissCallout`. Where the near-miss callout converts
 * the regret moment into "one more try" energy, this one converts
 * the win moment into a screenshot-worthy peak. Block Blast / Royal
 * Match teardowns specifically credit the "amplified new-best
 * moment" as a key driver of voluntary sharing — players want to
 * brag about their best, and the moment of beating their own best
 * is when that impulse fires.
 *
 * Currently the only new-best signal in the codebase is a color
 * change on the "Best: X" stat text (white → gold). This component
 * is the upgrade: gradient gold pill with a confetti emoji explosion,
 * a "+N points" delta showing exactly how much better the player did,
 * and a stronger animation that earns the screen real estate.
 *
 * Pure presentation. Math lives in `utils/personalBest.ts` for
 * coverage without React Native Testing Library.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, RADII, SPACING } from '../utils/constants';
import { isNewPersonalBest, personalBestDelta } from '../utils/personalBest';

interface PersonalBestCelebrationProps {
  score: number;
  best: number;
}

/** Gold gradient — the celebratory inverse of NearMissCallout's
 *  warm orange. Matches the existing `COLORS.accentGold` palette
 *  used everywhere else celebration moments appear. */
const PB_COLOR = COLORS.accentGold;

export const PersonalBestCelebration: React.FC<PersonalBestCelebrationProps> = ({ score, best }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparklePulse = useRef(new Animated.Value(1)).current;

  const showCelebration = isNewPersonalBest(score, best);
  const delta = personalBestDelta(score, best);

  useEffect(() => {
    if (!showCelebration) return;

    // Big entrance — spring scale from 30% to 110% then settles to 100%.
    // The overshoot is intentional: it reads as "exploding into view"
    // vs. the near-miss's gentle scale-in. Same screen geometry,
    // very different emotional valence.
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          tension: 180,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Slight wobble rotation — gives the pill personality on
        // entrance. Stops at 0 so the steady state is upright.
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: -0.04,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0.04,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 160,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle pulse — small steady oscillation in the sparkle emoji
    // so the "✨" actually twinkles instead of sitting still.
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePulse, {
          toValue: 1.15,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sparklePulse, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    sparkleLoop.start();
    return () => sparkleLoop.stop();
  }, [showCelebration, scaleAnim, opacityAnim, rotateAnim, sparklePulse]);

  if (!showCelebration) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { rotate: rotateAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-1rad', '1rad'] }) },
          ],
        },
      ]}
      pointerEvents="none"
    >
      {/* Inner glow */}
      <View style={styles.glow} />
      <View style={styles.headlineRow}>
        <Animated.Text style={[styles.sparkle, { transform: [{ scale: sparklePulse }] }]}>✨</Animated.Text>
        <Text style={styles.headlineText}>NEW PERSONAL BEST!</Text>
        <Animated.Text style={[styles.sparkle, { transform: [{ scale: sparklePulse }] }]}>✨</Animated.Text>
      </View>
      <Text style={styles.deltaText}>
        +<Text style={styles.deltaNumber}>{delta.toLocaleString()}</Text> points beyond your best
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: `${PB_COLOR}22`, // 22 hex ≈ 13% opacity — gold base
    borderRadius: RADII.md,
    borderWidth: 2,
    borderColor: PB_COLOR,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginVertical: SPACING.sm,
    shadowColor: PB_COLOR,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: RADII.md,
    borderTopRightRadius: RADII.md,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sparkle: {
    fontSize: 20,
  },
  headlineText: {
    fontSize: 20,
    fontWeight: '900',
    color: PB_COLOR,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  deltaText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  deltaNumber: {
    fontWeight: '900',
    color: PB_COLOR,
    fontSize: 15,
  },
});
