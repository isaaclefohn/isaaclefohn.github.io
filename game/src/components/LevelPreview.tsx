/**
 * Level preview modal shown before starting a level.
 * Displays difficulty info, star requirements, best score, and objectives.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLevel, isBossLevel } from '../game/levels/LevelGenerator';
import { getWorldForLevel } from '../game/levels/Worlds';
import { getMasteryInfo } from '../game/systems/MasterySystem';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII, SPACING } from '../utils/constants';
import { formatScore } from '../utils/formatters';

interface LevelPreviewProps {
  visible: boolean;
  level: number;
  highScore: number;
  bestStars: number;
  onPlay: () => void;
  onClose: () => void;
}

function getDifficultyLabel(level: number): { label: string; color: string } {
  if (level <= 5) return { label: 'Easy', color: COLORS.success };
  if (level <= 20) return { label: 'Easy', color: COLORS.success };
  if (level <= 50) return { label: 'Normal', color: COLORS.info };
  if (level <= 100) return { label: 'Normal', color: COLORS.info };
  if (level <= 200) return { label: 'Hard', color: COLORS.warning };
  if (level <= 350) return { label: 'Hard', color: COLORS.warning };
  return { label: 'Expert', color: COLORS.danger };
}

export const LevelPreview: React.FC<LevelPreviewProps> = ({
  visible,
  level,
  highScore,
  bestStars,
  onPlay,
  onClose,
}) => {
  const config = getLevel(level);
  const world = getWorldForLevel(level);
  const isBoss = isBossLevel(level);
  const difficulty = getDifficultyLabel(level);

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      {/* Level header */}
      <View style={styles.header}>
        {isBoss && (
          <View style={[styles.bossBadge, { backgroundColor: world.color }]}>
            <Text style={styles.bossBadgeText}>BOSS</Text>
          </View>
        )}
        <Text style={styles.levelNumber}>Level {level}</Text>
        <View style={styles.worldRow}>
          <GameIcon name={world.icon as any} size={14} color={world.color} />
          <Text style={[styles.worldName, { color: world.color }]}>{world.name}</Text>
        </View>
      </View>

      {/* Difficulty & Grid info */}
      <View style={styles.infoRow}>
        <View style={styles.infoPill}>
          <View style={[styles.diffDot, { backgroundColor: difficulty.color }]} />
          <Text style={[styles.infoLabel, { color: difficulty.color }]}>{difficulty.label}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>{config.gridSize}x{config.gridSize}</Text>
        </View>
      </View>

      {/* Objectives */}
      <View style={styles.objectiveCard}>
        <Text style={styles.objectiveTitle}>OBJECTIVE</Text>
        <View style={styles.objectiveRow}>
          <GameIcon name="target" size={16} color={COLORS.accent} />
          <Text style={styles.objectiveText}>
            Score {formatScore(config.objective.target)} points
          </Text>
        </View>
      </View>

      {/* Star thresholds */}
      <View style={styles.starsCard}>
        {config.starThresholds.map((threshold, i) => (
          <View key={i} style={styles.starRow}>
            <View style={styles.starIcons}>
              {Array.from({ length: i + 1 }).map((_, j) => (
                <GameIcon
                  key={j}
                  name={bestStars >= i + 1 ? 'star' : 'star-outline'}
                  size={14}
                  color={bestStars >= i + 1 ? COLORS.accentGold : undefined}
                />
              ))}
            </View>
            <Text style={[styles.starThreshold, bestStars >= i + 1 && { color: COLORS.accentGold }]}>
              {formatScore(threshold)}
            </Text>
          </View>
        ))}
      </View>

      {/* Best score */}
      {highScore > 0 && (
        <View style={styles.bestRow}>
          <GameIcon name="trophy" size={14} color={COLORS.accentGold} />
          <Text style={styles.bestText}>Best: {formatScore(highScore)}</Text>
        </View>
      )}

      {/* Mastery rank */}
      {highScore > 0 && config.starThresholds[2] > 0 && (() => {
        const mastery = getMasteryInfo(highScore, config.starThresholds[2]);
        return (
          <View style={styles.masteryRow}>
            <View style={[styles.masteryBadge, { borderColor: mastery.color }]}>
              <Text style={[styles.masteryLabel, { color: mastery.color }]}>{mastery.label}</Text>
            </View>
            {mastery.nextRank && mastery.nextThreshold && (
              <Text style={styles.masteryNext}>
                {formatScore(mastery.nextThreshold - highScore)} to {mastery.nextRank}
              </Text>
            )}
            {mastery.bonusCoins > 0 && (
              <View style={styles.masteryBonusRow}>
                <GameIcon name="coin" size={11} />
                <Text style={styles.masteryBonusText}>+{mastery.bonusCoins} replay bonus</Text>
              </View>
            )}
          </View>
        );
      })()}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button
          title={highScore > 0 ? 'Play Again' : 'Play'}
          onPress={onPlay}
          variant="primary"
          size="large"
        />
        <Button title="Back" onPress={onClose} variant="ghost" size="small" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  bossBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  bossBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.background,
    letterSpacing: 1.5,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  worldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  worldName: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  objectiveCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 12,
    marginBottom: 12,
  },
  objectiveTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  objectiveText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  starsCard: {
    gap: 6,
    marginBottom: 12,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  starIcons: {
    flexDirection: 'row',
    gap: 2,
    width: 60,
  },
  starThreshold: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  bestText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  masteryRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  masteryBadge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  masteryLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  masteryNext: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  masteryBonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  masteryBonusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  actions: {
    gap: 8,
    width: '100%',
    alignItems: 'center',
  },
});
