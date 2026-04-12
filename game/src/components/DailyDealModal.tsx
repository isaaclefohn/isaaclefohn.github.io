/**
 * Daily Deal modal - shows today's rotating discounted bundle.
 * Players can purchase once per day.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getTodaysDeal, getTodayDealKey, isDealClaimed, getDealCountdown } from '../game/rewards/DailyDeal';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface DailyDealModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DailyDealModal: React.FC<DailyDealModalProps> = ({ visible, onClose }) => {
  const { coins, gems, lastDealClaimed, addCoins, addGems, addPowerUp, spendCoins, spendGems, claimDailyDeal } = usePlayerStore();

  const [countdown, setCountdown] = useState(getDealCountdown());
  const [error, setError] = useState<string | null>(null);

  const today = getTodayDealKey();
  const deal = getTodaysDeal(today);
  const alreadyClaimed = isDealClaimed(lastDealClaimed, today);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setCountdown(getDealCountdown()), 60000);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  const canAfford = deal.costCoins > 0 ? coins >= deal.costCoins : gems >= deal.costGems;

  const handlePurchase = () => {
    if (alreadyClaimed) return;
    if (!canAfford) {
      setError(deal.costCoins > 0 ? 'Not enough coins!' : 'Not enough gems!');
      return;
    }

    if (deal.costCoins > 0) {
      if (!spendCoins(deal.costCoins)) return;
    } else {
      if (!spendGems(deal.costGems)) return;
    }

    if (deal.coins > 0) addCoins(deal.coins);
    if (deal.gems > 0) addGems(deal.gems);
    if (deal.powerUps.bomb > 0) addPowerUp('bomb', deal.powerUps.bomb);
    if (deal.powerUps.rowClear > 0) addPowerUp('rowClear', deal.powerUps.rowClear);
    if (deal.powerUps.colorClear > 0) addPowerUp('colorClear', deal.powerUps.colorClear);

    claimDailyDeal(today);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>-{deal.discountPercent}%</Text>
      </View>

      <Text style={styles.title}>Daily Deal</Text>
      <Text style={styles.countdown}>Resets in {countdown}</Text>

      <View style={[styles.iconCircle, { backgroundColor: `${deal.color}20`, borderColor: deal.color }]}>
        <GameIcon name={deal.icon as any} size={40} color={deal.color} />
      </View>

      <Text style={styles.dealName}>{deal.name}</Text>
      <Text style={styles.dealDesc}>{deal.description}</Text>

      <View style={styles.contentsBox}>
        <Text style={styles.contentsLabel}>Contents</Text>
        <View style={styles.contentsGrid}>
          {deal.coins > 0 && (
            <View style={styles.contentItem}>
              <GameIcon name="coin" size={18} />
              <Text style={styles.contentText}>+{deal.coins}</Text>
            </View>
          )}
          {deal.gems > 0 && (
            <View style={styles.contentItem}>
              <GameIcon name="gem" size={18} />
              <Text style={styles.contentText}>+{deal.gems}</Text>
            </View>
          )}
          {deal.powerUps.bomb > 0 && (
            <View style={styles.contentItem}>
              <GameIcon name="bomb" size={18} />
              <Text style={styles.contentText}>x{deal.powerUps.bomb}</Text>
            </View>
          )}
          {deal.powerUps.rowClear > 0 && (
            <View style={styles.contentItem}>
              <GameIcon name="lightning" size={18} />
              <Text style={styles.contentText}>x{deal.powerUps.rowClear}</Text>
            </View>
          )}
          {deal.powerUps.colorClear > 0 && (
            <View style={styles.contentItem}>
              <GameIcon name="palette" size={18} />
              <Text style={styles.contentText}>x{deal.powerUps.colorClear}</Text>
            </View>
          )}
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {alreadyClaimed ? (
        <View style={styles.claimedBox}>
          <GameIcon name="check" size={16} color={COLORS.success} />
          <Text style={styles.claimedText}>Already claimed today</Text>
        </View>
      ) : (
        <Button
          title={`Buy — ${deal.costCoins > 0 ? `${deal.costCoins} coins` : `${deal.costGems} gems`}`}
          onPress={handlePurchase}
          variant={canAfford ? 'primary' : 'secondary'}
          size="large"
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    transform: [{ rotate: '6deg' }],
  },
  discountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  countdown: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dealName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dealDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    marginHorizontal: 8,
  },
  contentsBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 12,
    marginBottom: 14,
  },
  contentsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 8,
  },
  contentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 8,
  },
  claimedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: RADII.md,
  },
  claimedText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
  },
});
