/**
 * Starter Pack modal.
 * One-time offer shown to new players that unlocks after level 3.
 * Anchored against a "normal" price to emphasize the discount value.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  STARTER_PACK,
  getStarterPackTimeRemaining,
} from '../game/monetization/StarterPack';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';
import { useSettingsStore } from '../store/settingsStore';

interface StarterPackModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export const StarterPackModal: React.FC<StarterPackModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    gems,
    starterPackUnlockedAt,
    spendGems,
    addCoins,
    addGems,
    addPowerUp,
    claimStarterPack,
  } = usePlayerStore();

  const [countdown, setCountdown] = useState(getStarterPackTimeRemaining(starterPackUnlockedAt));
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCountdown(getStarterPackTimeRemaining(starterPackUnlockedAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [visible, starterPackUnlockedAt]);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulseAnim, reducedMotion]);

  const canAfford = gems >= STARTER_PACK.actualPrice;

  const handlePurchase = () => {
    if (!canAfford) return;
    if (!spendGems(STARTER_PACK.actualPrice)) return;
    addCoins(STARTER_PACK.coins);
    addGems(STARTER_PACK.gems);
    addPowerUp('bomb', STARTER_PACK.bomb);
    addPowerUp('rowClear', STARTER_PACK.rowClear);
    addPowerUp('colorClear', STARTER_PACK.colorClear);
    claimStarterPack();
    onClose();
  };

  const savingsPct = Math.round(
    (1 - STARTER_PACK.actualPrice / STARTER_PACK.normalValue) * 100,
  );

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.ribbonContainer}>
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>ONE-TIME OFFER</Text>
        </View>
      </View>

      <Text style={styles.title}>Starter Pack</Text>
      <Text style={styles.subtitle}>Expires in {formatDuration(countdown)}</Text>

      <Animated.View style={[styles.heroBox, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.savingsLabel}>SAVE {savingsPct}%</Text>
        <Text style={styles.valueLabel}>
          Normally <Text style={styles.strike}>{STARTER_PACK.normalValue} gems</Text>
        </Text>
        <Text style={styles.priceLabel}>{STARTER_PACK.actualPrice} gems</Text>
      </Animated.View>

      <View style={styles.contents}>
        <Text style={styles.contentsTitle}>You get</Text>
        <View style={styles.contentsGrid}>
          <View style={styles.itemRow}>
            <GameIcon name="coin" size={16} />
            <Text style={styles.itemText}>+{STARTER_PACK.coins.toLocaleString()} coins</Text>
          </View>
          <View style={styles.itemRow}>
            <GameIcon name="gem" size={16} />
            <Text style={styles.itemText}>+{STARTER_PACK.gems} gems</Text>
          </View>
          <View style={styles.itemRow}>
            <GameIcon name="bomb" size={16} />
            <Text style={styles.itemText}>x{STARTER_PACK.bomb} bombs</Text>
          </View>
          <View style={styles.itemRow}>
            <GameIcon name="lightning" size={16} />
            <Text style={styles.itemText}>x{STARTER_PACK.rowClear} row clears</Text>
          </View>
          <View style={styles.itemRow}>
            <GameIcon name="palette" size={16} />
            <Text style={styles.itemText}>x{STARTER_PACK.colorClear} color clears</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={canAfford ? `Claim for ${STARTER_PACK.actualPrice} gems` : 'Not enough gems'}
          onPress={handlePurchase}
          variant={canAfford ? 'primary' : 'ghost'}
          size="large"
        />
        <Button title="Maybe later" onPress={onClose} variant="ghost" size="small" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  ribbonContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  ribbon: {
    backgroundColor: COLORS.accentGold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1F1F2E',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.accentGold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
  },
  savingsLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 1,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  contents: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 12,
    marginBottom: 12,
  },
  contentsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  contentsGrid: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  actions: {
    alignItems: 'center',
    gap: 6,
  },
});
