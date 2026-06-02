/**
 * Ambient floating particles for visual richness.
 * Renders soft colored circles that drift upward with gentle sway.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { COLORS } from '../../utils/constants';

interface FloatingParticlesProps {
  count?: number;
  colors?: string[];
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PARTICLE_COLORS = [
  `${COLORS.accent}18`,
  `${COLORS.accentGold}15`,
  `${COLORS.blocks[1]}12`,
  `${COLORS.blocks[2]}10`,
  `${COLORS.blocks[5]}12`,
];

interface ParticleData {
  x: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  swayAmount: number;
  y: Animated.Value;
  opacity: Animated.Value;
  sway: Animated.Value;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 12,
  colors = PARTICLE_COLORS,
}) => {
  const { reducedMotion } = useSettingsStore();
  const particles = useMemo<ParticleData[]>(() => {
    if (reducedMotion) return [];
    return Array.from({ length: count }, () => ({
      x: Math.random() * SCREEN_W,
      size: 4 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 6000 + Math.random() * 8000,
      delay: Math.random() * 5000,
      swayAmount: 20 + Math.random() * 40,
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      sway: new Animated.Value(0),
    }));
  }, [count, colors, reducedMotion]);

  useEffect(() => {
    // Capture-style cancel: the recursive animate() self-schedules from
    // a .start() callback, so without a flag the recursion keeps running
    // on detached Animated.Values after unmount. Navigating Home → Game
    // → Home would stack a new infinite recursion each visit. We flip
    // `cancelled` in the cleanup; the next callback short-circuits.
    let cancelled = false;
    // Track every loop handle we spawn so we can stop them on unmount.
    // The Animated.loop driving sway is the same shape as findings #3
    // and #7 — a fire-and-forget loop with no captured handle — so we
    // fix both the recursion and the inner loops in one pass.
    const swayLoops: Animated.CompositeAnimation[] = [];

    particles.forEach((p) => {
      const animate = () => {
        if (cancelled) return;
        p.y.setValue(SCREEN_H + 20);
        p.opacity.setValue(0);
        p.sway.setValue(0);

        const swayLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(p.sway, {
              toValue: p.swayAmount,
              duration: p.duration / 4,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(p.sway, {
              toValue: -p.swayAmount,
              duration: p.duration / 4,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        swayLoops.push(swayLoop);

        Animated.parallel([
          // Float upward
          Animated.timing(p.y, {
            toValue: -40,
            duration: p.duration,
            delay: p.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          swayLoop,
          // Fade in then out
          Animated.sequence([
            Animated.timing(p.opacity, {
              toValue: 1,
              duration: 1000,
              delay: p.delay,
              useNativeDriver: true,
            }),
            Animated.delay(p.duration - 2500),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          // Reset delay for looping
          if (cancelled) return;
          p.delay = 0;
          animate();
        });
      };
      animate();
    });

    return () => {
      cancelled = true;
      swayLoops.forEach((l) => l.stop());
    };
  }, [particles]);

  if (reducedMotion || particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            opacity: p.opacity,
            transform: [
              { translateY: p.y },
              { translateX: p.sway },
            ],
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
