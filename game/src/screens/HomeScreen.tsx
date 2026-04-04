/**
 * Premium home screen with animated title, rich stats, and polished layout.
 * All buttons visible, labeled with icons, sensibly aligned.
 * Inspired by Block Blast / Candy Crush / Royal Kingdom but unique.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing, Dimensions } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '../components/common/Button';
import { Tutorial } from '../components/Tutorial';
import { GameIcon } from '../components/GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import { formatCompact } from '../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { highestLevel, coins, gems, totalScore, currentStreak } = usePlayerStore();
  const { tutorialCompleted, completeTutorial } = useSettingsStore();
  const [showTutorial, setShowTutorial] = useState(!tutorialCompleted);

  // Entrance animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(-30)).current;
  const blastScale = useRef(new Animated.Value(0.5)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(40)).current;
  const blastGlow = useRef(new Animated.Value(0.6)).current;
  const decorPulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(blastGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blastGlow, { toValue: 0.6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
      {/* Decorative background orbs */}
      <Animated.View style={[styles.decorOrb, styles.decorOrb1, { opacity: decorPulse }]} />
      <Animated.View style={[styles.decorOrb, styles.decorOrb2, { opacity: decorPulse }]} />

      <View style={styles.content}>
        {/* Animated Title */}
        <View style={styles.titleContainer}>
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
        </View>

        {/* Stats bar */}
        <Animated.View style={[styles.statsBar, { opacity: statsOpacity }]}>
          <View style={styles.statItem}>
            <GameIcon name="coin" size={18} />
            <Text style={styles.statValue}>{formatCompact(coins)}</Text>
            <Text style={styles.statLabel}>COINS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <GameIcon name="gem" size={18} />
            <Text style={styles.statValue}>{formatCompact(gems)}</Text>
            <Text style={styles.statLabel}>GEMS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <GameIcon name="star" size={18} />
            <Text style={styles.statValue}>{formatCompact(totalScore)}</Text>
            <Text style={styles.statLabel}>SCORE</Text>
          </View>
          {currentStreak > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <GameIcon name="fire" size={18} />
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>STREAK</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* Main buttons */}
        <Animated.View
          style={[
            styles.buttonGroup,
            { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslate }] },
          ]}
        >
          {/* Primary play button - full width, large */}
          <View style={styles.playButtonWrap}>
            <Button
              title={highestLevel > 0 ? `Continue  \u2022  Level ${highestLevel + 1}` : 'Play'}
              onPress={() => navigation.navigate('Game', { level: highestLevel > 0 ? highestLevel + 1 : 1 })}
              variant="primary"
              size="large"
              style={styles.mainButton}
            />
            {/* Glow ring around play button */}
            <View style={styles.playGlow} />
          </View>

          {/* Secondary row - Daily Challenge + Level Select */}
          <View style={styles.secondaryRow}>
            <Button
              title="Daily"
              onPress={() => navigation.navigate('DailyChallenge')}
              variant="secondary"
              size="medium"
              style={styles.halfButton}
            />
            <Button
              title="Levels"
              onPress={() => navigation.navigate('LevelSelect')}
              variant="secondary"
              size="medium"
              style={styles.halfButton}
            />
          </View>

          {/* Bottom row - Shop, Leaderboard, Settings - evenly spaced */}
          <View style={styles.bottomRow}>
            <View style={styles.bottomButtonWrapper}>
              <Button
                title="Shop"
                onPress={() => navigation.navigate('Shop')}
                variant="ghost"
                size="small"
                style={styles.bottomButton}
              />
            </View>
            <View style={styles.bottomButtonWrapper}>
              <Button
                title="Rankings"
                onPress={() => navigation.navigate('Leaderboard')}
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
        </Animated.View>

        {/* Level indicator */}
        {highestLevel > 0 && (
          <Animated.View style={[styles.levelIndicatorRow, { opacity: buttonsOpacity }]}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LVL {highestLevel}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
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
    width: 200,
    height: 200,
    backgroundColor: COLORS.accent,
    top: -60,
    right: -50,
    opacity: 0.06,
  },
  decorOrb2: {
    width: 160,
    height: 160,
    backgroundColor: COLORS.accentGold,
    bottom: 40,
    left: -40,
    opacity: 0.04,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: SCREEN_WIDTH < 375 ? 38 : 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  blastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleAccent: {
    fontSize: SCREEN_WIDTH < 375 ? 46 : 56,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 10,
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleDeco: {
    width: 28,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    opacity: 0.6,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.medium,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  statDivider: {
    width: 1,
    height: 32,
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
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: RADII.lg + 2,
    borderWidth: 1.5,
    borderColor: `${COLORS.accent}40`,
    zIndex: -1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  halfButton: {
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
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
});
