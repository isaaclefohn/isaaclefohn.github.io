/**
 * Level selection screen with a scrollable grid of levels.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getTotalLevels, isBossLevel } from '../game/levels/LevelGenerator';
import { Button } from '../components/common/Button';
import { COLORS } from '../utils/constants';
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

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({ navigation }) => {
  const { highestLevel, levelStars } = usePlayerStore();
  const totalLevels = getTotalLevels();

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

  const renderLevel = ({ item }: { item: LevelItem }) => (
    <TouchableOpacity
      style={[
        styles.levelCard,
        item.unlocked && styles.levelUnlocked,
        item.isBoss && styles.levelBoss,
      ]}
      onPress={() => item.unlocked && navigation.navigate('Game', { level: item.level })}
      disabled={!item.unlocked}
      activeOpacity={0.7}
    >
      <Text style={[styles.levelNumber, !item.unlocked && styles.levelLocked]}>
        {item.unlocked ? item.level : '\uD83D\uDD12'}
      </Text>
      {item.unlocked && (
        <View style={styles.starsRow}>
          {[1, 2, 3].map((s) => (
            <Text
              key={s}
              style={[styles.star, s <= item.stars && styles.starActive]}
            >
              {s <= item.stars ? '\u2605' : '\u2606'}
            </Text>
          ))}
        </View>
      )}
      {item.isBoss && item.unlocked && (
        <Text style={styles.bossLabel}>BOSS</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="Back" onPress={() => navigation.goBack()} variant="ghost" size="small" />
        <Text style={styles.headerTitle}>Select Level</Text>
        <View style={{ width: 60 }} />
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
          length: 76,
          offset: 76 * Math.floor(index / 5),
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelCard: {
    width: 64,
    height: 68,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  levelUnlocked: {
    opacity: 1,
  },
  levelBoss: {
    borderWidth: 2,
    borderColor: COLORS.accentGold,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  levelLocked: {
    fontSize: 16,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  star: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  starActive: {
    color: COLORS.accentGold,
  },
  bossLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.accentGold,
    letterSpacing: 1,
    marginTop: 1,
  },
});
