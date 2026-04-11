/**
 * Premium home screen with animated title blocks, rich stats, pulsing play button,
 * and polished layout. Unique visual identity with floating decorative blocks.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing, Dimensions, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '../components/common/Button';
import { Tutorial } from '../components/Tutorial';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { AchievementModal } from '../components/AchievementModal';
import { StatsModal } from '../components/StatsModal';
import { LuckySpinModal } from '../components/LuckySpinModal';
import { PiggyBankModal } from '../components/PiggyBankModal';
import { GiftBoxModal } from '../components/GiftBoxModal';
import { PlayerProfileCard } from '../components/PlayerProfileCard';
import { GameIcon } from '../components/GameIcon';
import { EventBanner } from '../components/EventBanner';
import { isFeatureUnlocked, getNextUnlock } from '../game/progression/FeatureGating';
import { shouldShowGift, generateGiftBox, GiftBox } from '../game/rewards/GiftBox';
import { getActiveSeasonalTheme } from '../game/themes/SeasonalThemes';
import { getComebackReward, ComebackReward } from '../game/rewards/ComebackBonus';
import { ComebackBonusModal } from '../components/ComebackBonusModal';
import { getStreakMilestone, getDailyStreakBonus, StreakMilestone } from '../game/rewards/StreakRewards';
import { StreakMilestoneModal } from '../components/StreakMilestoneModal';
import { LivesDisplay } from '../components/LivesDisplay';
import { FloatingParticles } from '../components/animations/FloatingParticles';
import { ScreenVignette } from '../components/animations/ScreenVignette';
import { requestNotificationPermissions, scheduleStreakReminder, scheduleRetentionNotifications, clearBadge } from '../services/notifications';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import { formatCompact } from '../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Decorative mini-blocks that float behind the title
const TITLE_BLOCKS = [
  { color: COLORS.blocks[0], size: 18, top: -10, left: 20, delay: 0 },
  { color: COLORS.blocks[1], size: 14, top: 15, right: 30, delay: 200 },
  { color: COLORS.blocks[2], size: 20, top: 50, left: -5, delay: 400 },
  { color: COLORS.blocks[4], size: 16, top: -5, right: -10, delay: 100 },
  { color: COLORS.blocks[5], size: 12, top: 60, right: 15, delay: 300 },
  { color: COLORS.blocks[3], size: 15, top: 35, left: 45, delay: 500 },
  { color: COLORS.blocks[6], size: 13, top: 70, left: 30, delay: 250 },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { highestLevel, coins, gems, totalScore, currentStreak, dailyRewardLastClaimed, unlockedAchievements, checkAchievements, lastSpinDate, piggyBankCoins, lastGiftDate, gamesPlayedToday, claimGift, lastPlayDate } = usePlayerStore();
  const { tutorialCompleted, completeTutorial, notificationsEnabled, comebackShownDate, setComebackShownDate } = useSettingsStore();
  const [showTutorial, setShowTutorial] = useState(!tutorialCompleted);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [showPiggyBank, setShowPiggyBank] = useState(false);
  const [showGiftBox, setShowGiftBox] = useState(false);
  const [currentGift, setCurrentGift] = useState<GiftBox | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showComeback, setShowComeback] = useState(false);
  const [comebackReward, setComebackReward] = useState<ComebackReward | null>(null);
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [streakMilestone, setStreakMilestone] = useState<StreakMilestone | null>(null);

  const seasonalTheme = getActiveSeasonalTheme();

  const today = new Date().toISOString().split('T')[0];
  const canSpin = lastSpinDate !== today;

  // Show daily reward modal on first visit each day
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dailyRewardLastClaimed !== today && !showTutorial) {
      const timer = setTimeout(() => setShowDailyReward(true), 800);
      return () => clearTimeout(timer);
    }
  }, [dailyRewardLastClaimed, showTutorial]);

  // Check achievements, notifications, and gift box on screen load
  useEffect(() => {
    checkAchievements();
    // Request notification permissions (non-blocking)
    requestNotificationPermissions().catch(() => {});
    // Clear badge on app open
    clearBadge().catch(() => {});
    if (notificationsEnabled) {
      if (currentStreak >= 2) {
        scheduleStreakReminder(currentStreak).catch(() => {});
      }
      scheduleRetentionNotifications().catch(() => {});
    }
    // Check for gift box eligibility
    if (shouldShowGift(highestLevel, gamesPlayedToday, lastGiftDate)) {
      const gift = generateGiftBox(highestLevel);
      setCurrentGift(gift);
      const timer = setTimeout(() => setShowGiftBox(true), 1500);
      return () => clearTimeout(timer);
    }
    // Check for streak milestone
    const milestone = getStreakMilestone(currentStreak);
    if (milestone) {
      setStreakMilestone(milestone);
      const timer = setTimeout(() => setShowStreakMilestone(true), 1200);
      return () => clearTimeout(timer);
    }
    // Check for comeback bonus (player returning after 2+ days)
    const today = new Date().toISOString().split('T')[0];
    if (comebackShownDate !== today) {
      const reward = getComebackReward(lastPlayDate);
      if (reward) {
        setComebackReward(reward);
        const timer = setTimeout(() => setShowComeback(true), 2000);
        setComebackShownDate(today);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Entrance animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(-30)).current;
  const blastScale = useRef(new Animated.Value(0.5)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(40)).current;
  const blastGlow = useRef(new Animated.Value(0.6)).current;
  const decorPulse = useRef(new Animated.Value(0.3)).current;
  const playGlowPulse = useRef(new Animated.Value(0.3)).current;

  // Title block animations
  const blockAnims = useRef(TITLE_BLOCKS.map(() => ({
    scale: new Animated.Value(0),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    // Main entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(titleTranslate, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
      ]),
      Animated.spring(blastScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }),
      Animated.timing(statsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(buttonsTranslate, { toValue: 0, useNativeDriver: true, tension: 50, friction: 9 }),
      ]),
    ]).start();

    // Animated title blocks pop in with stagger
    blockAnims.forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(300 + TITLE_BLOCKS[i].delay),
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0.7,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Gentle continuous rotation
      Animated.loop(
        Animated.timing(anim.rotate, {
          toValue: 1,
          duration: 8000 + i * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    // BLAST glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(blastGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blastGlow, { toValue: 0.6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Play button glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(playGlowPulse, { toValue: 0.7, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(playGlowPulse, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Decorative background pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(decorPulse, { toValue: 0.5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(decorPulse, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    completeTutorial();
  }, [completeTutorial]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen vignette */}
      <ScreenVignette />

      {/* Ambient floating particles */}
      <FloatingParticles count={15} />

      {/* Decorative background orbs */}
      <Animated.View style={[styles.decorOrb, styles.decorOrb1, { opacity: decorPulse }]} />
      <Animated.View style={[styles.decorOrb, styles.decorOrb2, { opacity: decorPulse }]} />
      <Animated.View style={[styles.decorOrb, styles.decorOrb3, { opacity: decorPulse }]} />

      <View style={styles.content}>
        {/* Animated Title with floating blocks */}
        <View style={styles.titleContainer}>
          {/* Floating decorative blocks behind title */}
          {TITLE_BLOCKS.map((block, i) => (
            <Animated.View
              key={i}
              style={[
                styles.titleBlock,
                {
                  width: block.size,
                  height: block.size,
                  backgroundColor: block.color,
                  borderRadius: block.size * 0.2,
                  top: block.top,
                  ...(block.left !== undefined ? { left: block.left } : {}),
                  ...(block.right !== undefined ? { right: block.right } : {}),
                  opacity: blockAnims[i].opacity,
                  transform: [
                    { scale: blockAnims[i].scale },
                    {
                      rotate: blockAnims[i].rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}

          <Animated.Text
            style={[
              styles.title,
              { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] },
            ]}
          >
            COLOR BLOCK
          </Animated.Text>
          <Animated.View style={[styles.blastRow, { transform: [{ scale: blastScale }], opacity: blastGlow }]}>
            <View style={styles.titleDeco} />
            <Text style={styles.titleAccent}>BLAST</Text>
            <View style={styles.titleDeco} />
          </Animated.View>
          {/* Subtitle tagline */}
          <Animated.Text style={[styles.tagline, { opacity: statsOpacity }]}>
            Puzzle your way to the top
          </Animated.Text>
        </View>

        {/* Lives display */}
        <Animated.View style={[styles.livesRow, { opacity: statsOpacity }]}>
          <LivesDisplay />
        </Animated.View>

        {/* Stats bar — tap to open stats dashboard */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowStats(true)} style={{ width: '100%' }}>
        <Animated.View style={[styles.statsBar, { opacity: statsOpacity }]}>
          <View style={styles.statItem}>
            <GameIcon name="coin" size={20} />
            <Text style={styles.statValue}>{formatCompact(coins)}</Text>
            <Text style={styles.statLabel}>COINS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <GameIcon name="gem" size={20} />
            <Text style={styles.statValue}>{formatCompact(gems)}</Text>
            <Text style={styles.statLabel}>GEMS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <GameIcon name="star" size={20} />
            <Text style={styles.statValue}>{formatCompact(totalScore)}</Text>
            <Text style={styles.statLabel}>SCORE</Text>
          </View>
          {currentStreak > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <GameIcon name="fire" size={20} />
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>STREAK</Text>
              </View>
            </>
          )}
        </Animated.View>
        </TouchableOpacity>

        {/* Main buttons */}
        <Animated.View
          style={[
            styles.buttonGroup,
            { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslate }] },
          ]}
        >
          {/* Primary play button - full width, large, with pulsing glow */}
          <View style={styles.playButtonWrap}>
            <Button
              title={highestLevel > 0 ? `Continue  \u2022  Level ${highestLevel + 1}` : 'Play'}
              onPress={() => navigation.navigate('Game', { level: highestLevel > 0 ? highestLevel + 1 : 1 })}
              variant="primary"
              size="large"
              style={styles.mainButton}
            />
            {/* Animated glow ring */}
            <Animated.View style={[styles.playGlow, { opacity: playGlowPulse }]} />
            <Animated.View style={[styles.playGlowOuter, { opacity: Animated.multiply(playGlowPulse, 0.5) }]} />
          </View>

          {/* Seasonal theme indicator */}
          {seasonalTheme && (
            <View style={[styles.seasonBanner, { borderColor: `${seasonalTheme.accent}40` }]}>
              <GameIcon name={seasonalTheme.icon as any} size={14} color={seasonalTheme.accent} />
              <Text style={[styles.seasonText, { color: seasonalTheme.accent }]}>
                {seasonalTheme.name} Event
              </Text>
            </View>
          )}

          {/* Secondary row - Daily Challenge + Weekly + Level Select + Zen */}
          <View style={styles.secondaryRow}>
            {isFeatureUnlocked('daily_challenge', highestLevel) && (
              <Button
                title="Daily"
                onPress={() => navigation.navigate('DailyChallenge')}
                variant="secondary"
                size="medium"
                style={styles.thirdButton}
              />
            )}
            {isFeatureUnlocked('weekly_challenge', highestLevel) && (
              <Button
                title="Weekly"
                onPress={() => navigation.navigate('WeeklyChallenge')}
                variant="secondary"
                size="medium"
                style={styles.thirdButton}
              />
            )}
            <Button
              title="Levels"
              onPress={() => navigation.navigate('LevelSelect')}
              variant="secondary"
              size="medium"
              style={styles.thirdButton}
            />
            {isFeatureUnlocked('zen_mode', highestLevel) && (
              <Button
                title="Zen"
                onPress={() => navigation.navigate('Game', { level: 0, endless: true })}
                variant="secondary"
                size="medium"
                style={styles.thirdButton}
              />
            )}
          </View>

          {/* Live event banners */}
          <EventBanner />

          {/* Bottom row - progressively unlocked features */}
          <View style={styles.bottomRow}>
            {isFeatureUnlocked('lucky_spin', highestLevel) && (
              <View style={styles.bottomButtonWrapper}>
                <Button
                  title={canSpin ? 'Spin!' : 'Spin'}
                  onPress={() => setShowSpin(true)}
                  variant={canSpin ? 'secondary' : 'ghost'}
                  size="small"
                  style={styles.bottomButton}
                />
              </View>
            )}
            {isFeatureUnlocked('piggy_bank', highestLevel) && (
              <View style={styles.bottomButtonWrapper}>
                <Button
                  title={piggyBankCoins > 0 ? `Bank (${piggyBankCoins})` : 'Bank'}
                  onPress={() => setShowPiggyBank(true)}
                  variant={piggyBankCoins >= 100 ? 'secondary' : 'ghost'}
                  size="small"
                  style={styles.bottomButton}
                />
              </View>
            )}
            {isFeatureUnlocked('shop', highestLevel) && (
              <View style={styles.bottomButtonWrapper}>
                <Button
                  title="Shop"
                  onPress={() => navigation.navigate('Shop')}
                  variant="ghost"
                  size="small"
                  style={styles.bottomButton}
                />
              </View>
            )}
            {isFeatureUnlocked('achievements', highestLevel) && (
              <View style={styles.bottomButtonWrapper}>
                <Button
                  title="Trophies"
                  onPress={() => setShowAchievements(true)}
                  variant="ghost"
                  size="small"
                  style={styles.bottomButton}
                />
              </View>
            )}
            {isFeatureUnlocked('battle_pass', highestLevel) && (
              <View style={styles.bottomButtonWrapper}>
                <Button
                  title="Season"
                  onPress={() => navigation.navigate('BattlePass')}
                  variant="ghost"
                  size="small"
                  style={styles.bottomButton}
                />
              </View>
            )}
            <View style={styles.bottomButtonWrapper}>
              <Button
                title="Profile"
                onPress={() => setShowProfile(true)}
                variant="ghost"
                size="small"
                style={styles.bottomButton}
              />
            </View>
            <View style={styles.bottomButtonWrapper}>
              <Button
                title="Settings"
                onPress={() => navigation.navigate('Settings')}
                variant="ghost"
                size="small"
                style={styles.bottomButton}
              />
            </View>
          </View>

          {/* Next unlock hint for new players */}
          {highestLevel > 0 && highestLevel < 15 && getNextUnlock(highestLevel) && (
            <View style={styles.unlockHint}>
              <GameIcon name="star" size={12} color={COLORS.textMuted} />
              <Text style={styles.unlockHintText}>
                Level {getNextUnlock(highestLevel)!.unlockLevel}: {getNextUnlock(highestLevel)!.name}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Level indicator */}
        {highestLevel > 0 && (
          <Animated.View style={[styles.levelIndicatorRow, { opacity: buttonsOpacity }]}>
            <View style={styles.levelBadge}>
              <GameIcon name="crown" size={12} color={COLORS.accentGold} />
              <Text style={styles.levelBadgeText}>LEVEL {highestLevel}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}

      {/* Daily reward modal */}
      <DailyRewardModal
        visible={showDailyReward}
        onClose={() => setShowDailyReward(false)}
      />

      {/* Achievement modal */}
      <AchievementModal
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />

      {/* Stats dashboard modal */}
      <StatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
      />

      {/* Lucky Spin modal */}
      <LuckySpinModal
        visible={showSpin}
        onClose={() => setShowSpin(false)}
      />

      {/* Piggy Bank modal */}
      <PiggyBankModal
        visible={showPiggyBank}
        onClose={() => setShowPiggyBank(false)}
      />

      {/* Gift Box modal */}
      <GiftBoxModal
        visible={showGiftBox}
        gift={currentGift}
        onClose={() => {
          setShowGiftBox(false);
          claimGift();
        }}
      />

      {/* Player Profile modal */}
      <PlayerProfileCard
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* Comeback Bonus modal */}
      <ComebackBonusModal
        visible={showComeback}
        reward={comebackReward}
        onClose={() => setShowComeback(false)}
      />

      {/* Streak Milestone modal */}
      <StreakMilestoneModal
        visible={showStreakMilestone}
        milestone={streakMilestone}
        onClose={() => setShowStreakMilestone(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  // Decorative background elements
  decorOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorOrb1: {
    width: 220,
    height: 220,
    backgroundColor: COLORS.accent,
    top: -70,
    right: -60,
    opacity: 0.06,
  },
  decorOrb2: {
    width: 180,
    height: 180,
    backgroundColor: COLORS.accentGold,
    bottom: 30,
    left: -50,
    opacity: 0.04,
  },
  decorOrb3: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.blocks[2],
    top: '40%',
    right: -30,
    opacity: 0.03,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
    paddingHorizontal: 20,
  },
  titleBlock: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  title: {
    fontSize: SCREEN_WIDTH < 375 ? 38 : 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  blastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: -4,
  },
  titleAccent: {
    fontSize: SCREEN_WIDTH < 375 ? 46 : 58,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 12,
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  titleDeco: {
    width: 32,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    opacity: 0.6,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 8,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.surface}E0`,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.medium,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.surfaceBorder,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  playButtonWrap: {
    width: '100%',
    position: 'relative',
  },
  mainButton: {
    width: '100%',
  },
  playGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: RADII.lg + 3,
    borderWidth: 2,
    borderColor: COLORS.accent,
    zIndex: -1,
  },
  playGlowOuter: {
    position: 'absolute',
    top: -7,
    left: -7,
    right: -7,
    bottom: -7,
    borderRadius: RADII.lg + 7,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    zIndex: -2,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  halfButton: {
    flex: 1,
  },
  thirdButton: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  bottomButtonWrapper: {
    flex: 1,
  },
  bottomButton: {
    width: '100%',
  },
  levelIndicatorRow: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.accentGold}12`,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}30`,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 1.5,
  },
  unlockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  unlockHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  livesRow: {
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  seasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADII.round,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  seasonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
