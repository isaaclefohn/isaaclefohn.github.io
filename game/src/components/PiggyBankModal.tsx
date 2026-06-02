/**
 * Piggy Bank modal — accumulates bonus coins passively during gameplay.
 * Players see coins building up but can only claim when the bank is "full" (100+ coins).
 * Free to break once per day, or pay 5 gems to break any time.
 * Creates a satisfying "savings" loop that rewards consistent play.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { GameIcon } from './GameIcon';
import { usePlayerStore } from '../store/playerStore';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';
import { getLocalToday } from '../utils/dates';

interface PiggyBankModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PiggyBankModal: React.FC<PiggyBankModalProps> = ({ visible, onClose }) => {
  const {
    piggyBankCoins,
    piggyBankLastBroken,
    addCoins,
    breakPiggyBank,
    spendGems,
    gems,
  } = usePlayerStore();

  const bounceAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const today = getLocalToday();
  const canBreakFree = piggyBankLastBroken !== today && piggyBankCoins >= 100;
  const canBreakWithGems = piggyBankCoins >= 50 && gems >= 5;
  const isFull = piggyBankCoins >= 100;

  // Bounce animation when modal opens
  useEffect(() => {
    if (visible) {
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, bounceAnim]);

  const handleBreakFree = () => {
    if (!canBreakFree) return;
    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      const amount = breakPiggyBank();
      if (amount > 0) {
        addCoins(amount, { boostable: true });
      }
    });
  };

  const handleBreakGems = () => {
    if (!canBreakWithGems) return;
    if (!spendGems(5)) return;
    const amount = breakPiggyBank();
    if (amount > 0) {
      addCoins(amount, { boostable: true });
    }
  };

  // Fill percentage for visual bar
  const fillPercent = Math.min((piggyBankCoins / 200) * 100, 100);

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ scale: bounceAnim }, { translateX: shakeAnim }] }}>
          <GameIcon name="coin" size={48} color={COLORS.accentGold} />
        </Animated.View>
        <Text style={styles.title}>Piggy Bank</Text>
        <Text style={styles.subtitle}>Earn bonus coins as you play!</Text>
      </View>

      {/* Coin counter */}
      <View style={styles.counterCard}>
        <Text style={styles.counterLabel}>Savings</Text>
        <Text style={styles.counterValue}>{piggyBankCoins}</Text>
        <Text style={styles.counterUnit}>coins</Text>

        {/* Fill bar */}
        <View style={styles.fillBar}>
          <View style={[styles.fillBarInner, { width: `${fillPercent}%` }]} />
        </View>
        <Text style={styles.fillLabel}>
          {piggyBankCoins < 100
            ? `${100 - piggyBankCoins} more to break free`
            : 'Ready to break!'}
        </Text>
      </View>

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          Every level you complete adds bonus coins to your piggy bank.{'\n'}
          Break it open once per day when it reaches 100 coins!
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttons}>
        {canBreakFree && (
          <Button
            title={`Break Open (+${piggyBankCoins} coins)`}
            onPress={handleBreakFree}
            variant="primary"
            size="medium"
          />
        )}
        {!canBreakFree && canBreakWithGems && (
          <Button
            title={`Break Open (5 gems)`}
            onPress={handleBreakGems}
            variant="secondary"
            size="medium"
          />
        )}
        <Button
          title="Close"
          onPress={onClose}
          variant="ghost"
          size="small"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  counterCard: {
    backgroundColor: `${COLORS.accentGold}10`,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
    padding: 20,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  counterValue: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 2,
  },
  counterUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  fillBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.round,
    overflow: 'hidden',
  },
  fillBarInner: {
    height: '100%',
    backgroundColor: COLORS.accentGold,
    borderRadius: RADII.round,
  },
  fillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: `${COLORS.surface}`,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 12,
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  buttons: {
    gap: 8,
    width: '100%',
    alignItems: 'center',
  },
});
