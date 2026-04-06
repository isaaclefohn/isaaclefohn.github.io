/**
 * Ambient floating particles for visual richness.
 * Renders soft colored circles that drift upward with gentle sway.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
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
  const particles = useMemo<ParticleData[]>(() => {
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
  }, [count, colors]);

  useEffect(() => {
    particles.forEach((p) => {
      const animate = () => {
        p.y.setValue(SCREEN_H + 20);
        p.opacity.setValue(0);
        p.sway.setValue(0);

        Animated.parallel([
          // Float upward
          Animated.timing(p.y, {
            toValue: -40,
            duration: p.duration,
            delay: p.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Gentle sway
          Animated.loop(
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
            ])
          ),
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
          p.delay = 0;
          animate();
        });
      };
      animate();
    });
  }, [particles]);

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
