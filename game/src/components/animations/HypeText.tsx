/**
 * Center-screen hype text for mega clears and big combos.
 * Zooms in with a punch, settles, then fades out. Intentionally
 * oversized and screen-dominating for maximum "juice" payoff.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '../../utils/constants';
import { useSettingsStore } from '../../store/settingsStore';

interface HypeTextProps {
  text: string;
  /** Theme color for the text glow */
  color?: string;
  visible: boolean;
  onComplete?: () => void;
}

export const HypeText: React.FC<HypeTextProps> = ({
  text,
  color = COLORS.accent,
  visible,
  onComplete,
}) => {
  // Screen-dominating zoom-and-fade is exactly the kind of motion the
  // reduced-motion setting exists to suppress. We always declare the
  // hooks (rules-of-hooks) and skip the render at the JSX boundary.
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0.2);
    opacity.setValue(0);
    translateY.setValue(0);

    Animated.sequence([
      // Punch in
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.15,
          tension: 180,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      // Settle
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(600),
      // Drift up & fade
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete?.();
    });
  }, [visible, text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || reducedMotion) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.Text
        style={[
          styles.text,
          {
            color,
            opacity,
            textShadowColor: color,
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  text: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
});
