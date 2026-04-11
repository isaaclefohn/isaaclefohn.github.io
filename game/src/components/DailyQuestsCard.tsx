/**
 * Daily quests card shown on the home screen.
 * Displays 3 rotating daily objectives with progress bars and claim buttons.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getDailyQuests, isQuestComplete, getQuestProgress, Quest } from '../game/systems/DailyQuests';
import { usePlayerStore } from '../store/playerStore';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING, SHADOWS } from '../utils/constants';

interface DailyQuestsCardProps {
  visible: boolean;
}

export const DailyQuestsCard: React.FC<DailyQuestsCardProps> = ({ visible }) => {
  const {
    dailyQuestProgress,
    dailyQuestsClaimed,
    dailyQuestsDate,
    addCoins,
    addGems,
    addBattlePassXP,
    claimDailyQuest,
  } = usePlayerStore();

  const quests = useMemo(() => getDailyQuests(), []);
  const today = new Date().toISOString().split('T')[0];
  const isToday = dailyQuestsDate === today;

  const getProgress = useCallback((quest: Quest): number => {
    if (!isToday) return 0;
    return dailyQuestProgress[quest.trackingKey] ?? 0;
  }, [dailyQuestProgress, isToday]);

  const isClaimed = useCallback((quest: Quest): boolean => {
    if (!isToday) return false;
    return dailyQuestsClaimed.includes(quest.id);
  }, [dailyQuestsClaimed, isToday]);

  const handleClaim = useCallback((quest: Quest) => {
    if (isClaimed(quest)) return;
    if (quest.reward.coins) addCoins(quest.reward.coins);
    if (quest.reward.gems) addGems(quest.reward.gems);
    if (quest.reward.xp) addBattlePassXP(quest.reward.xp);
    claimDailyQuest(quest.id);
  }, [addCoins, addGems, addBattlePassXP, claimDailyQuest, isClaimed]);

  if (!visible) return null;

  const allComplete = quests.every(q => isClaimed(q));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GameIcon name="calendar" size={14} color={COLORS.accent} />
        <Text style={styles.title}>Daily Quests</Text>
        {allComplete && (
          <View style={styles.completeBadge}>
            <GameIcon name="check" size={10} color={COLORS.success} />
          </View>
        )}
      </View>

      {quests.map((quest) => {
        const progress = getProgress(quest);
        const complete = isQuestComplete(quest, progress);
        const claimed = isClaimed(quest);
        const pct = getQuestProgress(quest, progress);

        return (
          <View key={quest.id} style={[styles.questRow, claimed && styles.questClaimed]}>
            <View style={[styles.questIcon, { backgroundColor: `${COLORS.accent}15` }]}>
              <GameIcon name={quest.icon as any} size={16} color={claimed ? COLORS.success : COLORS.accent} />
            </View>
            <View style={styles.questInfo}>
              <Text style={[styles.questTitle, claimed && styles.questTitleClaimed]}>{quest.title}</Text>
              <Text style={styles.questDesc}>{quest.description}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: complete ? COLORS.success : COLORS.accent }]} />
              </View>
              <Text style={styles.progressText}>{progress}/{quest.target}</Text>
            </View>
            {complete && !claimed ? (
              <TouchableOpacity style={styles.claimButton} onPress={() => handleClaim(quest)}>
                <Text style={styles.claimText}>Claim</Text>
              </TouchableOpacity>
            ) : claimed ? (
              <GameIcon name="check" size={16} color={COLORS.success} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${COLORS.surface}E0`,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.sm,
    width: '100%',
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  completeBadge: {
    backgroundColor: `${COLORS.success}20`,
    borderRadius: RADII.round,
    padding: 3,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.surfaceBorder}60`,
  },
  questClaimed: {
    opacity: 0.5,
  },
  questIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questInfo: {
    flex: 1,
    gap: 2,
  },
  questTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  questTitleClaimed: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  questDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  claimButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.round,
  },
  claimText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
