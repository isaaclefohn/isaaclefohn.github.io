/**
 * Weekly Challenge screen.
 * Shows the current week's challenge with shared seed,
 * leaderboard, and timer until next reset.
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  getWeeklyChallengeInfo,
  getCurrentWeekId,
  formatTimeRemaining,
  WEEKLY_COIN_REWARDS,
  WEEKLY_GEM_BONUS,
} from '../game/challenges/WeeklyChallenge';
import { Leaderboard } from '../components/Leaderboard';
import { Button } from '../components/common/Button';
import { GameIcon } from '../components/GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import { formatScore } from '../utils/formatters';
import { useSettingsStore } from '../store/settingsStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type WeeklyChallengeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WeeklyChallenge'>;
};

export const WeeklyChallengeScreen: React.FC<WeeklyChallengeScreenProps> = ({ navigation }) => {
  const { weeklyBestScore, weeklyBestStars, weeklyLastWeekId, highestLevel } = usePlayerStore();

  const challengeInfo = useMemo(() => getWeeklyChallengeInfo(), []);
  const currentWeekId = getCurrentWeekId();
  const hasPlayedThisWeek = weeklyLastWeekId === currentWeekId;
  const bestScore = hasPlayedThisWeek ? weeklyBestScore : 0;
  const bestStars = hasPlayedThisWeek ? weeklyBestStars : 0;

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();

    // Capture the loop handle so we can stop it when the user navigates
    // away. Previously this was fire-and-forget — the loop kept running
    // on a detached pulseAnim after unmount; each session re-entry
    // accumulated more orphaned driver work. Also suppressed under
    // reduced motion (the entrance fade/slide above still plays).
    if (reducedMotion) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [reducedMotion]);

  const handlePlay = useCallback(() => {
    navigation.navigate('Game', { level: -1 });
  }, [navigation]);

  // Difficulty color
  const diffColor = challengeInfo.difficulty === 'Easy' ? COLORS.success
    : challengeInfo.difficulty === 'Medium' ? COLORS.info
    : challengeInfo.difficulty === 'Hard' ? COLORS.warning
    : COLORS.danger;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button title={'\u2039'} onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Weekly Challenge</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Challenge card */}
        <View style={styles.challengeCard}>
          <View style={styles.weekBadge}>
            <GameIcon name="calendar" size={14} color={COLORS.accent} />
            <Text style={styles.weekText}>{challengeInfo.weekId}</Text>
          </View>

          <Text style={styles.challengeTitle}>This Week's Puzzle</Text>

          {/* Info pills */}
          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
              <Text style={[styles.infoText, { color: diffColor }]}>{challengeInfo.difficulty}</Text>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoText}>{challengeInfo.gridSize}x{challengeInfo.gridSize}</Text>
            </View>
            <View style={styles.infoPill}>
              <GameIcon name="target" size={12} color={COLORS.accent} />
              <Text style={styles.infoText}>{formatScore(challengeInfo.scoreTarget)}</Text>
            </View>
          </View>

          {/* Timer */}
          <View style={styles.timerRow}>
            <Animated.View style={{ opacity: pulseAnim }}>
              <GameIcon name="clock" size={14} color={COLORS.textMuted} />
            </Animated.View>
            <Text style={styles.timerText}>
              Resets in {formatTimeRemaining(challengeInfo.timeRemaining)}
            </Text>
          </View>
        </View>

        {/* Rewards preview */}
        <View style={styles.rewardsCard}>
          <Text style={styles.rewardsTitle}>REWARDS</Text>
          <View style={styles.rewardsRow}>
            {([1, 2, 3] as const).map((stars) => (
              <View key={stars} style={[styles.rewardItem, bestStars >= stars && styles.rewardEarned]}>
                <View style={styles.starsRow}>
                  {Array.from({ length: stars }).map((_, i) => (
                    <GameIcon
                      key={i}
                      name={bestStars >= stars ? 'star' : 'star-outline'}
                      size={12}
                      color={bestStars >= stars ? COLORS.accentGold : undefined}
                    />
                  ))}
                </View>
                <Text style={[styles.rewardAmount, bestStars >= stars && { color: COLORS.accentGold }]}>
                  {WEEKLY_COIN_REWARDS[stars]}
                </Text>
                <GameIcon name="coin" size={12} />
                {stars === 3 && (
                  <View style={styles.gemBonus}>
                    <Text style={styles.gemBonusText}>+{WEEKLY_GEM_BONUS}</Text>
                    <GameIcon name="gem" size={10} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Best score */}
        {bestScore > 0 && (
          <View style={styles.bestScoreRow}>
            <GameIcon name="trophy" size={16} color={COLORS.accentGold} />
            <Text style={styles.bestScoreText}>Your Best: {formatScore(bestScore)}</Text>
            <View style={styles.bestStarsRow}>
              {[1, 2, 3].map((s) => (
                <GameIcon key={s} name={s <= bestStars ? 'star' : 'star-outline'} size={14} />
              ))}
            </View>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>WEEKLY RANKINGS</Text>
          <Leaderboard
            playerScore={bestScore}
            playerName={usePlayerStore.getState().displayName}
            level={-1}
          />
        </View>

        {/* Play button */}
        <View style={styles.actions}>
          <Button
            title={bestScore > 0 ? 'Try Again' : 'Play Challenge'}
            onPress={handlePlay}
            variant="primary"
            size="large"
          />
        </View>
      </Animated.View>
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  challengeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.accent}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.round,
    marginBottom: 10,
  },
  weekText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  challengeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.round,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  rewardsCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  rewardsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardItem: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  rewardEarned: {
    opacity: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  gemBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  gemBonusText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.info,
  },
  bestScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.md,
    backgroundColor: `${COLORS.accentGold}10`,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
  },
  bestScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  bestStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  leaderboardSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
});
