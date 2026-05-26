/**
 * Floating "+N" delta — the dopamine event when a currency counter
 * increases. The chip itself snaps to the new value; this component is
 * the ephemeral artifact that says "you just earned something."
 *
 * Decreases never animate — celebrating a coin-spend is bad psychology
 * (read: a slot-machine pattern we're not shipping). Hence the
 * INCREASE-only tracking in `useIncreaseDelta`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useSound } from '../hooks/useSound';

interface FloatingDeltaProps {
  amount: number;
  color: string;
  /** Override the start offset (e.g. positioning above a specific element). */
  topOffset?: number;
  /** How far up the delta floats (px). */
  floatDistance?: number;
}

/** Map gain size to haptic intensity. A +15 coin tap should not feel the
 *  same as a +100 jackpot — variable-reward principle applied to the
 *  tactile channel. Thresholds tuned around the in-app reward economy:
 *  daily wheel common = ~15, jackpot = +100, level-complete bonuses
 *  scale into the hundreds. */
function intensityFor(amount: number): 'light' | 'medium' | 'heavy' {
  if (amount >= 75) return 'heavy';
  if (amount >= 25) return 'medium';
  return 'light';
}

export const FloatingDelta: React.FC<FloatingDeltaProps> = ({
  amount,
  color,
  topOffset = -4,
  floatDistance = 22,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { playHaptic } = useSound();

  useEffect(() => {
    // Tactile gain pairs with visual gain. The component re-mounts via
    // the `seq` key in the parent on every new increase, so this useEffect
    // fires exactly once per actual gain — no debounce needed.
    playHaptic(intensityFor(amount)).catch(() => {});

    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateY, {
        toValue: -floatDistance,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // playHaptic identity changes per render of the parent, so excluding
    // it from deps keeps the effect from refiring spuriously — the mount
    // moment is the only event we care about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opacity, translateY, floatDistance, amount]);

  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.text,
        { top: topOffset, color, opacity, transform: [{ translateY }] },
      ]}
    >
      +{amount}
    </Animated.Text>
  );
};

/**
 * Track increases on a numeric value and return a `{delta, seq}` shape
 * where `seq` increments on every increase. Use `seq` as the React key
 * on the floating delta so each new gain re-mounts the animation
 * cleanly (overlapping gains overwrite, not stack — keeps the HUD
 * legible when rewards chain fast).
 *
 * Decreases reset the prev-pointer silently with no event emitted.
 */
export function useIncreaseDelta(value: number): { delta: number; seq: number } {
  const prev = useRef(value);
  const [state, setState] = useState({ delta: 0, seq: 0 });

  useEffect(() => {
    if (value > prev.current) {
      const diff = value - prev.current;
      setState((s) => ({ delta: diff, seq: s.seq + 1 }));
    }
    prev.current = value;
  }, [value]);

  return state;
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    right: -4,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
