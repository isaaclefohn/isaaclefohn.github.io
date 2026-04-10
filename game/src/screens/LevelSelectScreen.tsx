/**
 * Level selection screen with themed world sections, animated grid, and premium cards.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getTotalLevels, isBossLevel } from '../game/levels/LevelGenerator';
import { WORLDS, getWorldForLevel, isWorldUnlocked, World } from '../game/levels/Worlds';
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

interface WorldSection {
  world: World;
  worldUnlocked: boolean;
  starsEarned: number;
  starsTotal: number;
  data: LevelItem[][];  // Rows of 5
}

const LevelCard: React.FC<{
  item: LevelItem;
  worldColor: string;
  onPress: () => void;
}> = ({ item, worldColor, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.levelCard,
        item.unlocked && styles.levelUnlocked,
        item.isBoss && item.unlocked && [styles.levelBoss, { borderColor: worldColor }],
        !item.unlocked && styles.levelLocked,
      ]}
      onPress={item.unlocked ? onPress : undefined}
      disabled={!item.unlocked}
      activeOpacity={0.7}
    >
      {item.isBoss && item.unlocked && (
        <View style={[styles.bossGlow, { borderColor: `${worldColor}40` }]} />
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
        <View style={[styles.bossTag, { backgroundColor: worldColor }]}>
          <Text style={styles.bossLabel}>BOSS</Text>
        </View>
      )}
      {/* Replay indicator for completed levels with < 3 stars */}
      {item.unlocked && item.stars > 0 && item.stars < 3 && (
        <View style={styles.replayDot} />
      )}
    </TouchableOpacity>
  );
};

const LevelRow: React.FC<{
  items: LevelItem[];
  worldColor: string;
  onLevelPress: (level: number) => void;
}> = ({ items, worldColor, onLevelPress }) => (
  <View style={styles.gridRow}>
    {items.map((item) => (
      <LevelCard
        key={item.level}
        item={item}
        worldColor={worldColor}
        onPress={() => onLevelPress(item.level)}
      />
    ))}
    {/* Pad empty slots if row has fewer than 5 */}
    {Array.from({ length: 5 - items.length }).map((_, i) => (
      <View key={`empty-${i}`} style={styles.levelCardEmpty} />
    ))}
  </View>
);

const WorldHeader: React.FC<{ world: World; unlocked: boolean; starsEarned: number; starsTotal: number }> = ({
  world, unlocked, starsEarned, starsTotal,
}) => (
  <View style={[styles.worldHeader, { borderLeftColor: world.color }]}>
    <View style={styles.worldHeaderLeft}>
      <View style={[styles.worldIcon, { backgroundColor: `${world.color}20` }]}>
        <GameIcon name={world.icon as any} size={18} color={world.color} />
      </View>
      <View>
        <Text style={[styles.worldName, !unlocked && styles.worldNameLocked]}>
          {unlocked ? world.name : '???'}
        </Text>
        <Text style={styles.worldSubtitle}>{world.subtitle}</Text>
      </View>
    </View>
    <View style={styles.worldStars}>
      <GameIcon name="star" size={12} color={world.color} />
      <Text style={[styles.worldStarsText, { color: world.color }]}>
        {starsEarned}/{starsTotal}
      </Text>
    </View>
  </View>
);

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

  const sections = useMemo<WorldSection[]>(() => {
    return WORLDS.map((world) => {
      const levels: LevelItem[] = [];
      let starsEarned = 0;
      for (let i = world.levelStart; i <= Math.min(world.levelEnd, totalLevels); i++) {
        const stars = levelStars[i] ?? 0;
        starsEarned += stars;
        levels.push({
          level: i,
          stars,
          unlocked: i <= highestLevel + 1,
          isBoss: isBossLevel(i),
        });
      }

      // Chunk into rows of 5
      const rows: LevelItem[][] = [];
      for (let i = 0; i < levels.length; i += 5) {
        rows.push(levels.slice(i, i + 5));
      }

      return {
        world,
        worldUnlocked: isWorldUnlocked(world, highestLevel),
        starsEarned,
        starsTotal: (world.levelEnd - world.levelStart + 1) * 3,
        data: rows,
      };
    });
  }, [highestLevel, levelStars, totalLevels]);

  // Progress stats
  const totalStars = Object.values(levelStars).reduce((sum, s) => sum + s, 0);
  const maxStars = totalLevels * 3;

  const handleLevelPress = (level: number) => {
    navigation.navigate('Game', { level });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
        <Button title={'\u2039'} onPress={() => navigation.goBack()} variant="ghost" size="small" />
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

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `row-${index}-${item[0]?.level}`}
        renderItem={({ item, section }) => (
          <LevelRow
            items={item}
            worldColor={section.world.color}
            onLevelPress={handleLevelPress}
          />
        )}
        renderSectionHeader={({ section }) => (
          <WorldHeader
            world={section.world}
            unlocked={section.worldUnlocked}
            starsEarned={section.starsEarned}
            starsTotal={section.starsTotal}
          />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  // World headers
  worldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 4,
    backgroundColor: `${COLORS.surface}C0`,
    borderRadius: RADII.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  worldHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  worldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  worldNameLocked: {
    color: COLORS.textMuted,
  },
  worldSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  worldStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  worldStarsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  // Level cards
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
  levelCardEmpty: {
    width: 64,
    height: 72,
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
  replayDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGold,
  },
});
