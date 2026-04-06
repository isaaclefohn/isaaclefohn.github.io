/**
 * Full-screen flash effect triggered on line clears.
 * A bright colored overlay pulses briefly for impact.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ClearFlashProps {
  visible: boolean;
  color?: string;
  intensity?: number;
}

export const ClearFlash: React.FC<ClearFlashProps> = ({
  visible,
  color = COLORS.accent,
  intensity = 0.25,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(intensity);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: intensity,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, intensity, opacity]);

  return (
    <Animated.View
      style={[
        styles.flash,
        { backgroundColor: color, opacity },
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
  },
});
