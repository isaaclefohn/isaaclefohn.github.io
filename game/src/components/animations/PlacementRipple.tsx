/**
 * Expanding ring ripple effect at a given position.
 * Triggered on successful piece placement for tactile feedback.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface PlacementRippleProps {
  visible: boolean;
  x: number;
  y: number;
  color?: string;
}

export const PlacementRipple: React.FC<PlacementRippleProps> = ({
  visible,
  x,
  y,
  color = COLORS.accent,
}) => {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0.3);
    opacity.setValue(0.6);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 2.5,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          left: x - 40,
          top: y - 40,
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    zIndex: 70,
  },
});
