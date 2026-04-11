/**
 * Achievement Showcase card.
 * Displays a player's top achievements in a shareable visual card.
 * Players can share their progress via the native share sheet.
 */

import React from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { usePlayerStore, ACHIEVEMENTS } from '../store/playerStore';
import { getSkillTier } from '../game/systems/SkillRating';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

interface AchievementShowcaseProps {
  visible: boolean;
  onClose: () => void;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({ visible, onClose }) => {
  const { displayName, unlockedAchievements, highestLevel, totalScore, currentStreak, longestStreak, skillRating, levelStars } = usePlayerStore();

  const unlocked = ACHIEVEMENTS.filter(a => unlockedAchievements.includes(a.id));
  const totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0);
  const perfectLevels = Object.values(levelStars).filter(s => s >= 3).length;
  const tier = getSkillTier(skillRating);

  const handleShare = async () => {
    const achievementList = unlocked.slice(0, 5).map(a => `  ${a.name}`).join('\n');
    const message = [
      `Color Block Blast - ${displayName}'s Progress`,
      ``,
      `Level: ${highestLevel}`,
      `Stars: ${totalStars}`,
      `Score: ${totalScore.toLocaleString()}`,
      `Rank: ${tier.name} (SR ${skillRating})`,
      `Streak: ${longestStreak} days`,
      `Achievements: ${unlocked.length}/${ACHIEVEMENTS.length}`,
      unlocked.length > 0 ? `\nTop Achievements:\n${achievementList}` : '',
      ``,
      `Can you beat my score?`,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message });
    } catch { /* user cancelled */ }
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Achievement Showcase</Text>

      {/* Player card header */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(displayName || 'P').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{displayName}</Text>
            <View style={styles.rankRow}>
              <GameIcon name="shield" size={12} color={tier.color} />
              <Text style={[styles.rankText, { color: tier.color }]}>{tier.name}</Text>
              <Text style={styles.srText}>SR {skillRating}</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{highestLevel}</Text>
            <Text style={styles.statLbl}>Level</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{totalStars}</Text>
            <Text style={styles.statLbl}>Stars</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{perfectLevels}</Text>
            <Text style={styles.statLbl}>Perfect</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{longestStreak}d</Text>
            <Text style={styles.statLbl}>Streak</Text>
          </View>
        </View>
      </View>

      {/* Achievement list */}
      <View style={styles.achievementSection}>
        <Text style={styles.sectionLabel}>
          ACHIEVEMENTS ({unlocked.length}/{ACHIEVEMENTS.length})
        </Text>
        {unlocked.length === 0 ? (
          <Text style={styles.emptyText}>Complete levels to earn achievements!</Text>
        ) : (
          <View style={styles.achievementGrid}>
            {unlocked.map(a => (
              <View key={a.id} style={styles.achievementItem}>
                <View style={styles.achievementIcon}>
                  <GameIcon name={a.icon as any} size={16} color={COLORS.accentGold} />
                </View>
                <Text style={styles.achievementName} numberOfLines={1}>{a.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Locked achievements hint */}
      {unlocked.length < ACHIEVEMENTS.length && (
        <View style={styles.lockedHint}>
          <GameIcon name="lock" size={12} color={COLORS.textMuted} />
          <Text style={styles.lockedText}>
            {ACHIEVEMENTS.length - unlocked.length} more to discover
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Share Progress" onPress={handleShare} variant="primary" size="medium" />
        <Button title="Close" onPress={onClose} variant="ghost" size="small" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  srText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCell: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.accentGold,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  achievementSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: `${COLORS.accentGold}20`,
  },
  achievementIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    maxWidth: 100,
  },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  actions: {
    gap: 8,
    alignItems: 'center',
  },
});
