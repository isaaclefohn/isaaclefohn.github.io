/**
 * Player profile stats card.
 * Comprehensive stats dashboard showing lifetime achievements,
 * current progress, and performance metrics.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { Modal } from './common/Modal';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';
import { formatScore, formatCompact } from '../utils/formatters';
import { getAvatarFrame } from '../game/customization/Avatars';
import { AvatarPickerModal } from './AvatarPickerModal';

interface PlayerProfileCardProps {
  visible: boolean;
  onClose: () => void;
}

interface StatRowProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

const StatRow: React.FC<StatRowProps> = ({ icon, label, value, color }) => (
  <View style={styles.statRow}>
    <View style={styles.statRowLeft}>
      <GameIcon name={icon as any} size={16} color={color ?? COLORS.textSecondary} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
  </View>
);

/** Get a rank title based on highest level */
function getRankTitle(level: number): { title: string; color: string } {
  if (level >= 400) return { title: 'Grandmaster', color: '#FF4500' };
  if (level >= 300) return { title: 'Master', color: '#C084FC' };
  if (level >= 200) return { title: 'Expert', color: '#60A5FA' };
  if (level >= 100) return { title: 'Veteran', color: '#34D399' };
  if (level >= 50) return { title: 'Skilled', color: '#FBBF24' };
  if (level >= 20) return { title: 'Apprentice', color: '#A3E635' };
  if (level >= 5) return { title: 'Rookie', color: '#94A3B8' };
  return { title: 'Newcomer', color: '#64748B' };
}

/** Calculate average stars per completed level */
function getAverageStars(levelStars: Record<number, number>): string {
  const entries = Object.values(levelStars);
  if (entries.length === 0) return '0.0';
  const avg = entries.reduce((a, b) => a + b, 0) / entries.length;
  return avg.toFixed(1);
}

/** Get completion percentage */
function getCompletion(highestLevel: number, totalLevels: number = 500): number {
  return Math.round((highestLevel / totalLevels) * 100);
}

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({ visible, onClose }) => {
  const {
    displayName,
    highestLevel,
    levelStars,
    totalScore,
    totalLinesCleared,
    totalGamesPlayed,
    bestCombo,
    currentStreak,
    longestStreak,
    unlockedAchievements,
    coins,
    gems,
    zenHighScore,
    zenGamesPlayed,
    totalPowerUpsUsed,
    battlePassXP,
    equippedAvatar,
  } = usePlayerStore();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const avatarFrame = getAvatarFrame(equippedAvatar);

  const rank = getRankTitle(highestLevel);
  const totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0);
  const perfectLevels = Object.values(levelStars).filter(v => v >= 3).length;
  const avgStars = getAverageStars(levelStars);
  const completion = getCompletion(highestLevel);

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Profile header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowAvatarPicker(true)}
            activeOpacity={0.8}
            style={[
              styles.avatar,
              {
                borderColor: avatarFrame.color,
                borderWidth: avatarFrame.borderWidth,
              },
            ]}
          >
            <GameIcon name={avatarFrame.icon as any} size={28} color={avatarFrame.color} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAvatarPicker(true)} activeOpacity={0.8}>
            <Text style={styles.editAvatarText}>Change Avatar</Text>
          </TouchableOpacity>
          <Text style={styles.name}>{displayName}</Text>
          <View style={[styles.rankBadge, { backgroundColor: `${rank.color}20`, borderColor: `${rank.color}40` }]}>
            <GameIcon name="crown" size={12} color={rank.color} />
            <Text style={[styles.rankText, { color: rank.color }]}>{rank.title}</Text>
          </View>
        </View>

        {/* Progress ring */}
        <View style={styles.progressSection}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>{completion}%</Text>
            <Text style={styles.progressLabel}>Complete</Text>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{highestLevel}</Text>
              <Text style={styles.miniStatLabel}>Level</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{totalStars}</Text>
              <Text style={styles.miniStatLabel}>Stars</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{perfectLevels}</Text>
              <Text style={styles.miniStatLabel}>Perfect</Text>
            </View>
          </View>
        </View>

        {/* Stats sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERFORMANCE</Text>
          <StatRow icon="target" label="Total Score" value={formatCompact(totalScore)} color={COLORS.accent} />
          <StatRow icon="lightning" label="Lines Cleared" value={formatScore(totalLinesCleared)} />
          <StatRow icon="star" label="Avg Stars/Level" value={avgStars} color={COLORS.accentGold} />
          <StatRow icon="fire" label="Best Combo" value={`${bestCombo}x`} color={COLORS.warning} />
          <StatRow icon="bomb" label="Power-Ups Used" value={totalPowerUpsUsed} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ENGAGEMENT</Text>
          <StatRow icon="map" label="Games Played" value={totalGamesPlayed} />
          <StatRow icon="fire" label="Current Streak" value={`${currentStreak} days`} color={currentStreak >= 7 ? COLORS.accent : undefined} />
          <StatRow icon="trophy" label="Longest Streak" value={`${longestStreak} days`} color={COLORS.accentGold} />
          <StatRow icon="star" label="Achievements" value={`${unlockedAchievements.length}/15`} />
          <StatRow icon="gem" label="Battle Pass XP" value={formatCompact(battlePassXP)} color={COLORS.info} />
        </View>

        {zenGamesPlayed > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ZEN MODE</Text>
            <StatRow icon="sparkle" label="Zen Games" value={zenGamesPlayed} />
            <StatRow icon="trophy" label="Zen Best Score" value={formatScore(zenHighScore)} color={COLORS.accentGold} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEALTH</Text>
          <StatRow icon="coin" label="Coins" value={formatCompact(coins)} color={COLORS.accentGold} />
          <StatRow icon="gem" label="Gems" value={gems} color={COLORS.info} />
        </View>
      </ScrollView>

      <AvatarPickerModal
        visible={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxHeight: 450,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  editAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.round,
    borderWidth: 1,
    marginTop: 6,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.accent,
  },
  progressLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  progressStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  miniStat: {
    alignItems: 'center',
    gap: 2,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.surfaceBorder}60`,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
