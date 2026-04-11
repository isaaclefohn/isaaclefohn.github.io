/**
 * Comeback bonus modal — shown when player returns after 2+ days away.
 * Celebrates the return with animated rewards.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ComebackReward } from '../game/rewards/ComebackBonus';
import { usePlayerStore } from '../store/playerStore';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface ComebackBonusModalProps {
  visible: boolean;
  reward: ComebackReward | null;
  onClose: () => void;
}

export const ComebackBonusModal: React.FC<ComebackBonusModalProps> = ({ visible, reward, onClose }) => {
  const [claimed, setClaimed] = useState(false);
  const { addCoins, addGems, addPowerUp } = usePlayerStore();

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rewardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && reward) {
      setClaimed(false);
      scaleAnim.setValue(0.5);
      rewardOpacity.setValue(0);

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, reward]);

  const handleClaim = () => {
    if (!reward || claimed) return;

    addCoins(reward.coins);
    if (reward.gems > 0) addGems(reward.gems);
    if (reward.powerUp) {
      addPowerUp(reward.powerUp.type, reward.powerUp.count);
    }

    setClaimed(true);

    Animated.timing(rewardOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  if (!reward) return null;

  return (
    <Modal visible={visible} onClose={onClose} dismissable={claimed}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
        <GameIcon name="gift" size={48} color={COLORS.accentGold} />
      </Animated.View>

      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>
        {reward.daysAway} days away
      </Text>
      <Text style={styles.message}>{reward.message}</Text>

      {claimed ? (
        <Animated.View style={[styles.rewardsContainer, { opacity: rewardOpacity }]}>
          {reward.coins > 0 && (
            <View style={styles.rewardRow}>
              <GameIcon name="coin" size={20} color={COLORS.accentGold} />
              <Text style={styles.rewardText}>+{reward.coins} Coins</Text>
            </View>
          )}
          {reward.gems > 0 && (
            <View style={styles.rewardRow}>
              <GameIcon name="gem" size={20} color={COLORS.info} />
              <Text style={[styles.rewardText, { color: COLORS.info }]}>+{reward.gems} Gems</Text>
            </View>
          )}
          {reward.powerUp && (
            <View style={styles.rewardRow}>
              <GameIcon name="bomb" size={20} color={COLORS.accent} />
              <Text style={[styles.rewardText, { color: COLORS.accent }]}>+{reward.powerUp.count} {reward.powerUp.type === 'bomb' ? 'Bomb' : reward.powerUp.type === 'rowClear' ? 'Row Clear' : 'Color Clear'}</Text>
            </View>
          )}
        </Animated.View>
      ) : null}

      <View style={styles.actions}>
        {!claimed ? (
          <Button title="Claim Rewards!" onPress={handleClaim} variant="primary" size="large" />
        ) : (
          <Button title="Let's Play!" onPress={onClose} variant="primary" size="large" />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  rewardsContainer: {
    gap: 10,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADII.md,
    minWidth: 180,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
});
