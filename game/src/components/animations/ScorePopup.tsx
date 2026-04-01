/**
 * Animated floating score popup that rises and fades out.
 * Used to show points earned from placements and line clears.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { COLORS, ANIM } from '../../utils/constants';
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
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible || points === 0) return;

    // Reset
    translateY.setValue(0);
    opacity.setValue(1);
    scale.setValue(0.5);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: ANIM.scoreFlyDuration,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIM.scoreFlyDuration,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, [visible, points, translateY, opacity, scale, onComplete]);

  if (!visible || points === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.points}>+{formatScore(points)}</Text>
      {combo > 1 && (
        <Text style={styles.combo}>{combo}x</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  points: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.accentGold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  combo: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent,
    marginTop: -2,
  },
});
