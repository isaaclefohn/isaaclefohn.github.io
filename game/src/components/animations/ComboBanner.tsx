/**
 * Dramatic combo banner with burst entrance, layered glow, and shockwave ring.
 * Slides in from left with scale punch for maximum impact.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, ANIM, RADII, SHADOWS } from '../../utils/constants';

const { width: SCREEN_W } = Dimensions.get('window');

interface ComboBannerProps {
  combo: number;
  visible: boolean;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ combo, visible }) => {
  const translateX = useRef(new Animated.Value(-SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const shockwaveScale = useRef(new Animated.Value(0.5)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || combo <= 1) return;

    translateX.setValue(-SCREEN_W);
    opacity.setValue(1);
    scale.setValue(0.6);
    shockwaveScale.setValue(0.5);
    shockwaveOpacity.setValue(0.6);

    Animated.sequence([
      // Burst in
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.1,
          tension: 150,
          friction: 5,
          useNativeDriver: true,
        }),
        // Shockwave ring
        Animated.parallel([
          Animated.timing(shockwaveScale, {
            toValue: 4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(shockwaveOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Settle
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(ANIM.comboDuration),
      // Zoom out and fade
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, combo]);

  if (!visible || combo <= 1) return null;

  const comboLabels = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'MEGA!', 'ULTRA!', 'INSANE!'];
  const label = comboLabels[Math.min(combo, comboLabels.length - 1)];
  const isHighCombo = combo >= 4;

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
      {/* Shockwave ring behind */}
      <Animated.View
        style={[
          styles.shockwave,
          {
            transform: [{ scale: shockwaveScale }],
            opacity: shockwaveOpacity,
            borderColor: isHighCombo ? COLORS.accentGold : COLORS.accent,
          },
        ]}
      />
      {/* Inner highlight */}
      <View style={styles.highlight} />
      {/* Left accent bar */}
      <View style={[styles.accentBar, styles.accentBarLeft]} />
      {/* Right accent bar */}
      <View style={[styles.accentBar, styles.accentBarRight]} />
      <Text style={[styles.comboCount, isHighCombo && styles.comboCountGold]}>
        {combo}x COMBO
      </Text>
      <Text style={[styles.comboLabel, isHighCombo && styles.comboLabelGold]}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}E0`,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: `${COLORS.accentLight}60`,
    zIndex: 60,
    overflow: 'visible',
    ...SHADOWS.glow(COLORS.accent),
  },
  shockwave: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
  },
  accentBar: {
    position: 'absolute',
    top: '25%',
    width: 4,
    height: '50%',
    borderRadius: 2,
    backgroundColor: `${COLORS.accentGold}60`,
  },
  accentBarLeft: {
    left: 8,
  },
  accentBarRight: {
    right: 8,
  },
  comboCount: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  comboCountGold: {
    color: COLORS.accentGold,
    textShadowColor: COLORS.accentGold,
    textShadowRadius: 12,
  },
  comboLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accentGold,
    marginTop: -2,
    letterSpacing: 3,
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  comboLabelGold: {
    color: COLORS.textPrimary,
    textShadowColor: COLORS.accentGold,
  },
});
