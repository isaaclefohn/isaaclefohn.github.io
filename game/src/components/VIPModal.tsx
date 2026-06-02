/**
 * VIP membership modal.
 * Shows all VIP perks, subscription options, and current VIP status.
 * Players can start a VIP trial or purchase a membership.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  VIP_PERKS,
  VIP_DURATIONS,
  isVIPActive,
  getVIPTimeRemaining,
  canClaimVIPDaily,
  getVIPDailyBonus,
} from '../game/systems/VIPMembership';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';
import { getLocalToday } from '../utils/dates';

interface VIPModalProps {
  visible: boolean;
  onClose: () => void;
}

export const VIPModal: React.FC<VIPModalProps> = ({ visible, onClose }) => {
  const {
    vipUntil,
    vipDailyClaimedDate,
    gems,
    activateVIP,
    claimVIPDaily,
    spendGems,
    addCoins,
    addGems,
  } = usePlayerStore();

  const active = isVIPActive(vipUntil);
  const remaining = getVIPTimeRemaining(vipUntil);
  const today = getLocalToday();
  const canClaim = canClaimVIPDaily(vipUntil, vipDailyClaimedDate, today);

  const handlePurchase = (ms: number, cost: number) => {
    if (gems < cost) return;
    if (!spendGems(cost)) return;
    activateVIP(ms);
  };

  const handleClaimDaily = () => {
    if (!canClaim) return;
    const bonus = getVIPDailyBonus();
    addCoins(bonus.coins);
    addGems(bonus.gems);
    claimVIPDaily(today);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <View style={styles.crownBox}>
          <GameIcon name="crown" size={28} color={COLORS.accentGold} />
        </View>
        <Text style={styles.title}>VIP Club</Text>
        {active && remaining && (
          <Text style={styles.activeText}>
            {remaining.days}d {remaining.hours}h remaining
          </Text>
        )}
        {!active && (
          <Text style={styles.subtitle}>Unlock premium rewards and perks</Text>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Daily claim */}
        {active && (
          <View style={styles.dailyCard}>
            <GameIcon name="gift" size={18} color={COLORS.accentGold} />
            <View style={styles.dailyText}>
              <Text style={styles.dailyTitle}>Daily VIP Gift</Text>
              <Text style={styles.dailySubtitle}>
                +{getVIPDailyBonus().coins} coins, +{getVIPDailyBonus().gems} gems
              </Text>
            </View>
            <Button
              title={canClaim ? 'Claim' : 'Claimed'}
              onPress={handleClaimDaily}
              variant={canClaim ? 'primary' : 'secondary'}
              size="small"
            />
          </View>
        )}

        {/* Perks list */}
        <View style={styles.perksBox}>
          <Text style={styles.perksTitle}>VIP PERKS</Text>
          {VIP_PERKS.map((perk) => (
            <View key={perk.id} style={styles.perkRow}>
              <GameIcon name={perk.icon as any} size={14} color={COLORS.accentGold} />
              <View style={styles.perkText}>
                <Text style={styles.perkLabel}>{perk.label}</Text>
                <Text style={styles.perkDesc}>{perk.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Purchase options */}
        {!active && (
          <View style={styles.optionsBox}>
            <Text style={styles.optionsTitle}>JOIN NOW</Text>
            <View style={styles.optionCard}>
              <View>
                <Text style={styles.optionName}>1 Week VIP</Text>
                <Text style={styles.optionDesc}>Try the perks for 7 days</Text>
              </View>
              <Button
                title="50 Gems"
                onPress={() => handlePurchase(VIP_DURATIONS.WEEK, 50)}
                variant={gems >= 50 ? 'primary' : 'secondary'}
                size="small"
              />
            </View>
            <View style={[styles.optionCard, styles.optionCardHot]}>
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>BEST VALUE</Text>
              </View>
              <View>
                <Text style={styles.optionName}>1 Month VIP</Text>
                <Text style={styles.optionDesc}>30 days of premium perks</Text>
              </View>
              <Button
                title="150 Gems"
                onPress={() => handlePurchase(VIP_DURATIONS.MONTH, 150)}
                variant={gems >= 150 ? 'primary' : 'secondary'}
                size="small"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  crownBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.accentGold}20`,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.success,
    marginTop: 2,
  },
  scroll: {
    maxHeight: 420,
    width: '100%',
  },
  scrollContent: {
    gap: 12,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: `${COLORS.accentGold}15`,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
  },
  dailyText: {
    flex: 1,
  },
  dailyTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  dailySubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  perksBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 10,
    gap: 6,
  },
  perksTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  perkText: {
    flex: 1,
  },
  perkLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  perkDesc: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  optionsBox: {
    gap: 8,
  },
  optionsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 12,
    position: 'relative',
  },
  optionCardHot: {
    backgroundColor: `${COLORS.accentGold}10`,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
  },
  optionBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: COLORS.accentGold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.sm,
  },
  optionBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  optionName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  optionDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
