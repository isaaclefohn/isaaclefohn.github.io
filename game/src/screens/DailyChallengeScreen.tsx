/**
 * Daily challenge screen.
 * Shows today's challenge with countdown timer and streak info.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { Button } from '../components/common/Button';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { COLORS } from '../utils/constants';
import { formatTime } from '../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type DailyChallengeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DailyChallenge'>;
};

/** Get seconds until midnight UTC */
function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

/** Get today's date string */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/** Streak reward tiers */
const STREAK_REWARDS = [
  { day: 1, coins: 25, gems: 0 },
  { day: 2, coins: 50, gems: 0 },
  { day: 3, coins: 75, gems: 0 },
  { day: 4, coins: 100, gems: 0 },
  { day: 5, coins: 125, gems: 1 },
  { day: 6, coins: 150, gems: 2 },
  { day: 7, coins: 200, gems: 5 },
];

export const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ navigation }) => {
  const { currentStreak, longestStreak, lastPlayDate } = usePlayerStore();
  const [countdown, setCountdown] = useState(getSecondsUntilMidnight());
  const hasPlayedToday = lastPlayDate === getToday();

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getSecondsUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlay = useCallback(() => {
    // Daily challenge uses a special level number (10000 + day index)
    const today = getToday();
    const dayOfYear = Math.floor(
      (new Date(today).getTime() - new Date(today.slice(0, 4) + '-01-01').getTime()) / 86400000
    ) + 1;
    navigation.navigate('Game', { level: 10000 + dayOfYear });
  }, [navigation]);

  const hours = Math.floor(countdown / 3600);
  const minutes = Math.floor((countdown % 3600) / 60);
  const seconds = countdown % 60;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Daily Challenge</Text>
        <CurrencyDisplay />
      </View>

      <View style={styles.content}>
        {/* Countdown */}
        <View style={styles.countdownCard}>
          <Text style={styles.countdownLabel}>
            {hasPlayedToday ? 'Next challenge in' : "Today's challenge"}
          </Text>
          {hasPlayedToday ? (
            <Text style={styles.countdownTimer}>
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          ) : (
            <Text style={styles.countdownReady}>Ready to play!</Text>
          )}
        </View>

        {/* Play button */}
        <Button
          title={hasPlayedToday ? 'Completed' : 'Play Challenge'}
          onPress={handlePlay}
          variant="primary"
          size="large"
          style={styles.playButton}
          disabled={hasPlayedToday}
        />

        {/* Streak info */}
        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>Current Streak</Text>
          <View style={styles.streakRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakNumber}>{currentStreak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakBadge}>
              <Text style={styles.streakNumber}>{longestStreak}</Text>
              <Text style={styles.streakLabel}>best</Text>
            </View>
          </View>
        </View>

        {/* Streak rewards */}
        <View style={styles.rewardsCard}>
          <Text style={styles.rewardsTitle}>7-Day Streak Rewards</Text>
          <View style={styles.rewardsGrid}>
            {STREAK_REWARDS.map((reward) => {
              const isCompleted = currentStreak >= reward.day;
              const isCurrent = currentStreak + 1 === reward.day;
              return (
                <View
                  key={reward.day}
                  style={[
                    styles.rewardItem,
                    isCompleted && styles.rewardCompleted,
                    isCurrent && styles.rewardCurrent,
                  ]}
                >
                  <Text style={styles.rewardDay}>Day {reward.day}</Text>
                  <Text style={styles.rewardCoins}>{reward.coins}c</Text>
                  {reward.gems > 0 && (
                    <Text style={styles.rewardGems}>+{reward.gems}g</Text>
                  )}
                  {isCompleted && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                </View>
              );
            })}
          </View>
        </View>
      </View>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  countdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  countdownTimer: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  countdownReady: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  playButton: {
    width: '100%',
    marginBottom: 24,
  },
  streakCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  streakTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  streakBadge: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.gridEmpty,
  },
  rewardsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  rewardsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  rewardItem: {
    width: 72,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.gridEmpty,
  },
  rewardCompleted: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}10`,
  },
  rewardCurrent: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  rewardDay: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  rewardCoins: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  rewardGems: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C084FC',
  },
  checkmark: {
    fontSize: 12,
    color: COLORS.accentGold,
    fontWeight: '700',
  },
});
