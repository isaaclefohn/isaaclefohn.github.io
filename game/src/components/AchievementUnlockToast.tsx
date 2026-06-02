/**
 * Floating "Achievement unlocked!" toast that drains a global queue.
 *
 * Mounted once at the App level so it renders over any screen — the
 * `playerStore.checkAchievements()` action enqueues newly-unlocked
 * achievements from anywhere, and this component drains the queue
 * one-at-a-time with a slide-in / hold / slide-out animation.
 *
 * Why this exists at all: previously every `checkAchievements()` call
 * site discarded the returned `Achievement[]`, so unlocking an
 * achievement was a silent event — the coins/gems just appeared in
 * the header counter with no acknowledgement of WHY. The toast closes
 * the dopamine loop on the action that earned it.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { useToastQueueStore } from '../store/toastQueueStore';
import { useSettingsStore } from '../store/settingsStore';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

const SLIDE_IN_MS = 320;
const HOLD_MS = 2400;
const SLIDE_OUT_MS = 280;

export const AchievementUnlockToast: React.FC = () => {
  const head = useToastQueueStore((s) => s.queue[0] ?? null);
  const dequeue = useToastQueueStore((s) => s.dequeue);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!head) return;
    // Reset to off-screen so each new toast starts from the same place.
    translateY.setValue(-100);
    opacity.setValue(0);

    // Under reduced motion, snap into place without sliding/fading,
    // hold for the same duration, then snap away — preserving the
    // dopamine signal while honoring the accessibility setting.
    const slideIn = reducedMotion
      ? Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true })
      : Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: SLIDE_IN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: SLIDE_IN_MS,
            useNativeDriver: true,
          }),
        ]);
    const slideOut = reducedMotion
      ? Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true })
      : Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: SLIDE_OUT_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: SLIDE_OUT_MS,
            useNativeDriver: true,
          }),
        ]);

    if (reducedMotion) opacity.setValue(1);

    const sequence = Animated.sequence([
      slideIn,
      Animated.delay(HOLD_MS),
      slideOut,
    ]);
    sequence.start(({ finished }) => {
      // Only dequeue on natural completion. If the component unmounts
      // mid-animation (rare — Toast is mounted at App), Animated calls
      // the callback with finished=false and we leave the head intact
      // so the next mount picks it up.
      if (finished) dequeue();
    });

    return () => {
      // Stop the sequence on unmount so the dequeue callback above can't
      // fire after we've torn down. The head stays in the queue and the
      // next mount drains it.
      sequence.stop();
    };
  }, [head, dequeue, opacity, translateY, reducedMotion]);

  if (!head) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.iconWrap}>
        <GameIcon name={head.icon as any} size={20} color={COLORS.accentGold} />
      </View>
      <View style={styles.body}>
        <Text style={styles.kicker}>ACHIEVEMENT UNLOCKED</Text>
        <Text style={styles.title} numberOfLines={1}>{head.name}</Text>
      </View>
      {(head.reward.coins || head.reward.gems) && (
        <View style={styles.reward}>
          {head.reward.coins ? <Text style={styles.rewardText}>+{head.reward.coins}🪙</Text> : null}
          {head.reward.gems ? <Text style={styles.rewardText}>+{head.reward.gems}💎</Text> : null}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accentGold + '60',
    borderWidth: 1,
    borderRadius: RADII.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.large,
    zIndex: 9999,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentGold + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: COLORS.accentGold,
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reward: {
    alignItems: 'flex-end',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
