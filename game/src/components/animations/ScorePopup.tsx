/**
 * Dramatic animated score popup with scaling burst, glow, and combo flair.
 * Much more impactful than a simple float-up.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, StyleSheet } from 'react-native';
import { COLORS, ANIM, RADII } from '../../utils/constants';
import { formatScore } from '../../utils/formatters';

interface ScorePopupProps {
  points: number;
  combo: number;
  visible: boolean;
  onComplete?: () => void;
}

export const ScorePopup: React.FC<ScorePopupProps> = ({
  points,
  combo,
  visible,
  onComplete,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.2)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const rotateZ = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || points === 0) return;

    // Reset all values
    translateY.setValue(0);
    opacity.setValue(1);
    scale.setValue(0.2);
    glowScale.setValue(0.5);
    glowOpacity.setValue(0.8);
    rotateZ.setValue(-0.05);

    const isCombo = combo > 1;
    const duration = isCombo ? 1200 : ANIM.scoreFlyDuration;

    Animated.parallel([
      // Float upward
      Animated.timing(translateY, {
        toValue: isCombo ? -100 : -70,
        duration,
        useNativeDriver: true,
      }),
      // Scale: burst in then settle
      Animated.sequence([
        Animated.spring(scale, {
          toValue: isCombo ? 1.5 : 1.2,
          tension: 200,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Subtle rotation wobble
      Animated.sequence([
        Animated.timing(rotateZ, {
          toValue: 0.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateZ, {
          toValue: -0.03,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateZ, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
      // Glow ring burst
      Animated.parallel([
        Animated.timing(glowScale, {
          toValue: 3,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Fade out at end
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.4,
        delay: duration * 0.6,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, [visible, points, combo]);

  if (!visible || points === 0) return null;

  const isCombo = combo > 1;
  const pointsColor = isCombo ? COLORS.accentGold : COLORS.textPrimary;
  const glowColor = isCombo ? COLORS.accentGold : COLORS.accent;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { scale },
            { rotate: rotateZ.interpolate({
              inputRange: [-1, 1],
              outputRange: ['-1rad', '1rad'],
            })},
          ],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* Glow ring behind text */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: glowColor,
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Points badge */}
      <View style={[styles.badge, isCombo && styles.comboBadge]}>
        <Text style={[styles.points, { color: pointsColor }]}>+{formatScore(points)}</Text>
        {isCombo && (
          <View style={styles.comboRow}>
            <View style={styles.comboDot} />
            <Text style={styles.comboText}>{combo}x COMBO</Text>
            <View style={styles.comboDot} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  glowRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  badge: {
    backgroundColor: `${COLORS.surface}E0`,
    borderRadius: RADII.lg,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: `${COLORS.surfaceBorder}80`,
    alignItems: 'center',
  },
  comboBadge: {
    backgroundColor: `${COLORS.accent}20`,
    borderColor: `${COLORS.accentGold}60`,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  points: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  comboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  comboDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accentGold,
    opacity: 0.7,
  },
  comboText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 2,
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
