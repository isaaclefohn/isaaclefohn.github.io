/**
 * Home screen — main menu for Block Blitz.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { Button } from '../components/common/Button';
import { COLORS } from '../utils/constants';
import { formatScore, formatCompact } from '../utils/formatters';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { highestLevel, coins, gems, totalScore } = usePlayerStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>BLOCK</Text>
          <Text style={styles.titleAccent}>BLITZ</Text>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Coins</Text>
            <Text style={styles.statValue}>{formatCompact(coins)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Gems</Text>
            <Text style={styles.statValue}>{formatCompact(gems)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{formatCompact(totalScore)}</Text>
          </View>
        </View>

        {/* Main buttons */}
        <View style={styles.buttonGroup}>
          {highestLevel > 0 ? (
            <Button
              title={`Continue  Level ${highestLevel + 1}`}
              onPress={() => navigation.navigate('Game', { level: highestLevel + 1 })}
              variant="primary"
              size="large"
              style={styles.mainButton}
            />
          ) : (
            <Button
              title="Play"
              onPress={() => navigation.navigate('Game', { level: 1 })}
              variant="primary"
              size="large"
              style={styles.mainButton}
            />
          )}

          <Button
            title="Daily Challenge"
            onPress={() => navigation.navigate('DailyChallenge')}
            variant="secondary"
            size="medium"
            style={styles.menuButton}
          />

          <Button
            title="Level Select"
            onPress={() => navigation.navigate('LevelSelect')}
            variant="secondary"
            size="medium"
            style={styles.menuButton}
          />

          <View style={styles.bottomRow}>
            <Button
              title="Shop"
              onPress={() => navigation.navigate('Shop')}
              variant="ghost"
              size="medium"
            />
            <Button
              title="Settings"
              onPress={() => navigation.navigate('Settings')}
              variant="ghost"
              size="medium"
            />
          </View>
        </View>

        {/* Level indicator */}
        {highestLevel > 0 && (
          <Text style={styles.levelIndicator}>
            Highest Level: {highestLevel}
          </Text>
        )}
      </View>
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
    paddingHorizontal: 24,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 8,
  },
  titleAccent: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 8,
    marginTop: -8,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accentGold,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.gridEmpty,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  mainButton: {
    width: '100%',
  },
  menuButton: {
    width: '80%',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  levelIndicator: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 24,
  },
});
