/**
 * Battle Pass (Season Pass) screen.
 * Shows tier progression, XP bar, and claimable rewards.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Animated,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  BATTLE_PASS_TIERS,
  BattlePassReward,
  getCurrentTier,
  getNextTierXP,
} from '../game/progression/BattlePass';
import { Button } from '../components/common/Button';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { GameIcon } from '../components/GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type BattlePassScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BattlePass'>;
};

const REWARD_ICONS: Record<string, string> = {
  coins: 'coin',
  gems: 'gem',
  powerup: 'bomb',
  theme: 'palette',
  skin: 'sparkle',
};

const RewardBadge: React.FC<{
  reward: BattlePassReward['freeReward'] | BattlePassReward['premiumReward'];
  claimed: boolean;
  locked: boolean;
  isPremium?: boolean;
}> = ({ reward, claimed, locked, isPremium }) => {
  if (!reward) return <View style={[styles.rewardBadge, styles.rewardEmpty]}><Text style={styles.rewardEmptyText}>-</Text></View>;

  const icon = REWARD_ICONS[reward.type] ?? 'star';
  const label = reward.type === 'powerup'
    ? `${reward.amount}x`
    : reward.type === 'theme' || reward.type === 'skin'
      ? (reward as any).label ?? reward.type
      : `${reward.amount}`;

  return (
    <View style={[
      styles.rewardBadge,
      isPremium && styles.rewardPremium,
      claimed && styles.rewardClaimed,
      locked && styles.rewardLocked,
    ]}>
      <GameIcon name={icon as any} size={16} color={claimed ? COLORS.textMuted : isPremium ? COLORS.accentGold : COLORS.textPrimary} />
      <Text style={[styles.rewardLabel, claimed && styles.rewardLabelClaimed]}>{label}</Text>
      {claimed && <Text style={styles.checkMark}>{'\u2713'}</Text>}
    </View>
  );
};

const TierRow: React.FC<{
  tier: BattlePassReward;
  currentTier: number;
  claimed: boolean;
  hasPremium: boolean;
  onClaim: () => void;
}> = ({ tier, currentTier, claimed, hasPremium, onClaim }) => {
  const unlocked = currentTier >= tier.tier;
  const canClaim = unlocked && !claimed && (tier.freeReward !== null || hasPremium);

  return (
    <View style={[styles.tierRow, unlocked && styles.tierRowUnlocked]}>
      {/* Tier number */}
      <View style={[styles.tierNumber, unlocked && styles.tierNumberUnlocked]}>
        <Text style={[styles.tierNumberText, unlocked && styles.tierNumberTextUnlocked]}>{tier.tier}</Text>
      </View>

      {/* XP marker */}
      <Text style={styles.tierXP}>{tier.xpRequired} XP</Text>

      {/* Rewards */}
      <View style={styles.rewardPair}>
        <RewardBadge reward={tier.freeReward} claimed={claimed && !!tier.freeReward} locked={!unlocked} />
        <RewardBadge reward={tier.premiumReward} claimed={claimed && hasPremium} locked={!unlocked || !hasPremium} isPremium />
      </View>

      {/* Claim button */}
      {canClaim && (
        <Button title="Claim" onPress={onClaim} variant="primary" size="small" />
      )}
    </View>
  );
};

