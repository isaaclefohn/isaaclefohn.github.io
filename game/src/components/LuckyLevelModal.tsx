/**
 * Lucky level milestone reward modal.
 * Shown after completing a milestone level (every 10th, 25th, etc.)
 * with escalating tier visuals (bronze → silver → gold → diamond).
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LuckyLevelReward, LUCKY_TIER_COLORS } from '../game/rewards/LuckyLevel';
import { usePlayerStore } from '../store/playerStore';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface LuckyLevelModalProps {
  visible: boolean;
  reward: LuckyLevelReward | null;
  level: number;
  onClose: () => void;
}

export const LuckyLevelModal: React.FC<LuckyLevelModalProps> = ({ visible, reward, level, onClose }) => {
  const [claimed, setClaimed] = useState(false);
  const { addCoins, addGems, addPowerUp } = usePlayerStore();
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      setClaimed(false);
      scaleAnim.setValue(0.3);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClaim = () => {
    if (!reward || claimed) return;
    addCoins(reward.coins);
    if (reward.gems > 0) addGems(reward.gems);
    if (reward.powerUp) {
      addPowerUp(reward.powerUp.type, reward.powerUp.count);
    }
    setClaimed(true);
  };

  if (!reward) return null;

  const tierColor = LUCKY_TIER_COLORS[reward.tier];

  return (
    <Modal visible={visible} onClose={onClose} dismissable={claimed}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.tierCircle, { borderColor: tierColor, backgroundColor: `${tierColor}15` }]}>
          <GameIcon name="trophy" size={36} color={tierColor} />
        </View>
      </Animated.View>

      <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20`, borderColor: `${tierColor}40` }]}>
        <Text style={[styles.tierLabel, { color: tierColor }]}>{reward.tier.toUpperCase()}</Text>
      </View>

      <Text style={styles.title}>{reward.message}</Text>
      <Text style={styles.subtitle}>Level {level} Bonus Reward</Text>

      <View style={styles.rewards}>
        <View style={styles.rewardRow}>
          <GameIcon name="coin" size={18} color={COLORS.accentGold} />
          <Text style={styles.rewardText}>+{reward.coins}</Text>
        </View>
        {reward.gems > 0 && (
          <View style={styles.rewardRow}>
            <GameIcon name="gem" size={18} color={COLORS.info} />
            <Text style={[styles.rewardText, { color: COLORS.info }]}>+{reward.gems}</Text>
          </View>
        )}
        {reward.powerUp && (
          <View style={styles.rewardRow}>
            <GameIcon name="bomb" size={18} color={COLORS.accent} />
            <Text style={[styles.rewardText, { color: COLORS.accent }]}>+{reward.powerUp.count}x {
              reward.powerUp.type === 'bomb' ? 'Bomb' :
              reward.powerUp.type === 'rowClear' ? 'Row Clear' : 'Color Clear'
            }</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {!claimed ? (
          <Button title="Collect!" onPress={handleClaim} variant="primary" size="large" />
        ) : (
          <Button title="Awesome!" onPress={onClose} variant="primary" size="large" />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    marginBottom: SPACING.sm,
  },
  tierCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: RADII.round,
    borderWidth: 1,
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.md,
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
