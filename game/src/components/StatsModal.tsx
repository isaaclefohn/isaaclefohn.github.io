/**
 * Player stats dashboard modal.
 * Shows detailed lifetime statistics in a polished grid layout.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Modal } from './common/Modal';
import { GameIcon } from './GameIcon';
import { usePlayerStore, ACHIEVEMENTS } from '../store/playerStore';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface StatRowProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

const StatRow: React.FC<StatRowProps> = ({ icon, label, value, color = COLORS.accentGold }) => (
  <View style={styles.statRow}>
    <GameIcon name={icon as any} size={18} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

export const StatsModal: React.FC<StatsModalProps> = ({ visible, onClose }) => {
  const {
    totalGamesPlayed,
    totalScore,
    totalLinesCleared,
    highestLevel,
    bestCombo,
    currentStreak,
    longestStreak,
    coins,
    gems,
    totalPowerUpsUsed,
    totalChromaticClears,
    bestWaveReached,
    levelStars,
    unlockedAchievements,
    zenHighScore,
    zenGamesPlayed,
    zenBestLinesCleared,
  } = usePlayerStore();

  const totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0);
  const levelsCompleted = Object.keys(levelStars).length;
  const perfectLevels = Object.values(levelStars).filter(s => s >= 3).length;

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.header}>
        <GameIcon name="target" size={32} color={COLORS.accent} />
        <Text style={styles.title}>Player Stats</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress section */}
        <Text style={styles.sectionTitle}>PROGRESS</Text>
        <View style={styles.section}>
          <StatRow icon="map" label="Highest Level" value={highestLevel} />
          <StatRow icon="star" label="Total Stars" value={totalStars} />
          <StatRow icon="check" label="Levels Completed" value={levelsCompleted} />
          <StatRow icon="sparkle" label="Perfect (3-Star)" value={perfectLevels} />
        </View>

        {/* Performance section */}
        <Text style={styles.sectionTitle}>PERFORMANCE</Text>
        <View style={styles.section}>
          <StatRow icon="target" label="Total Score" value={totalScore.toLocaleString()} color={COLORS.accent} />
          <StatRow icon="lightning" label="Lines Cleared" value={totalLinesCleared} color={COLORS.blocks[1]} />
          <StatRow icon="fire" label="Best Combo" value={`${bestCombo}x`} color={COLORS.blocks[6]} />
          <StatRow icon="bomb" label="Power-Ups Used" value={totalPowerUpsUsed} color={COLORS.blocks[5]} />
          <StatRow icon="palette" label="Chromatic Clears" value={totalChromaticClears} color={COLORS.accent} />
          <StatRow icon="lightning" label="Best Wave" value={bestWaveReached} color={COLORS.blocks[3]} />
        </View>

        {/* Dedication section */}
        <Text style={styles.sectionTitle}>DEDICATION</Text>
        <View style={styles.section}>
          <StatRow icon="map" label="Games Played" value={totalGamesPlayed} />
          <StatRow icon="fire" label="Current Streak" value={`${currentStreak} day${currentStreak !== 1 ? 's' : ''}`} color={COLORS.blocks[6]} />
          <StatRow icon="crown" label="Longest Streak" value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`} color={COLORS.accentGold} />
          <StatRow icon="trophy" label="Achievements" value={`${unlockedAchievements.length} / ${ACHIEVEMENTS.length}`} />
        </View>

        {/* Zen Mode section */}
        {zenGamesPlayed > 0 && (
          <>
            <Text style={styles.sectionTitle}>ZEN MODE</Text>
            <View style={styles.section}>
              <StatRow icon="sparkle" label="High Score" value={zenHighScore.toLocaleString()} color={COLORS.accentGold} />
              <StatRow icon="map" label="Games Played" value={zenGamesPlayed} />
              <StatRow icon="lightning" label="Best Lines" value={zenBestLinesCleared} color={COLORS.blocks[1]} />
            </View>
          </>
        )}

        {/* Wealth section */}
        <Text style={styles.sectionTitle}>WEALTH</Text>
        <View style={styles.section}>
          <StatRow icon="coin" label="Coins" value={coins.toLocaleString()} />
          <StatRow icon="gem" label="Gems" value={gems} color={COLORS.accent} />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  scrollArea: {
    maxHeight: 400,
    width: '100%',
  },
  content: {
    gap: 4,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 4,
  },
  section: {
    backgroundColor: `${COLORS.surface}80`,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accentGold,
    textAlign: 'right',
  },
});
