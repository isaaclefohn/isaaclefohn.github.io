/**
 * Premium home screen with animated title, rich stats, and polished layout.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { Button } from '../components/common/Button';
import { Tutorial } from '../components/Tutorial';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import { formatCompact } from '../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { highestLevel, coins, gems, totalScore } = usePlayerStore();
  const [showTutorial, setShowTutorial] = useState(highestLevel === 0);

  // Entrance animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(-30)).current;
  const blastScale = useRef(new Animated.Value(0.5)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(40)).current;
  // Subtle pulsing glow on BLAST text
  const blastGlow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Staggered entrance
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

    // Pulse the BLAST glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(blastGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blastGlow, { toValue: 0.6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
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
          <Animated.Text
            style={[
              styles.titleAccent,
              {
                transform: [{ scale: blastScale }],
                opacity: blastGlow,
              },
            ]}
          >
            BLAST
          </Animated.Text>
        </View>

        {/* Stats bar */}
        <Animated.View style={[styles.statsBar, { opacity: statsOpacity }]}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🪙</Text>
            <Text style={styles.statValue}>{formatCompact(coins)}</Text>
            <Text style={styles.statLabel}>COINS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💎</Text>
            <Text style={styles.statValue}>{formatCompact(gems)}</Text>
            <Text style={styles.statLabel}>GEMS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{formatCompact(totalScore)}</Text>
            <Text style={styles.statLabel}>SCORE</Text>
          </View>
        </Animated.View>

        {/* Main buttons */}
        <Animated.View
          style={[
            styles.buttonGroup,
            { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslate }] },
          ]}
        >
          <Button
            title={highestLevel > 0 ? `Level ${highestLevel + 1}` : 'Play'}
            icon={highestLevel > 0 ? '▶' : '▶'}
            onPress={() => navigation.navigate('Game', { level: highestLevel > 0 ? highestLevel + 1 : 1 })}
            variant="primary"
            size="large"
            style={styles.mainButton}
          />

          <View style={styles.secondaryRow}>
            <Button
              title="Daily"
              icon="📅"
              onPress={() => navigation.navigate('DailyChallenge')}
              variant="secondary"
              size="medium"
              style={styles.halfButton}
            />
            <Button
              title="Levels"
              icon="🗺"
              onPress={() => navigation.navigate('LevelSelect')}
              variant="secondary"
              size="medium"
              style={styles.halfButton}
            />
          </View>

          <View style={styles.bottomRow}>
            <Button
              title="Shop"
              icon="🛒"
              onPress={() => navigation.navigate('Shop')}
              variant="ghost"
              size="small"
            />
            <Button
              title="Ranks"
              icon="🏆"
              onPress={() => navigation.navigate('Leaderboard')}
              variant="ghost"
              size="small"
            />
            <Button
              title="Settings"
              icon="⚙️"
              onPress={() => navigation.navigate('Settings')}
              variant="ghost"
              size="small"
            />
          </View>
        </Animated.View>

        {/* Level indicator */}
        {highestLevel > 0 && (
          <Animated.Text style={[styles.levelIndicator, { opacity: buttonsOpacity }]}>
            Highest Level: {highestLevel}
          </Animated.Text>
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleAccent: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 10,
    marginTop: -6,
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.surfaceBorder,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  mainButton: {
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  halfButton: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.xs,
  },
  levelIndicator: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    letterSpacing: 1,
  },
});
