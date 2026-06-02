/**
 * Forward-looking peek at tomorrow's daily reward. Shown at session
 * end (game-over modal) so the player leaves anticipating the NEXT
 * visit, not regretting the last score.
 *
 * Ethical guardrail (per the addiction research): no countdown, no
 * "expires", no loss-framing. Just an invitation — what they want is
 * waiting. The framing matters: this triggers anticipation, not FOMO.
 *
 * Pairs with the streak shield (loss-aversion clamp) and the variable
 * daily-wheel (variance moment) to complete the 7-day return-habit
 * triad.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameIcon } from './GameIcon';
import { DAILY_REWARDS, usePlayerStore } from '../store/playerStore';
import { COLORS, RADII, SPACING } from '../utils/constants';
import { getLocalToday } from '../utils/dates';

export const TomorrowPromise: React.FC = () => {
  const { dailyRewardDay, dailyRewardLastClaimed } = usePlayerStore();

  // `dailyRewardDay` is the index of the NEXT claim. If today is still
  // unclaimed, today's reward sits at that index, so tomorrow is +1.
  // If they already claimed today, the counter was incremented and now
  // points at tomorrow directly. Either way, this resolves to the
  // reward they'll see on their next return.
  const today = getLocalToday();
  const canClaimToday = dailyRewardLastClaimed !== today;
  const tomorrowIndex =
    (dailyRewardDay + (canClaimToday ? 1 : 0)) % DAILY_REWARDS.length;
  const tomorrowReward = DAILY_REWARDS[tomorrowIndex];
  const isJackpot = tomorrowIndex === DAILY_REWARDS.length - 1;

  return (
    <View style={[styles.card, isJackpot && styles.cardJackpot]}>
      <GameIcon
        name={isJackpot ? 'gift' : 'calendar'}
        size={16}
        color={isJackpot ? COLORS.accentGold : COLORS.accent}
      />
      <Text style={styles.label}>Tomorrow</Text>
      <Text style={[styles.value, isJackpot && styles.valueJackpot]}>
        {isJackpot ? 'JACKPOT' : `+${tomorrowReward.coins}`}
        {!isJackpot && tomorrowReward.gems ? ` + ${tomorrowReward.gems}💎` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginVertical: SPACING.sm,
    alignSelf: 'center',
  },
  cardJackpot: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}15`,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  valueJackpot: {
    color: COLORS.accentGold,
    letterSpacing: 0.5,
  },
});
