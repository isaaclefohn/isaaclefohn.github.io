/**
 * Animated combo banner that slides in on consecutive line clears.
 * Enhanced with glow border and layered styling.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, StyleSheet } from 'react-native';
import { COLORS, ANIM, RADII, SHADOWS } from '../../utils/constants';

interface ComboBannerProps {
  combo: number;
  visible: boolean;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ combo, visible }) => {
  const translateX = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!visible || combo <= 1) return;

    translateX.setValue(-300);
    opacity.setValue(1);
    scale.setValue(0.8);

    Animated.sequence([
      // Slide in
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(ANIM.comboDuration),
      // Fade out
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, combo, translateX, opacity, scale]);

  if (!visible || combo <= 1) return null;

  const comboLabels = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'MEGA!', 'ULTRA!', 'INSANE!'];
  const label = comboLabels[Math.min(combo, comboLabels.length - 1)];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* Inner highlight */}
      <View style={styles.highlight} />
      <Text style={styles.comboCount}>{combo}x COMBO</Text>
      <Text style={styles.comboLabel}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}E0`,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: `${COLORS.accentLight}60`,
    zIndex: 60,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
  },
  comboCount: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  comboLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGold,
    marginTop: -2,
    letterSpacing: 2,
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
