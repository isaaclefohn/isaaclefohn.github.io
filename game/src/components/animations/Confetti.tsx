/**
 * Confetti celebration animation for level completion.
 * Renders colorful particles that burst and fall.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ConfettiProps {
  visible: boolean;
  count?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COLORS = [
  COLORS.blocks[0], COLORS.blocks[1], COLORS.blocks[2],
  COLORS.blocks[3], COLORS.blocks[4], COLORS.blocks[5],
  COLORS.blocks[6], COLORS.accentGold,
];

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  startX: number;
  isSquare: boolean;
}

export const Confetti: React.FC<ConfettiProps> = ({ visible, count = 40 }) => {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      startX: Math.random() * SCREEN_WIDTH,
      isSquare: Math.random() > 0.5,
    }));
  }, [count]);

  useEffect(() => {
    if (!visible) return;

    const animations = particles.map((p) => {
      const delay = Math.random() * 400;
      const duration = 1500 + Math.random() * 1000;
      const xDrift = (Math.random() - 0.5) * 200;

      p.x.setValue(0);
      p.y.setValue(0);
      p.rotate.setValue(0);
      p.opacity.setValue(1);

      return Animated.parallel([
        Animated.timing(p.y, {
          toValue: SCREEN_HEIGHT * 0.8,
          duration,
          delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: xDrift,
          duration,
          delay,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: 3 + Math.random() * 5,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(p.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.delay(duration * 0.6),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start();
  }, [visible, particles]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            p.isSquare ? styles.squareParticle : styles.circleParticle,
            {
              width: p.size,
              height: p.isSquare ? p.size : p.size * 0.5,
              backgroundColor: p.color,
              left: p.startX,
              top: -20,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  squareParticle: {
    position: 'absolute',
    borderRadius: 2,
  },
  circleParticle: {
    position: 'absolute',
    borderRadius: 10,
  },
});
