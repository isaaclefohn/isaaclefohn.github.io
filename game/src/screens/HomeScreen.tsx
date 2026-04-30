/**
 * Premium home screen with animated title blocks, rich stats, pulsing play button,
 * and polished layout. Unique visual identity with floating decorative blocks.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Animated, Easing, Dimensions, TouchableOpacity } from 'react-native';
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
import { FeatureTile } from '../components/FeatureTile';
import { isFeatureUnlocked, getNextUnlock } from '../game/progression/FeatureGating';
import { shouldShowGift, generateGiftBox, GiftBox } from '../game/rewards/GiftBox';
import { getActiveSeasonalTheme } from '../game/themes/SeasonalThemes';
import { getComebackReward, ComebackReward } from '../game/rewards/ComebackBonus';
import { ComebackBonusModal } from '../components/ComebackBonusModal';
import { getStreakMilestone, getDailyStreakBonus, StreakMilestone } from '../game/rewards/StreakRewards';
import { StreakMilestoneModal } from '../components/StreakMilestoneModal';
import { LivesDisplay } from '../components/LivesDisplay';
import { DailyQuestsCard } from '../components/DailyQuestsCard';
import { StickerAlbumModal } from '../components/StickerAlbumModal';
import { checkStickerUnlocks } from '../game/systems/StickerAlbum';
import { SkillRatingDisplay } from '../components/SkillRatingDisplay';
import { AchievementShowcase } from '../components/AchievementShowcase';
import { OfflineRewardModal } from '../components/OfflineRewardModal';
import { LoginCalendarModal } from '../components/LoginCalendarModal';
import { DailyDealModal } from '../components/DailyDealModal';
import { getTodaysDeal, getTodayDealKey, isDealClaimed } from '../game/rewards/DailyDeal';
import { BossRushModal } from '../components/BossRushModal';
import { isBossRushUnlocked } from '../game/modes/BossRush';
import { TreasureHuntModal } from '../components/TreasureHuntModal';
import { LeaderboardModal } from '../components/LeaderboardModal';
import { PIECES_REQUIRED } from '../game/rewards/TreasureHunt';
import { TournamentModal } from '../components/TournamentModal';
import { getHighestTier } from '../game/modes/Tournament';
import { InboxModal } from '../components/InboxModal';
import { VIPModal } from '../components/VIPModal';
import { QuestChainModal } from '../components/QuestChainModal';
import { PowerUpFusionModal } from '../components/PowerUpFusionModal';
import { SeasonalEventModal } from '../components/SeasonalEventModal';
import { HubMenuModal } from '../components/HubMenuModal';
import { getActiveEvent } from '../game/events/SeasonalEvent';
import { MysteryShopModal } from '../components/MysteryShopModal';
import { BlockMasteryModal } from '../components/BlockMasteryModal';
import { DailyRouletteModal } from '../components/DailyRouletteModal';
import { hasSpunToday } from '../game/challenges/DailyRoulette';
import { getDailyPuzzleId, getDailyPuzzleLabel, formatCountdown, getMsUntilNextPuzzle } from '../game/challenges/DailyPuzzle';
import { DailyStatsModal } from '../components/DailyStatsModal';
import { StarterPackModal } from '../components/StarterPackModal';
import { FlashOfferModal } from '../components/FlashOfferModal';
import { FreeChestModal } from '../components/FreeChestModal';
import { isFreeChestReady, getFreeChestTimeRemaining } from '../game/rewards/FreeChest';
import {
  isStarterPackAvailable,
  STARTER_PACK_UNLOCK_LEVEL,
} from '../game/monetization/StarterPack';
import { getCurrentFlashOffer } from '../game/monetization/LimitedOffers';
import { getUnclaimedCount, generateWelcomeMessage } from '../game/systems/Inbox';
import { isVIPActive } from '../game/systems/VIPMembership';
import { calculateOfflineReward, OfflineReward } from '../game/rewards/OfflineRewards';
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
  const { highestLevel, coins, gems, totalScore, currentStreak, dailyRewardLastClaimed, unlockedAchievements, checkAchievements, lastSpinDate, piggyBankCoins, lastGiftDate, gamesPlayedToday, claimGift, lastPlayDate, collectedStickers, collectSticker, totalLinesCleared, bestCombo, totalGamesPlayed, longestStreak, addCoins, lastDealClaimed, rouletteLastDate, dailyPuzzleLastPlayedId, dailyPuzzleLastPlayedScore, dailyPuzzleStreak } = usePlayerStore();
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
  const [showAlbum, setShowAlbum] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [showOfflineReward, setShowOfflineReward] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDailyDeal, setShowDailyDeal] = useState(false);
  const [showBossRush, setShowBossRush] = useState(false);
  const [showTreasure, setShowTreasure] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showVIP, setShowVIP] = useState(false);
  const [showQuestChains, setShowQuestChains] = useState(false);
  const [showFusion, setShowFusion] = useState(false);
  const [showSeasonalEvent, setShowSeasonalEvent] = useState(false);
  const [showMysteryShop, setShowMysteryShop] = useState(false);
  const [showBlockMastery, setShowBlockMastery] = useState(false);
  const [showDailyRoulette, setShowDailyRoulette] = useState(false);
  const [showDailyStats, setShowDailyStats] = useState(false);
  const [showStarterPack, setShowStarterPack] = useState(false);
  const [showFlashOffer, setShowFlashOffer] = useState(false);
  const [showFreeChest, setShowFreeChest] = useState(false);
  const [showRewardsHub, setShowRewardsHub] = useState(false);
  const [showCompeteHub, setShowCompeteHub] = useState(false);
  const [showShopHub, setShowShopHub] = useState(false);
  const [showMoreHub, setShowMoreHub] = useState(false);
  const freeChestLastClaimedAt = usePlayerStore((s) => s.freeChestLastClaimedAt);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const freeChestReady = isFreeChestReady(freeChestLastClaimedAt, nowTick);
  const freeChestMs = getFreeChestTimeRemaining(freeChestLastClaimedAt, nowTick);
  const freeChestLabel = freeChestReady
    ? 'Chest!'
    : `Chest ${Math.floor(freeChestMs / 3_600_000)}h${Math.floor((freeChestMs % 3_600_000) / 60_000)
        .toString()
        .padStart(2, '0')}`;
  const activeSeason = getActiveEvent();
  const starterPackUnlockedAt = usePlayerStore((s) => s.starterPackUnlockedAt);
  const starterPackClaimed = usePlayerStore((s) => s.starterPackClaimed);
  const unlockStarterPack = usePlayerStore((s) => s.unlockStarterPack);
  const starterPackVisible = isStarterPackAvailable(
    starterPackUnlockedAt,
    starterPackClaimed,
    highestLevel,
  );
  const currentFlashOffer = getCurrentFlashOffer();
  const rouletteAvailable = !hasSpunToday(
    rouletteLastDate,
    new Date().toISOString().split('T')[0],
  );
  const treasureMapPieces = usePlayerStore((s) => s.treasureMapPieces);
  const activeTournament = usePlayerStore((s) => s.activeTournament);
  const inboxMessages = usePlayerStore((s) => s.inboxMessages);
  const inboxClaimed = usePlayerStore((s) => s.inboxClaimed);
  const inboxDismissed = usePlayerStore((s) => s.inboxDismissed);
  const vipUntil = usePlayerStore((s) => s.vipUntil);
  const addInboxMessage = usePlayerStore((s) => s.addInboxMessage);

  const unclaimedCount = getUnclaimedCount({
    messages: inboxMessages,
    claimedIds: inboxClaimed,
    dismissedIds: inboxDismissed,
  });
  const vipActive = isVIPActive(vipUntil);

  // Seed the welcome inbox message on first launch
  useEffect(() => {
    if (inboxMessages.length === 0 && !inboxDismissed.includes('welcome')) {
      addInboxMessage(generateWelcomeMessage());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-unlock starter pack timer once the player hits the unlock level
  useEffect(() => {
    if (
      highestLevel >= STARTER_PACK_UNLOCK_LEVEL &&
      starterPackUnlockedAt === null &&
      !starterPackClaimed
    ) {
      unlockStarterPack();
    }
  }, [highestLevel, starterPackUnlockedAt, starterPackClaimed, unlockStarterPack]);
  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(null);

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

  // Check achievements, stickers, notifications, and gift box on screen load
  useEffect(() => {
    checkAchievements();
    // Check for new sticker unlocks
    const newStickers = checkStickerUnlocks({
      highestLevel, totalLinesCleared, bestCombo, totalGamesPlayed, longestStreak, totalScore, collectedStickers,
    });
    for (const id of newStickers) {
      collectSticker(id);
    }
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
    // Check for offline/idle rewards (>30 min away)
    if (lastPlayDate) {
      const lastPlayMs = new Date(lastPlayDate).getTime();
      const nowMs = Date.now();
      const reward = calculateOfflineReward(lastPlayMs, nowMs, highestLevel);
      if (reward) {
        setOfflineReward(reward);
        const timer = setTimeout(() => setShowOfflineReward(true), 2500);
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

    // DROP glow pulse
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            CHROMA
          </Animated.Text>
          <Animated.View style={[styles.blastRow, { transform: [{ scale: blastScale }], opacity: blastGlow }]}>
            <View style={styles.titleDeco} />
            <Text style={styles.titleAccent}>DROP</Text>
            <View style={styles.titleDeco} />
          </Animated.View>
          {/* Subtitle tagline */}
          <Animated.Text style={[styles.tagline, { opacity: statsOpacity }]}>
            Drop \u2022 Clear \u2022 Climb
          </Animated.Text>
        </View>

        {/* Lives display */}
        <Animated.View style={[styles.livesRow, { opacity: statsOpacity }]}>
          <LivesDisplay />
        </Animated.View>

        {/* Skill Rating badge */}
        {isFeatureUnlocked('skill_rating', highestLevel) && (
          <Animated.View style={[styles.srRow, { opacity: statsOpacity }]}>
            <SkillRatingDisplay compact />
          </Animated.View>
        )}

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

          {/* Daily Puzzle — one shared seed per day. Shows today's status
              (not played / played with score) and launches the run-until-
              stuck game. Visible to everyone — no feature gate — because
              it's the primary retention hook. */}
          {(() => {
            const todayId = getDailyPuzzleId();
            const playedToday = dailyPuzzleLastPlayedId === todayId;
            // nowTick ticks every 30s (for the VIP/offer cards above) —
            // reuse it so this countdown stays fresh without an extra
            // interval. Daily banner only needs minute-level accuracy.
            // nowTick re-renders this block every 30s so the countdown stays fresh
            const _tick = nowTick;
            const countdownLabel = formatCountdown(getMsUntilNextPuzzle());
            const label = playedToday
              ? `Puzzle \u00b7 ${getDailyPuzzleLabel()} \u00b7 ${dailyPuzzleLastPlayedScore} pts \u00b7 Next in ${countdownLabel}`
              : `Today's Puzzle \u00b7 ${getDailyPuzzleLabel()}`;
            const streakLabel = dailyPuzzleStreak > 1 ? ` \u00b7 ${dailyPuzzleStreak}\u2013day streak` : '';
            return (
              <TouchableOpacity
                style={[
                  styles.seasonBanner,
                  {
                    borderColor: playedToday ? `${COLORS.accent}30` : `${COLORS.accent}60`,
                    backgroundColor: playedToday ? `${COLORS.accent}10` : `${COLORS.accent}20`,
                  },
                ]}
                onPress={() => {
                  if (playedToday) {
                    setShowDailyStats(true);
                  } else {
                    navigation.navigate('Game', { level: 0, daily: true });
                  }
                }}
                activeOpacity={0.75}
              >
                <GameIcon name="gift" size={14} color={COLORS.accent} />
                <Text style={[styles.seasonText, { color: COLORS.accent }]}>
                  {label}{streakLabel}
                </Text>
              </TouchableOpacity>
            );
          })()}

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

          {/* Promotional banner — show ONLY the highest-priority active
              offer at a time. Stacking Starter Pack + Flash Offer + Daily
              Deal simultaneously made the home screen feel like slot-
              machine spam. Priority: Starter Pack (one-time, new players)
              > Flash Offer (rotating limited deal) > Daily Deal. */}
          {(() => {
            const shopUnlocked = isFeatureUnlocked('shop', highestLevel);
            if (starterPackVisible) {
              return (
                <TouchableOpacity
                  style={styles.starterBanner}
                  onPress={() => setShowStarterPack(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dealBannerLeft}>
                    <GameIcon name="gift" size={22} color={COLORS.accent} />
                    <View>
                      <Text style={styles.starterBannerTitle}>Starter Pack — 88% OFF</Text>
                      <Text style={styles.dealBannerSub}>One-time offer. Tap to claim!</Text>
                    </View>
                  </View>
                  <View style={styles.starterBannerArrow}>
                    <Text style={styles.dealBannerArrowText}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (shopUnlocked && currentFlashOffer) {
              return (
                <TouchableOpacity
                  style={styles.flashBanner}
                  onPress={() => setShowFlashOffer(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dealBannerLeft}>
                    <GameIcon
                      name={currentFlashOffer.icon as any}
                      size={22}
                      color={currentFlashOffer.accentColor}
                    />
                    <View>
                      <Text
                        style={[styles.flashBannerTitle, { color: currentFlashOffer.accentColor }]}
                      >
                        {currentFlashOffer.name} — {currentFlashOffer.discount}% off
                      </Text>
                      <Text style={styles.dealBannerSub}>Flash offer ends soon</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.flashBannerArrow,
                      { backgroundColor: `${currentFlashOffer.accentColor}30` },
                    ]}
                  >
                    <Text
                      style={[styles.dealBannerArrowText, { color: currentFlashOffer.accentColor }]}
                    >
                      ›
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (shopUnlocked && !isDealClaimed(lastDealClaimed)) {
              return (
                <TouchableOpacity
                  style={styles.dealBanner}
                  onPress={() => setShowDailyDeal(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dealBannerLeft}>
                    <GameIcon name="gift" size={22} color={COLORS.accentGold} />
                    <View>
                      <Text style={styles.dealBannerTitle}>Daily Deal</Text>
                      <Text style={styles.dealBannerSub}>
                        {getTodaysDeal().name} — {getTodaysDeal().discountPercent}% off
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dealBannerArrow}>
                    <Text style={styles.dealBannerArrowText}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            return null;
          })()}

          {/* Live event banners */}
          <EventBanner />

          {/* ── Hub Buttons ──────────────────────────────── */}
          <View style={styles.hubButtonRow}>
            <TouchableOpacity style={styles.hubButton} onPress={() => setShowRewardsHub(true)}>
              <View style={[styles.hubIconWrap, { backgroundColor: `${COLORS.accentGold}18` }]}>
                <GameIcon name="gift" size={20} color={COLORS.accentGold} />
                {(freeChestReady || canSpin || rouletteAvailable) && <View style={styles.hubDot} />}
              </View>
              <Text style={styles.hubButtonLabel}>Rewards</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.hubButton} onPress={() => setShowCompeteHub(true)}>
              <View style={[styles.hubIconWrap, { backgroundColor: 'rgba(96,165,250,0.12)' }]}>
                <GameIcon name="trophy" size={20} color="#60A5FA" />
                {!!activeTournament && <View style={styles.hubDot} />}
              </View>
              <Text style={styles.hubButtonLabel}>Compete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.hubButton} onPress={() => setShowShopHub(true)}>
              <View style={[styles.hubIconWrap, { backgroundColor: `${COLORS.accent}15` }]}>
                <GameIcon name="shop" size={20} color={COLORS.accent} />
                {vipActive && <View style={[styles.hubDot, { backgroundColor: '#FACC15' }]} />}
              </View>
              <Text style={styles.hubButtonLabel}>Shop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.hubButton} onPress={() => setShowMoreHub(true)}>
              <View style={[styles.hubIconWrap, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
                <GameIcon name="grid" size={20} color="#A78BFA" />
                {unclaimedCount > 0 && <View style={styles.hubDot} />}
              </View>
              <Text style={styles.hubButtonLabel}>More</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom utility row */}
          <View style={styles.utilRow}>
            <TouchableOpacity style={styles.utilButton} onPress={() => setShowProfile(true)}>
              <GameIcon name="gamepad" size={14} color={COLORS.textMuted} />
              <Text style={styles.utilText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilButton} onPress={() => setShowShowcase(true)}>
              <GameIcon name="medal-gold" size={14} color={COLORS.textMuted} />
              <Text style={styles.utilText}>Showcase</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilButton} onPress={() => setShowStats(true)}>
              <GameIcon name="grid" size={14} color={COLORS.textMuted} />
              <Text style={styles.utilText}>Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilButton} onPress={() => navigation.navigate('Settings')}>
              <GameIcon name="gear" size={14} color={COLORS.textMuted} />
              <Text style={styles.utilText}>Settings</Text>
            </TouchableOpacity>
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

        <Text style={styles.versionText}>v1.0.0</Text>
      </ScrollView>

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

      {/* Sticker Album modal */}
      <StickerAlbumModal
        visible={showAlbum}
        onClose={() => setShowAlbum(false)}
      />

      {/* Login calendar modal */}
      <LoginCalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
      />

      {/* Daily deal modal */}
      <DailyDealModal
        visible={showDailyDeal}
        onClose={() => setShowDailyDeal(false)}
      />

      {/* Boss Rush modal */}
      <BossRushModal
        visible={showBossRush}
        onClose={() => setShowBossRush(false)}
        onStart={() => {
          setShowBossRush(false);
          // Start with the first boss level
          navigation.navigate('Game', { level: 25 });
        }}
      />

      {/* Treasure Hunt modal */}
      <TreasureHuntModal
        visible={showTreasure}
        onClose={() => setShowTreasure(false)}
      />

      {/* Leaderboard modal */}
      <LeaderboardModal
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Tournament modal */}
      <TournamentModal
        visible={showTournament}
        onClose={() => setShowTournament(false)}
      />

      {/* Inbox modal */}
      <InboxModal
        visible={showInbox}
        onClose={() => setShowInbox(false)}
      />

      {/* VIP modal */}
      <VIPModal
        visible={showVIP}
        onClose={() => setShowVIP(false)}
      />

      {/* Quest Chains modal */}
      <QuestChainModal
        visible={showQuestChains}
        onClose={() => setShowQuestChains(false)}
      />

      {/* Power-Up Fusion modal */}
      <PowerUpFusionModal
        visible={showFusion}
        onClose={() => setShowFusion(false)}
      />

      {/* Seasonal Event modal */}
      <SeasonalEventModal
        visible={showSeasonalEvent}
        onClose={() => setShowSeasonalEvent(false)}
      />

      {/* Mystery Shop modal */}
      <MysteryShopModal
        visible={showMysteryShop}
        onClose={() => setShowMysteryShop(false)}
      />

      {/* Block Mastery modal */}
      <BlockMasteryModal
        visible={showBlockMastery}
        onClose={() => setShowBlockMastery(false)}
      />

      {/* Daily Roulette modal */}
      <DailyRouletteModal
        visible={showDailyRoulette}
        onClose={() => setShowDailyRoulette(false)}
      />

      {/* Daily Puzzle stats modal */}
      <DailyStatsModal
        visible={showDailyStats}
        onClose={() => setShowDailyStats(false)}
      />

      {/* Offline reward modal */}
      <OfflineRewardModal
        visible={showOfflineReward}
        reward={offlineReward}
        onClaim={() => {
          if (offlineReward) {
            addCoins(offlineReward.coins);
          }
          setShowOfflineReward(false);
        }}
      />

      {/* Achievement Showcase modal */}
      <AchievementShowcase
        visible={showShowcase}
        onClose={() => setShowShowcase(false)}
      />

      {/* Streak Milestone modal */}
      <StreakMilestoneModal
        visible={showStreakMilestone}
        milestone={streakMilestone}
        onClose={() => setShowStreakMilestone(false)}
      />

      {/* Starter Pack monetization modal */}
      <StarterPackModal
        visible={showStarterPack}
        onClose={() => setShowStarterPack(false)}
      />

      {/* Flash Offer monetization modal */}
      <FlashOfferModal
        visible={showFlashOffer}
        onClose={() => setShowFlashOffer(false)}
      />

      {/* Free Chest retention modal */}
      <FreeChestModal
        visible={showFreeChest}
        onClose={() => setShowFreeChest(false)}
      />

      {/* ── Hub Sub-Menus ──────────────────────────────── */}
      <HubMenuModal visible={showRewardsHub} onClose={() => setShowRewardsHub(false)} title="REWARDS" accent={COLORS.accentGold}>
        <FeatureTile icon="gift" label={freeChestReady ? 'Open!' : 'Free Chest'} onPress={() => { setShowRewardsHub(false); setShowFreeChest(true); }} accent={COLORS.accentGold} active={freeChestReady} />
        {isFeatureUnlocked('lucky_spin', highestLevel) && (
          <FeatureTile icon="star" label={canSpin ? 'Spin!' : 'Lucky Spin'} onPress={() => { setShowRewardsHub(false); setShowSpin(true); }} accent="#FACC15" active={canSpin} />
        )}
        <FeatureTile icon="target" label={rouletteAvailable ? 'Spin Now' : 'Roulette'} onPress={() => { setShowRewardsHub(false); setShowDailyRoulette(true); }} accent="#A78BFA" active={rouletteAvailable} />
        <FeatureTile icon="calendar" label="Calendar" onPress={() => { setShowRewardsHub(false); setShowCalendar(true); }} accent={COLORS.info} />
        {isFeatureUnlocked('daily_challenge', highestLevel) && (
          <FeatureTile icon="fire" label="Daily Quests" onPress={() => { setShowRewardsHub(false); navigation.navigate('DailyChallenge'); }} accent="#FB923C" />
        )}
      </HubMenuModal>

      <HubMenuModal visible={showCompeteHub} onClose={() => setShowCompeteHub(false)} title="COMPETE" accent="#60A5FA">
        {isFeatureUnlocked('achievements', highestLevel) && (
          <FeatureTile icon="trophy" label="Trophies" onPress={() => { setShowCompeteHub(false); setShowAchievements(true); }} accent={COLORS.accentGold} />
        )}
        {isFeatureUnlocked('battle_pass', highestLevel) && (
          <FeatureTile icon="medal-gold" label="Season Pass" onPress={() => { setShowCompeteHub(false); navigation.navigate('BattlePass'); }} accent="#60A5FA" />
        )}
        {activeSeason && (
          <FeatureTile icon={activeSeason.icon as any} label={activeSeason.name} onPress={() => { setShowCompeteHub(false); setShowSeasonalEvent(true); }} accent={activeSeason.color} active />
        )}
        {getHighestTier(highestLevel) !== null && (
          <FeatureTile icon="lightning" label={activeTournament ? 'Live Cup' : 'Tournament'} onPress={() => { setShowCompeteHub(false); setShowTournament(true); }} accent="#F472B6" active={!!activeTournament} />
        )}
        {isFeatureUnlocked('weekly_challenge', highestLevel) && (
          <FeatureTile icon="grid" label="Leaderboard" onPress={() => { setShowCompeteHub(false); setShowLeaderboard(true); }} accent="#A78BFA" />
        )}
      </HubMenuModal>

      <HubMenuModal visible={showShopHub} onClose={() => setShowShopHub(false)} title="SHOP & VIP" accent={COLORS.accent}>
        {isFeatureUnlocked('shop', highestLevel) && (
          <FeatureTile icon="shop" label="Shop" onPress={() => { setShowShopHub(false); navigation.navigate('Shop'); }} accent={COLORS.accent} />
        )}
        <FeatureTile icon="crown" label={vipActive ? 'VIP Active' : 'Go VIP'} onPress={() => { setShowShopHub(false); setShowVIP(true); }} accent="#FACC15" active={vipActive} />
        {isFeatureUnlocked('piggy_bank', highestLevel) && (
          <FeatureTile icon="coin" label={piggyBankCoins > 0 ? `Bank (${formatCompact(piggyBankCoins)})` : 'Piggy Bank'} onPress={() => { setShowShopHub(false); setShowPiggyBank(true); }} accent="#34D399" active={piggyBankCoins >= 100} />
        )}
        <FeatureTile icon="gem" label="Mystery" onPress={() => { setShowShopHub(false); setShowMysteryShop(true); }} accent="#C084FC" />
      </HubMenuModal>

      <HubMenuModal visible={showMoreHub} onClose={() => setShowMoreHub(false)} title="MORE" accent="#A78BFA">
        {isBossRushUnlocked(highestLevel) && (
          <FeatureTile icon="bomb" label="Boss Rush" onPress={() => { setShowMoreHub(false); setShowBossRush(true); }} accent="#EF4444" />
        )}
        {isFeatureUnlocked('shop', highestLevel) && (
          <FeatureTile icon="map" label={treasureMapPieces >= PIECES_REQUIRED ? 'Dig!' : `Map ${Math.min(treasureMapPieces, PIECES_REQUIRED)}/${PIECES_REQUIRED}`} onPress={() => { setShowMoreHub(false); setShowTreasure(true); }} accent="#22C55E" active={treasureMapPieces >= PIECES_REQUIRED} />
        )}
        <FeatureTile icon="fire" label="Mastery" onPress={() => { setShowMoreHub(false); setShowBlockMastery(true); }} accent="#FB923C" />
        {isFeatureUnlocked('power_ups', highestLevel) && (
          <FeatureTile icon="palette" label="Power Fuse" onPress={() => { setShowMoreHub(false); setShowFusion(true); }} accent="#F472B6" />
        )}
        <FeatureTile icon="book" label="Quests" onPress={() => { setShowMoreHub(false); setShowQuestChains(true); }} accent="#60A5FA" />
        {isFeatureUnlocked('achievements', highestLevel) && (
          <FeatureTile icon="book" label="Album" onPress={() => { setShowMoreHub(false); setShowAlbum(true); }} accent="#34D399" />
        )}
        <FeatureTile icon="film" label={unclaimedCount > 0 ? `Inbox (${unclaimedCount})` : 'Inbox'} onPress={() => { setShowMoreHub(false); setShowInbox(true); }} accent={COLORS.info} badge={unclaimedCount > 0 ? String(unclaimedCount) : undefined} />
      </HubMenuModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 20,
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
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.md,
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
  hubButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.sm,
    gap: 8,
  },
  hubButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  hubIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.surfaceBorder}80`,
    position: 'relative',
  },
  hubDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  hubButtonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  utilRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: SPACING.md,
    paddingVertical: 8,
  },
  utilButton: {
    alignItems: 'center',
    gap: 3,
  },
  utilText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  dealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.md,
    backgroundColor: `${COLORS.accentGold}12`,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}35`,
    width: '100%',
  },
  dealBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dealBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.accentGold,
    letterSpacing: 0.5,
  },
  dealBannerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dealBannerArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.accentGold}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealBannerArrowText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.accentGold,
    marginTop: -3,
  },
  starterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADII.md,
    backgroundColor: `${COLORS.accent}18`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}55`,
    width: '100%',
    marginTop: 6,
  },
  starterBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  starterBannerArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.accent}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.md,
    backgroundColor: `${COLORS.surface}C0`,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    width: '100%',
    marginTop: 6,
  },
  flashBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  flashBannerArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  versionText: {
    fontSize: 10,
    fontWeight: '600',
    color: `${COLORS.textMuted}60`,
    textAlign: 'center',
    marginTop: SPACING.lg,
    letterSpacing: 0.5,
  },
  livesRow: {
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  srRow: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
