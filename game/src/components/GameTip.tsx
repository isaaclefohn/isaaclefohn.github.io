/**
 * Contextual tutorial tip tooltips.
 * Shows brief, dismissible tips when players encounter new mechanics.
 * Each tip is shown only once per lifetime (stored in settings).
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

export type TipId =
  | 'combo_tip'
  | 'power_up_tip'
  | 'swap_tip'
  | 'undo_tip'
  | 'boss_level_tip'
  | 'weekly_challenge_tip'
  | 'zen_mode_tip'
  | 'rotate_tip';

interface TipConfig {
  title: string;
  body: string;
  icon: string;
  color: string;
}

const TIP_CONFIGS: Record<TipId, TipConfig> = {
  combo_tip: {
    title: 'Combos!',
    body: 'Clear multiple lines in a row for combo multipliers. Chain clears for bigger bonuses!',
    icon: 'fire',
    color: COLORS.accent,
  },
  power_up_tip: {
    title: 'Power-Ups',
    body: 'Tap a power-up, then tap the board to use it. Bombs clear a 3x3 area!',
    icon: 'bomb',
    color: COLORS.warning,
  },
  swap_tip: {
    title: 'Piece Swap',
    body: 'Stuck? Tap Swap to get a new set of pieces. Use it wisely!',
    icon: 'refresh',
    color: COLORS.info,
  },
  undo_tip: {
    title: 'Undo',
    body: 'Made a mistake? Tap Undo to take back your last move.',
    icon: 'back',
    color: COLORS.info,
  },
  boss_level_tip: {
    title: 'Boss Level!',
    body: 'Boss levels are tougher but give bigger rewards. Good luck!',
    icon: 'crown',
    color: COLORS.accentGold,
  },
  weekly_challenge_tip: {
    title: 'Weekly Challenge',
    body: 'Everyone plays the same board this week. Compete for the highest score!',
    icon: 'calendar',
    color: COLORS.accent,
  },
  zen_mode_tip: {
    title: 'Zen Mode',
    body: 'No time limit, no targets. Just relax and play at your own pace.',
    icon: 'sparkle',
    color: COLORS.success,
  },
  rotate_tip: {
    title: 'Rotate Pieces',
    body: 'Tap a selected piece again to rotate it 90 degrees. Try different orientations!',
    icon: 'refresh',
    color: COLORS.info,
  },
};

interface GameTipProps {
  tipId: TipId;
  visible: boolean;
  onDismiss: () => void;
}

export const GameTip: React.FC<GameTipProps> = ({ tipId, visible, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const config = TIP_CONFIGS[tipId];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={[styles.card, { borderLeftColor: config.color }]} onPress={onDismiss} activeOpacity={0.8}>
        <View style={[styles.iconWrap, { backgroundColor: `${config.color}20` }]}>
          <GameIcon name={config.icon as any} size={18} color={config.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
          <Text style={styles.body}>{config.body}</Text>
        </View>
        <Text style={styles.dismiss}>Tap to dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 4,
    padding: 12,
    gap: 10,
    ...SHADOWS.medium,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  dismiss: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
});
