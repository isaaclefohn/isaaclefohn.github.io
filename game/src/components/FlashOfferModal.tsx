/**
 * Flash Offer modal.
 * Rotating limited-time deal with a live countdown timer. Uses a big
 * discount badge to anchor value perception and a pulsing CTA button
 * to drive urgency and conversions.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  getCurrentFlashOffer,
  getFlashOfferCountdown,
  getCurrentFlashBucket,
} from '../game/monetization/LimitedOffers';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface FlashOfferModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const FlashOfferModal: React.FC<FlashOfferModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    gems,
    spendGems,
    addCoins,
    addGems,
    addPowerUp,
    refillLives,
    activateVIP,
    flashOfferPurchases,
    recordFlashOfferPurchase,
  } = usePlayerStore();

  const [countdown, setCountdown] = useState(getFlashOfferCountdown());
  const offer = getCurrentFlashOffer();
  const bucket = getCurrentFlashBucket();
  const purchaseKey = `${bucket}_${offer.id}`;
  const alreadyBought = flashOfferPurchases.includes(purchaseKey);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setCountdown(getFlashOfferCountdown()), 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const canAfford = gems >= offer.priceGems;

  const handlePurchase = () => {
    if (alreadyBought || !canAfford) return;
    if (!spendGems(offer.priceGems)) return;
    const r = offer.reward;
    if (r.coins) addCoins(r.coins);
    if (r.gems) addGems(r.gems);
    if (r.bomb) addPowerUp('bomb', r.bomb);
    if (r.rowClear) addPowerUp('rowClear', r.rowClear);
    if (r.colorClear) addPowerUp('colorClear', r.colorClear);
    if (r.livesRefill) refillLives();
    if (r.vipDurationMs) activateVIP(r.vipDurationMs);
    recordFlashOfferPurchase(purchaseKey);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.body}>
      <View style={styles.headerRow}>
        <View style={[styles.discountBadge, { backgroundColor: offer.accentColor }]}>
          <Text style={styles.discountText}>-{offer.discount}%</Text>
        </View>
        <Text style={styles.timerLabel}>Ends in {formatCountdown(countdown)}</Text>
      </View>

      <View style={styles.heroBox}>
        <View style={[styles.iconCircle, { backgroundColor: `${offer.accentColor}20` }]}>
          <GameIcon name={offer.icon as any} size={36} color={offer.accentColor} />
        </View>
        <Text style={[styles.name, { color: offer.accentColor }]}>{offer.name}</Text>
        <Text style={styles.description}>{offer.description}</Text>
      </View>

      <View style={styles.rewardList}>
        {offer.reward.coins ? (
          <View style={styles.rewardRow}>
            <GameIcon name="coin" size={14} />
            <Text style={styles.rewardText}>+{offer.reward.coins.toLocaleString()}</Text>
          </View>
        ) : null}
        {offer.reward.gems ? (
          <View style={styles.rewardRow}>
            <GameIcon name="gem" size={14} />
            <Text style={styles.rewardText}>+{offer.reward.gems}</Text>
          </View>
        ) : null}
        {offer.reward.bomb ? (
          <View style={styles.rewardRow}>
            <GameIcon name="bomb" size={14} />
            <Text style={styles.rewardText}>x{offer.reward.bomb}</Text>
          </View>
        ) : null}
        {offer.reward.rowClear ? (
          <View style={styles.rewardRow}>
            <GameIcon name="lightning" size={14} />
            <Text style={styles.rewardText}>x{offer.reward.rowClear}</Text>
          </View>
        ) : null}
        {offer.reward.colorClear ? (
          <View style={styles.rewardRow}>
            <GameIcon name="palette" size={14} />
            <Text style={styles.rewardText}>x{offer.reward.colorClear}</Text>
          </View>
        ) : null}
        {offer.reward.vipDurationMs ? (
          <View style={styles.rewardRow}>
            <GameIcon name="crown" size={14} />
            <Text style={styles.rewardText}>
              VIP {Math.round(offer.reward.vipDurationMs / (24 * 60 * 60 * 1000))}d
            </Text>
          </View>
        ) : null}
        {offer.reward.livesRefill ? (
          <View style={styles.rewardRow}>
            <GameIcon name="shield" size={14} />
            <Text style={styles.rewardText}>Full lives</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.originalPrice}>{offer.originalPriceGems} gems</Text>
        <Text style={styles.currentPrice}>{offer.priceGems} gems</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={
            alreadyBought
              ? 'Already Claimed'
              : canAfford
                ? 'Get Offer'
                : 'Not enough gems'
          }
          onPress={handlePurchase}
          variant={!alreadyBought && canAfford ? 'primary' : 'ghost'}
          size="large"
        />
      </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F87171',
  },
  heroBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  rewardList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.accentGold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  originalPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.accentGold,
  },
  actions: {
    alignItems: 'center',
  },
});
