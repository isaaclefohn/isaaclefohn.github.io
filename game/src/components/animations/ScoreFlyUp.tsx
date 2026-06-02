/**
 * Score fly-up text that appears at the board position where points were earned.
 * Floats upward and fades out over ~800ms.
 */

import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, CELL_SIZE, CELL_GAP } from '../../utils/constants';
import { useSettingsStore } from '../../store/settingsStore';

interface ScoreFlyUpProps {
  points: number;
  /** Board row where placement happened */
  row: number;
  /** Board col where placement happened */
  col: number;
  /** Whether this was a combo (changes color) */
  isCombo?: boolean;
  onComplete: () => void;
}

export const ScoreFlyUp: React.FC<ScoreFlyUpProps> = ({
  points,
  row,
  col,
  isCombo,
  onComplete,
}) => {
  // Skip the float-and-fade animation under reduced motion. The score
  // is already visible in the header so suppressing this doesn't hide
  // anything material — it just removes the per-placement floater.
  // Hooks must run in the same order on every render (rules-of-hooks),
  // so we always declare the animated values + run the effect, and use
  // `reducedMotion` only to choose whether to ANIMATE or fire onComplete
  // immediately. The conditional render lives at the bottom.
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reducedMotion) {
      // No animation — just acknowledge the placement and let the parent
      // remove this entry from its mounted-flyups list.
      onComplete();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -50,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          speed: 30,
          bounciness: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          delay: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onComplete());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (reducedMotion) return null;

  const cellTotal = CELL_SIZE + CELL_GAP;
  const x = CELL_GAP + col * cellTotal + CELL_SIZE / 2;
  const y = CELL_GAP + row * cellTotal;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x,
          top: y,
          opacity,
          transform: [{ translateY }, { scale }, { translateX: -20 }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, isCombo && styles.comboText]}>
        +{points}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 50,
  },
  text: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  comboText: {
    color: COLORS.accentGold,
    fontSize: 20,
  },
});