export const BattlePassScreen: React.FC<BattlePassScreenProps> = ({ navigation }) => {
  const {
    battlePassXP,
    battlePassPremium,
    battlePassClaimedTiers,
    battlePassSeason,
    claimBattlePassTier,
    addCoins,
    addGems,
    addPowerUp,
    coins,
    gems,
  } = usePlayerStore();

  const currentTier = getCurrentTier(battlePassXP);
  const { progress, next } = getNextTierXP(battlePassXP);

  // Header entrance
  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleClaim = useCallback((tier: BattlePassReward) => {
    // Award free reward
    if (tier.freeReward) {
      if (tier.freeReward.type === 'coins') addCoins(tier.freeReward.amount);
      else if (tier.freeReward.type === 'gems') addGems(tier.freeReward.amount);
      else if (tier.freeReward.type === 'powerup' && tier.freeReward.itemId) {
        addPowerUp(tier.freeReward.itemId as any, tier.freeReward.amount);
      }
    }

    // Award premium reward if applicable
    if (battlePassPremium) {
      const pr = tier.premiumReward;
      if (pr.type === 'coins') addCoins(pr.amount);
      else if (pr.type === 'gems') addGems(pr.amount);
      else if (pr.type === 'powerup' && pr.itemId) {
        addPowerUp(pr.itemId as any, pr.amount);
      }
      // Theme and skin rewards are cosmetic — they'd unlock in shop
    }

    claimBattlePassTier(tier.tier);
  }, [battlePassPremium, addCoins, addGems, addPowerUp, claimBattlePassTier]);

  const renderTier = ({ item }: { item: BattlePassReward }) => (
    <TierRow
      tier={item}
      currentTier={currentTier}
      claimed={battlePassClaimedTiers.includes(item.tier)}
      hasPremium={battlePassPremium}
      onClaim={() => handleClaim(item)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Button title={'\u2039'} onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Season {battlePassSeason}</Text>
        <CurrencyDisplay coins={coins} gems={gems} compact />
      </Animated.View>

      {/* XP Progress */}
      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLabel}>Season Progress</Text>
          <Text style={styles.xpValue}>{battlePassXP} XP</Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.xpFooter}>
          <Text style={styles.xpTierText}>Tier {currentTier}</Text>
          <Text style={styles.xpNextText}>Next: {next} XP</Text>
        </View>
      </View>

      {/* Premium upgrade banner */}
      {!battlePassPremium && (
        <View style={styles.premiumBanner}>
          <View style={styles.premiumBannerLeft}>
            <GameIcon name="crown" size={20} color={COLORS.accentGold} />
            <View>
              <Text style={styles.premiumTitle}>Premium Pass</Text>
              <Text style={styles.premiumSubtitle}>Unlock exclusive rewards</Text>
            </View>
          </View>
          <View style={styles.premiumPriceTag}>
            <Text style={styles.premiumPrice}>299</Text>
            <GameIcon name="gem" size={12} color={COLORS.accentGold} />
          </View>
        </View>
      )}

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <Text style={styles.columnLabel}>TIER</Text>
        <Text style={styles.columnLabel}>XP</Text>
        <View style={styles.rewardHeaders}>
          <Text style={styles.columnLabel}>FREE</Text>
          <Text style={[styles.columnLabel, { color: COLORS.accentGold }]}>PREMIUM</Text>
        </View>
        <Text style={styles.columnLabel}> </Text>
      </View>

      {/* Tier list */}
      <FlatList
        data={BATTLE_PASS_TIERS}
        renderItem={renderTier}
        keyExtractor={(item) => String(item.tier)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  xpCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  xpValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  xpBar: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.round,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADII.round,
  },
  xpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xpTierText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  xpNextText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.accentGold}10`,
    marginHorizontal: SPACING.md,
    borderRadius: RADII.md,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
    marginBottom: SPACING.sm,
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  premiumSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  premiumPriceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.accentGold}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.round,
  },
  premiumPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    gap: 8,
  },
  columnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  rewardHeaders: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  list: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: 24,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    marginBottom: 4,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    opacity: 0.5,
  },
  tierRowUnlocked: {
    opacity: 1,
  },
  tierNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierNumberUnlocked: {
    backgroundColor: COLORS.accent,
  },
  tierNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  tierNumberTextUnlocked: {
    color: COLORS.textPrimary,
  },
  tierXP: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    width: 48,
  },
  rewardPair: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
    justifyContent: 'center',
  },
  rewardEmpty: {
    opacity: 0.3,
  },
  rewardEmptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  rewardPremium: {
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
    backgroundColor: `${COLORS.accentGold}08`,
  },
  rewardClaimed: {
    opacity: 0.5,
  },
  rewardLocked: {
    opacity: 0.4,
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  rewardLabelClaimed: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  checkMark: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '800',
  },
});
