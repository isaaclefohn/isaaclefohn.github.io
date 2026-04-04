/**
 * Daily challenge screen.
 * Shows today's challenge with countdown timer and streak info.
 * Premium visual styling with animated entrances and glow effects.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { Button } from '../components/common/Button';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { GameIcon } from '../components/GameIcon';
import { COLORS, SHADOWS, SPACING, RADII } from '../utils/constants';
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

/** Individual countdown digit box */
const CountdownDigitBox: React.FC<{ value: string }> = ({ value }) => (
  <View style={styles.digitBox}>
    <Text style={styles.digitText}>{value}</Text>
  </View>
);

/** Countdown digit pair (e.g. "05") with label */
const CountdownUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const padded = String(value).padStart(2, '0');
  return (
    <View style={styles.countdownUnit}>
      <View style={styles.digitPair}>
        <CountdownDigitBox value={padded[0]} />
        <CountdownDigitBox value={padded[1]} />
      </View>
      <Text style={styles.digitLabel}>{label}</Text>
    </View>
  );
};

/** Colon separator between digit groups */
const CountdownSeparator: React.FC = () => (
  <Text style={styles.digitSeparator}>:</Text>
);

export const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ navigation }) => {
  const { currentStreak, longestStreak, lastPlayDate } = usePlayerStore();
  const [countdown, setCountdown] = useState(getSecondsUntilMidnight());
  const hasPlayedToday = lastPlayDate === getToday();

  // --- Animated values ---
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(0.7)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const streakTranslateY = useRef(new Animated.Value(40)).current;
  const streakOpacity = useRef(new Animated.Value(0)).current;
  const rewardAnims = useRef(
    STREAK_REWARDS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;
  const readyGlowOpacity = useRef(new Animated.Value(0.4)).current;
  const currentDayBorderOpacity = useRef(new Animated.Value(0.5)).current;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getSecondsUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Entrance animations
  useEffect(() => {
    // Header fade in
    const headerAnim = Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });

    // Countdown card spring scale
    const countdownAnim = Animated.parallel([
      Animated.spring(countdownScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(countdownOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    // Streak card slide up
    const streakAnim = Animated.parallel([
      Animated.spring(streakTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(streakOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    // Rewards grid stagger
    const rewardStagger = Animated.stagger(
      60,
      rewardAnims.map((anim) =>
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.sequence([
      headerAnim,
      Animated.delay(50),
      countdownAnim,
      Animated.delay(50),
      streakAnim,
      Animated.delay(50),
      rewardStagger,
    ]).start();
  }, []);

  // Pulsing glow on "Ready to play!" text
  useEffect(() => {
    if (hasPlayedToday) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(readyGlowOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(readyGlowOpacity, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [hasPlayedToday]);

  // Pulsing border on current day reward
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(currentDayBorderOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(currentDayBorderOpacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handlePlay = useCallback(() => {
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
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Daily Challenge</Text>
        <CurrencyDisplay />
      </Animated.View>

      <View style={styles.content}>
        {/* Countdown Card */}
        <Animated.View
          style={[
            styles.countdownCard,
            {
              opacity: countdownOpacity,
              transform: [{ scale: countdownScale }],
            },
          ]}
        >
          <Text style={styles.countdownLabel}>
            {hasPlayedToday ? 'Next challenge in' : "Today's challenge"}
          </Text>
          {hasPlayedToday ? (
            <View style={styles.countdownDigits}>
              <CountdownUnit value={hours} label="HRS" />
              <CountdownSeparator />
              <CountdownUnit value={minutes} label="MIN" />
              <CountdownSeparator />
              <CountdownUnit value={seconds} label="SEC" />
            </View>
          ) : (
            <Animated.Text style={[styles.countdownReady, { opacity: readyGlowOpacity }]}>
              Ready to play!
            </Animated.Text>
          )}
        </Animated.View>

        {/* Play button */}
        <Button
          title={hasPlayedToday ? 'Completed' : 'Play Challenge'}
          onPress={handlePlay}
          variant="primary"
          size="large"
          style={[
            styles.playButton,
            !hasPlayedToday && styles.playButtonGlow,
          ]}
          disabled={hasPlayedToday}
        />

        {/* Streak info */}
        <Animated.View
          style={[
            styles.streakCard,
            {
              opacity: streakOpacity,
              transform: [{ translateY: streakTranslateY }],
            },
          ]}
        >
          <Text style={styles.streakTitle}>Current Streak</Text>
          <View style={styles.streakRow}>
            <View style={styles.streakBadge}>
              <View style={styles.streakNumberRow}>
                <GameIcon name="fire" size={24} />
                <Text style={styles.streakNumber}>{currentStreak}</Text>
              </View>
              <Text style={styles.streakLabel}>days</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakBadge}>
              <View style={styles.streakNumberRow}>
                <GameIcon name="fire" size={24} />
                <Text style={styles.streakNumber}>{longestStreak}</Text>
              </View>
              <Text style={styles.streakLabel}>best</Text>
            </View>
          </View>
        </Animated.View>

        {/* Streak rewards */}
        <Animated.View style={[styles.rewardsCard, { opacity: streakOpacity }]}>
          <Text style={styles.rewardsTitle}>7-Day Streak Rewards</Text>
          <View style={styles.rewardsGrid}>
            {STREAK_REWARDS.map((reward, index) => {
              const isCompleted = currentStreak >= reward.day;
              const isCurrent = currentStreak + 1 === reward.day;
              const anim = rewardAnims[index];

              const itemContent = (
                <>
                  <Text style={[styles.rewardDay, isCompleted && styles.rewardDayCompleted]}>
                    Day {reward.day}
                  </Text>
                  <Text style={styles.rewardCoins}>{reward.coins}c</Text>
                  {reward.gems > 0 && (
                    <Text style={styles.rewardGems}>+{reward.gems}g</Text>
                  )}
                  {isCompleted && (
                    <View style={styles.checkmarkContainer}>
                      <Text style={styles.checkmark}>{'\u2713'}</Text>
                    </View>
                  )}
                </>
              );

              if (isCurrent) {
                return (
                  <Animated.View
                    key={reward.day}
                    style={[
                      styles.rewardItem,
                      styles.rewardCurrent,
                      {
                        opacity: Animated.multiply(anim.opacity, currentDayBorderOpacity.interpolate({
                          inputRange: [0.4, 1],
                          outputRange: [1, 1],
                        })),
                        transform: [{ translateY: anim.translateY }],
                        borderColor: COLORS.accent,
                      },
                    ]}
                  >
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          borderRadius: RADII.md,
                          borderWidth: 2,
                          borderColor: COLORS.accent,
                          opacity: currentDayBorderOpacity,
                        },
                      ]}
                    />
                    {itemContent}
                  </Animated.View>
                );
              }

              return (
                <Animated.View
                  key={reward.day}
                  style={[
                    styles.rewardItem,
                    isCompleted && styles.rewardCompleted,
                    {
                      opacity: anim.opacity,
                      transform: [{ translateY: anim.translateY }],
                    },
                  ]}
                >
                  {itemContent}
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  // --- Countdown card ---
  countdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.medium,
  },
  countdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  countdownDigits: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  countdownUnit: {
    alignItems: 'center',
  },
  digitPair: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  digitBox: {
    width: 44,
    height: 56,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  digitText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  digitLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    letterSpacing: 1.5,
  },
  digitSeparator: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginHorizontal: SPACING.sm,
    marginTop: 10,
  },
  countdownReady: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accentGold,
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },

  // --- Play button ---
  playButton: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  playButtonGlow: {
    ...SHADOWS.glow(COLORS.accent),
  } as any,

  // --- Streak card ---
  streakCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.medium,
  },
  streakTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  streakBadge: {
    alignItems: 'center',
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.accentGold,
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  streakDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.surfaceBorder,
  },

  // --- Rewards card ---
  rewardsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.medium,
  },
  rewardsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  rewardItem: {
    width: 76,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rewardCompleted: {
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}10`,
    ...SHADOWS.glow(COLORS.accentGold),
  } as any,
  rewardCurrent: {
    borderWidth: 0,
    backgroundColor: `${COLORS.accent}08`,
    overflow: 'hidden',
  },
  rewardDay: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  rewardDayCompleted: {
    color: COLORS.accentGoldLight,
  },
  rewardCoins: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
    marginTop: 2,
  },
  rewardGems: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C084FC',
    marginTop: 1,
  },
  checkmarkContainer: {
    marginTop: SPACING.xs,
    width: 20,
    height: 20,
    borderRadius: RADII.round,
    backgroundColor: `${COLORS.accentGold}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    color: COLORS.accentGold,
    fontWeight: '800',
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
