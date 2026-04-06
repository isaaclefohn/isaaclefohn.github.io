/**
 * Mid-game milestone notification banner.
 * Shows when player is approaching their personal best score.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Easing } from 'react-native';
import { COLORS, RADII, SPACING } from '../../utils/constants';

interface MilestoneBannerProps {
  message: string;
  visible: boolean;
}

export const MilestoneBanner: React.FC<MilestoneBannerProps> = ({ message, visible }) => {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-hide after 3s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible, message, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: `${COLORS.accentGold}20`,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}50`,
    borderRadius: RADII.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
