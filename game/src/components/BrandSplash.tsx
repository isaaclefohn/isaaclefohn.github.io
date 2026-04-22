import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, RADII } from '../utils/constants';

const MARK_COLORS = [
  COLORS.blocks[0],
  COLORS.blocks[4],
  COLORS.blocks[2],
  COLORS.blocks[1],
  COLORS.blocks[5],
  COLORS.blocks[6],
];

interface BrandSplashProps {
  onDone: () => void;
}

export const BrandSplash: React.FC<BrandSplashProps> = ({ onDone }) => {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const calledRef = useRef(false);

  const blockAnims = useRef(MARK_COLORS.map(() => new Animated.Value(0))).current;
  const settleAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const blockInterpolations = useMemo(
    () =>
      blockAnims.map((anim) => ({
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }),
        opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        scale: Animated.multiply(
          anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
          settleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] }),
        ),
      })),
    [blockAnims, settleAnim],
  );

  useEffect(() => {
    const finish = () => {
      if (calledRef.current) return;
      calledRef.current = true;
      onDoneRef.current();
    };

    const drops = blockAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 420,
        delay: i * 70,
        easing: Easing.bezier(0.22, 1.3, 0.36, 1),
        useNativeDriver: true,
      }),
    );

    const seq = Animated.sequence([
      Animated.parallel(drops),
      Animated.spring(settleAnim, {
        toValue: 1,
        tension: 180,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(titleTranslate, {
          toValue: 0,
          tension: 140,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.delay(420),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]);

    seq.start(finish);
    const fallback = setTimeout(finish, 3000);

    return () => {
      clearTimeout(fallback);
      seq.stop();
    };
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      <View style={styles.markRow}>
        {MARK_COLORS.map((color, i) => {
          const { translateY, opacity, scale } = blockInterpolations[i];
          return (
            <Animated.View
              key={i}
              style={[
                styles.block,
                {
                  backgroundColor: color,
                  shadowColor: color,
                  transform: [{ translateY }, { scale }],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
      <Animated.Text
        style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }]}
      >
        CHROMA DROP
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Drop · Clear · Climb
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  markRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  block: {
    width: 28,
    height: 28,
    borderRadius: RADII.sm,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 4,
  },
});
