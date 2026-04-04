/**
 * Level selection screen with animated grid, premium cards, and smooth entrance.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getTotalLevels, isBossLevel } from '../game/levels/LevelGenerator';
import { Button } from '../components/common/Button';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { GameIcon } from '../components/GameIcon';
import { COLORS, SHADOWS, RADII, SPACING } from '../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type LevelSelectScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LevelSelect'>;
};

interface LevelItem {
  level: number;
  stars: number;
  unlocked: boolean;
  isBoss: boolean;
}

const LevelCard: React.FC<{
  item: LevelItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = (item.level % 5) * 50;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        style={[
          styles.levelCard,
          item.unlocked && styles.levelUnlocked,
          item.isBoss && item.unlocked && styles.levelBoss,
          !item.unlocked && styles.levelLocked,
        ]}
        onPress={item.unlocked ? onPress : undefined}
        disabled={!item.unlocked}
        activeOpacity={0.7}
      >
        {item.isBoss && item.unlocked && (
          <View style={styles.bossGlow} />
        )}
        {item.unlocked ? (
          <Text style={styles.levelNumber}>{item.level}</Text>
        ) : (
          <GameIcon name="lock" size={16} />
        )}
        {item.unlocked && (
          <View style={styles.starsRow}>
            {[1, 2, 3].map((s) => (
              <GameIcon key={s} name={s <= item.stars ? 'star' : 'star-outline'} size={11} />
            ))}
          </View>
        )}
        {item.isBoss && item.unlocked && (
          <View style={styles.bossTag}>
            <Text style={styles.bossLabel}>BOSS</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({ navigation }) => {
  const { highestLevel, levelStars, coins, gems } = usePlayerStore();
  const totalLevels = getTotalLevels();

  // Header entrance animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const levels = useMemo<LevelItem[]>(() => {
    const items: LevelItem[] = [];
    for (let i = 1; i <= totalLevels; i++) {
      items.push({
        level: i,
        stars: levelStars[i] ?? 0,
        unlocked: i <= highestLevel + 1,
        isBoss: isBossLevel(i),
      });
    }
    return items;
  }, [highestLevel, levelStars, totalLevels]);

  // Progress stats
  const totalStars = Object.values(levelStars).reduce((sum, s) => sum + s, 0);
  const maxStars = totalLevels * 3;

  const renderLevel = ({ item }: { item: LevelItem }) => (
    <LevelCard
      item={item}
      onPress={() => navigation.navigate('Game', { level: item.level })}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
        <Button title="‹" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Levels</Text>
        <CurrencyDisplay coins={coins} gems={gems} compact />
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min((totalStars / maxStars) * 100, 100)}%` }]} />
        </View>
        <View style={styles.progressTextRow}>
          <GameIcon name="star" size={12} />
          <Text style={styles.progressText}>
            {totalStars}/{maxStars}
          </Text>
        </View>
      </View>

      <FlatList
        data={levels}
        renderItem={renderLevel}
        keyExtractor={(item) => String(item.level)}
        numColumns={5}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={Math.max(0, Math.floor(highestLevel / 5) - 2)}
        getItemLayout={(_, index) => ({
          length: 84,
          offset: 84 * Math.floor(index / 5),
          index,
        })}
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accentGold,
    borderRadius: RADII.round,
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  grid: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelCard: {
    width: 64,
    height: 72,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  levelUnlocked: {
    borderColor: COLORS.surfaceBorder,
  },
  levelLocked: {
    opacity: 0.35,
    borderColor: 'transparent',
  },
  levelBoss: {
    borderWidth: 2,
    borderColor: COLORS.accentGold,
    backgroundColor: `${COLORS.accentGold}10`,
  },
  bossGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}40`,
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 1,
  },
  bossTag: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accentGold,
    borderRadius: RADII.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bossLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: COLORS.background,
    letterSpacing: 0.5,
  },
});
