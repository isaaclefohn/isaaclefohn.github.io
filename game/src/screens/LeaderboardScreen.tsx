/**
 * Leaderboard screen with tabs for weekly and daily rankings.
 * Premium visual styling with animated entrances, podium cards, and rank badges.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Button } from '../components/common/Button';
import { GameIcon, IconName } from '../components/GameIcon';
import { fetchLeaderboard, LeaderboardEntry } from '../services/leaderboard';
import { COLORS, SHADOWS, SPACING, RADII } from '../utils/constants';
import { formatScore } from '../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type LeaderboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Leaderboard'>;
};

type LeaderboardTab = 'weekly' | 'daily';

const PODIUM_BORDER_COLORS = [COLORS.accentGold, '#C0C0C0', '#CD7F32'];
const PODIUM_BG_COLORS = [`${COLORS.accentGold}10`, 'rgba(192,192,192,0.06)', 'rgba(205,127,50,0.06)'];
const MEDAL_ICONS: IconName[] = ['medal-gold', 'medal-silver', 'medal-bronze'];

/** Animated wrapper for each leaderboard entry row */
const AnimatedEntry: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 600);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Header animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, headerSlide]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const weekId = getWeekId();

    const id = activeTab === 'weekly' ? weekId : today;
    const data = await fetchLeaderboard(activeTab, id, 50);
    setEntries(data);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isTopThree = index < 3;

    return (
      <AnimatedEntry index={index}>
        <View
          style={[
            styles.entryRow,
            isTopThree && {
              borderWidth: 1.5,
              borderColor: PODIUM_BORDER_COLORS[index],
              backgroundColor: PODIUM_BG_COLORS[index],
              ...SHADOWS.medium,
              paddingVertical: SPACING.md,
            },
            !isTopThree && styles.regularRow,
          ]}
        >
          <View style={[styles.rankContainer, isTopThree && styles.podiumRankContainer]}>
            {isTopThree ? (
              <GameIcon name={MEDAL_ICONS[index]} size={28} />
            ) : (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{item.rank || index + 1}</Text>
              </View>
            )}
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, isTopThree && styles.topThreeName]} numberOfLines={1}>
              {item.displayName || 'Player'}
            </Text>
          </View>
          <Text style={[styles.score, isTopThree && styles.topThreeScore]}>
            {formatScore(item.score)}
          </Text>
        </View>
      </AnimatedEntry>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <GameIcon name="trophy" size={64} />
        <Text style={styles.emptyTitle}>No entries yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to claim the top spot!
        </Text>
        <Text style={styles.emptyHint}>
          Play levels to earn your place on the leaderboard.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <View style={styles.headerTitleRow}>
          <GameIcon name="trophy" size={22} />
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <View style={{ width: 60 }} />
      </Animated.View>

      {/* Tabs -- pill/capsule style */}
      <View style={styles.tabBarOuter}>
        <View style={styles.tabBar}>
          {(['weekly', 'daily'] as LeaderboardTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'weekly' ? 'This Week' : 'Today'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      )}

      {/* Entries */}
      {!loading && (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item, i) => `${item.userId}-${i}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

/** Get a week identifier string (year-week) */
function getWeekId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },

  /* Tab bar -- pill/capsule style matching ShopScreen */
  tabBarOuter: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.round,
    padding: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADII.round,
  },
  activeTab: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.small,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  /* List */
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  /* Entry rows */
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    padding: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  regularRow: {
    ...SHADOWS.small,
  },
  podiumRankContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: RADII.round,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  nameContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  topThreeName: {
    fontWeight: '700',
    fontSize: 17,
  },
  score: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  topThreeScore: {
    color: COLORS.accentGold,
    fontWeight: '800',
    fontSize: 17,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
