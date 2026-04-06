/**
 * Rich confetti celebration with varied shapes, sizes, and physics.
 * Includes squares, rectangles, circles, and diamond shapes
 * with staggered burst timing and realistic tumble rotation.
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
  COLORS.blocks[6], COLORS.accentGold, COLORS.accentLight,
];

type ParticleShape = 'square' | 'rect' | 'circle' | 'diamond';

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  rotateY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  startX: number;
  shape: ParticleShape;
  burstDelay: number;
}

const SHAPES: ParticleShape[] = ['square', 'rect', 'circle', 'diamond'];

export const Confetti: React.FC<ConfettiProps> = ({ visible, count = 50 }) => {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, () => {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rotate: new Animated.Value(0),
        rotateY: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 5 + Math.random() * 10,
        startX: Math.random() * SCREEN_WIDTH,
        shape,
        burstDelay: Math.random() * 300,
      };
    });
  }, [count]);

  useEffect(() => {
    if (!visible) return;

    const animations = particles.map((p) => {
      const duration = 1800 + Math.random() * 1200;
      const xDrift = (Math.random() - 0.5) * 250;
      const tumbleSpeed = 4 + Math.random() * 8;

      p.x.setValue(0);
      p.y.setValue(0);
      p.rotate.setValue(0);
      p.rotateY.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);

      return Animated.parallel([
        // Initial burst upward then gravity fall
        Animated.sequence([
          Animated.timing(p.y, {
            toValue: -(80 + Math.random() * 120),
            duration: 300,
            delay: p.burstDelay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: SCREEN_HEIGHT * 0.9,
            duration: duration - 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Horizontal drift with wobble
        Animated.timing(p.x, {
          toValue: xDrift,
          duration,
          delay: p.burstDelay,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        // Tumble rotation
        Animated.timing(p.rotate, {
          toValue: tumbleSpeed,
          duration,
          delay: p.burstDelay,
          useNativeDriver: true,
        }),
        // 3D flip effect
        Animated.timing(p.rotateY, {
          toValue: tumbleSpeed * 0.7,
          duration,
          delay: p.burstDelay,
          useNativeDriver: true,
        }),
        // Pop in then fade out
        Animated.sequence([
          Animated.timing(p.scale, {
            toValue: 1,
            duration: 150,
            delay: p.burstDelay,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.delay(duration * 0.55),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: duration * 0.35,
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
      {particles.map((p, i) => {
        const isRect = p.shape === 'rect';
        const isDiamond = p.shape === 'diamond';
        const isCircle = p.shape === 'circle';

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: p.size,
                height: isRect ? p.size * 0.4 : p.size,
                backgroundColor: p.color,
                borderRadius: isCircle ? p.size / 2 : isDiamond ? 2 : 2,
                left: p.startX,
                top: -20,
                opacity: p.opacity,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale },
                  {
                    rotate: p.rotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  {
                    rotateY: p.rotateY.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  ...(isDiamond ? [{ rotate: '45deg' }] : []),
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
  },
});
