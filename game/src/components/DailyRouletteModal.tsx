/**
 * Daily Roulette modal.
 * A once-per-day free spin that reveals a bonus reward. Uses a simple
 * spin animation and claims the deterministic daily roll.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  getTodaysRouletteReward,
  hasSpunToday,
  ROULETTE_REWARDS,
} from '../game/challenges/DailyRoulette';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';
import { getLocalToday } from '../utils/dates';

interface DailyRouletteModalProps {
  visible: boolean;
  onClose: () => void;
}

const getToday = () => getLocalToday();

export const DailyRouletteModal: React.FC<DailyRouletteModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    rouletteLastDate,
    claimDailyRouletteAtomic,
  } = usePlayerStore();

  const today = getToday();
  const alreadySpun = hasSpunToday(rouletteLastDate, today);
  const todaysReward = getTodaysRouletteReward(today);
  const [revealed, setRevealed] = useState(alreadySpun);
  const [spinning, setSpinning] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRevealed(alreadySpun);
      rotateAnim.setValue(0);
    }
  }, [visible, alreadySpun]);

  const handleSpin = () => {
    if (alreadySpun || spinning) return;
    setSpinning(true);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setRevealed(true);
      // Grant reward AND stamp the date atomically in one store action.
      // Previously these were sequential calls (addCoins, addGems, ...,
      // claimDailyRoulette) — if the app force-closed between the first
      // credit and the final stamp, the date wouldn't be persisted and
      // the player could re-spin on next launch (double payout). The
      // atomic variant is idempotent: re-calling with the same date is
      // a no-op, so a rare double-fire of this callback can't double-
      // credit either.
      claimDailyRouletteAtomic(today, todaysReward.payload, todaysReward.kind);
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1440deg'],
  });

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Daily Spin</Text>
      <Text style={styles.subtitle}>
        {alreadySpun ? 'Come back tomorrow for your next spin' : 'Free once per day!'}
      </Text>

      <View style={styles.wheelContainer}>
        <Animated.View
          style={[
            styles.wheel,
            { transform: [{ rotate: spin }] },
            revealed && { borderColor: todaysReward.color },
          ]}
        >
          {!revealed ? (
            <View style={styles.wheelInner}>
              <Text style={styles.wheelQuestion}>?</Text>
            </View>
          ) : (
            <View style={[styles.wheelInner, { backgroundColor: `${todaysReward.color}20` }]}>
              <GameIcon name={todaysReward.icon as any} size={48} color={todaysReward.color} />
            </View>
          )}
        </Animated.View>
      </View>

      {revealed && (
        <View style={styles.rewardBox}>
          <Text style={[styles.rewardName, { color: todaysReward.color }]}>
            {todaysReward.name}
          </Text>
          <Text style={styles.rewardDesc}>{todaysReward.description}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {!revealed ? (
          <Button
            title={spinning ? 'Spinning...' : 'Spin!'}
            onPress={handleSpin}
            variant="primary"
            size="large"
          />
        ) : (
          <Button title="Close" onPress={onClose} variant="secondary" size="large" />
        )}
      </View>

      <Text style={styles.poolLabel}>Possible rewards</Text>
      <View style={styles.poolRow}>
        {ROULETTE_REWARDS.map((r) => (
          <View key={r.kind} style={styles.poolItem}>
            <GameIcon name={r.icon as any} size={14} color={r.color} />
          </View>
        ))}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  wheelContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  wheel: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  wheelInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelQuestion: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  rewardBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rewardDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actions: {
    alignItems: 'center',
    marginBottom: 12,
  },
  poolLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 6,
  },
  poolRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
  },
  poolItem: {
    padding: 4,
  },
});
