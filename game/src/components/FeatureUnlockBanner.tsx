/**
 * Feature unlock celebration banner.
 * Shown when a player completes a level that unlocks a new feature.
 * Slides in from top with a celebratory animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';
import type { FeatureGate } from '../game/progression/FeatureGating';

interface FeatureUnlockBannerProps {
  feature: FeatureGate | null;
  visible: boolean;
  onDismiss: () => void;
}

const FEATURE_ICONS: Record<string, string> = {
  power_ups: 'bomb',
  daily_challenge: 'target',
  battle_pass: 'crown',
  zen_mode: 'sparkle',
  shop: 'gift',
  lucky_spin: 'star',
  piggy_bank: 'coin',
  friend_challenge: 'trophy',
  achievements: 'trophy',
};

export const FeatureUnlockBanner: React.FC<FeatureUnlockBannerProps> = ({
  feature,
  visible,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible && feature) {
      slideAnim.setValue(-100);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.8);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 12,
          bounciness: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          speed: 14,
          bounciness: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, feature]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !feature) return null;

  const iconName = FEATURE_ICONS[feature.id] ?? 'star';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.banner}>
        <View style={styles.iconWrap}>
          <GameIcon name={iconName as any} size={24} color={COLORS.accentGold} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.unlockLabel}>NEW FEATURE UNLOCKED!</Text>
          <Text style={styles.featureName}>{feature.name}</Text>
          <Text style={styles.featureDesc}>{feature.unlockMessage}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 200,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.accentGold,
    padding: 14,
    gap: 12,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.accentGold}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  unlockLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 2,
    marginBottom: 2,
  },
  featureName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  featureDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
