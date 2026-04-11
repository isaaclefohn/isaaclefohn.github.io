/**
 * Skill Rating display component.
 * Shows the player's SR tier with progress bar toward next tier.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { getSkillTier, getTierProgress, SKILL_TIERS } from '../game/systems/SkillRating';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

interface SkillRatingDisplayProps {
  compact?: boolean;
}

export const SkillRatingDisplay: React.FC<SkillRatingDisplayProps> = ({ compact }) => {
  const { skillRating } = usePlayerStore();
  const { current, next, progress } = getTierProgress(skillRating);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <GameIcon name={current.icon as any} size={14} color={current.color} />
        <Text style={[styles.compactText, { color: current.color }]}>{current.name}</Text>
        <Text style={styles.srText}>{skillRating}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GameIcon name={current.icon as any} size={20} color={current.color} />
        <View>
          <Text style={[styles.tierName, { color: current.color }]}>{current.name}</Text>
          <Text style={styles.srValue}>SR {skillRating}</Text>
        </View>
      </View>
      {next && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: current.color }]} />
          </View>
          <Text style={styles.nextText}>
            {next.minSR - skillRating} SR to {next.name}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '800',
  },
  srText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  srValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  progressSection: {
    gap: 3,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  nextText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
