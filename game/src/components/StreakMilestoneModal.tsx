/**
 * Streak milestone celebration modal.
 * Shows when player hits a streak milestone (3, 5, 7, 14, 30 days, etc.)
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StreakMilestone } from '../game/rewards/StreakRewards';
import { usePlayerStore } from '../store/playerStore';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface StreakMilestoneModalProps {
  visible: boolean;
  milestone: StreakMilestone | null;
  onClose: () => void;
}

export const StreakMilestoneModal: React.FC<StreakMilestoneModalProps> = ({ visible, milestone, onClose }) => {
  const [claimed, setClaimed] = useState(false);
  const { addCoins, addGems, addPowerUp } = usePlayerStore();
  const { currentStreak } = usePlayerStore();

  const fireScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      setClaimed(false);
      fireScale.setValue(0.5);
      Animated.spring(fireScale, {
        toValue: 1,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClaim = () => {
    if (!milestone || claimed) return;
    addCoins(milestone.coins);
    if (milestone.gems > 0) addGems(milestone.gems);
    setClaimed(true);
  };

  if (!milestone) return null;

  return (
    <Modal visible={visible} onClose={onClose} dismissable={claimed}>
      <Animated.View style={[styles.fireWrap, { transform: [{ scale: fireScale }] }]}>
        <GameIcon name="fire" size={56} color={COLORS.accent} />
      </Animated.View>

      <Text style={styles.title}>{milestone.label}</Text>
      <View style={styles.streakBadge}>
        <Text style={styles.streakNumber}>{currentStreak}</Text>
        <Text style={styles.streakLabel}>DAY STREAK</Text>
      </View>

      <View style={styles.rewards}>
        <View style={styles.rewardRow}>
          <GameIcon name="coin" size={18} color={COLORS.accentGold} />
          <Text style={styles.rewardText}>+{milestone.coins} Coins</Text>
        </View>
        {milestone.gems > 0 && (
          <View style={styles.rewardRow}>
            <GameIcon name="gem" size={18} color={COLORS.info} />
            <Text style={[styles.rewardText, { color: COLORS.info }]}>+{milestone.gems} Gems</Text>
          </View>
        )}
        {milestone.streakFreezes > 0 && (
          <View style={styles.rewardRow}>
            <GameIcon name="shield" size={18} color={COLORS.success} />
            <Text style={[styles.rewardText, { color: COLORS.success }]}>+{milestone.streakFreezes} Streak Freeze</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {!claimed ? (
          <Button title="Claim!" onPress={handleClaim} variant="primary" size="large" />
        ) : (
          <Button title="Keep it up!" onPress={onClose} variant="primary" size="large" />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fireWrap: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 8,
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: RADII.lg,
    borderWidth: 2,
    borderColor: `${COLORS.accent}30`,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: SPACING.md,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.accent,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  rewards: {
    gap: 8,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADII.md,
    minWidth: 160,
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
});
