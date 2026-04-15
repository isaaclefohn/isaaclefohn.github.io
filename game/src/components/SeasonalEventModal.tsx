/**
 * Seasonal Event modal.
 * Shows the active seasonal event, points progress, and milestone rewards.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  getActiveEvent,
  getEventDaysRemaining,
  getEventInstanceId,
  getNextMilestoneIndex,
  isMilestoneReached,
} from '../game/events/SeasonalEvent';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface SeasonalEventModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SeasonalEventModal: React.FC<SeasonalEventModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    seasonalEventId,
    seasonalEventPoints,
    seasonalMilestonesClaimed,
    claimSeasonalMilestone,
    addCoins,
    addGems,
    addPowerUp,
  } = usePlayerStore();

  const event = getActiveEvent();
  if (!event) {
    return (
      <Modal visible={visible} onClose={onClose} dismissable>
        <View style={styles.body}>
          <Text style={[styles.title, { textAlign: 'center' }]}>No Active Event</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            Check back soon for the next seasonal event!
          </Text>
        </View>
      </Modal>
    );
  }

  const instanceId = getEventInstanceId(event);
  const isCurrentInstance = seasonalEventId === instanceId;
  const points = isCurrentInstance ? seasonalEventPoints : 0;
  const daysLeft = getEventDaysRemaining(event);
  const nextIdx = getNextMilestoneIndex(event, points);
  const nextMilestone = event.milestones[nextIdx];
  const progressToNext = nextMilestone
    ? Math.min(1, points / nextMilestone.points)
    : 1;

  const handleClaim = (index: number) => {
    const milestone = event.milestones[index];
    if (!isMilestoneReached(milestone, points)) return;
    const key = `${instanceId}_${index}`;
    if (seasonalMilestonesClaimed.includes(key)) return;
    if (milestone.reward.coins) addCoins(milestone.reward.coins);
    if (milestone.reward.gems) addGems(milestone.reward.gems);
    if (milestone.reward.bomb) addPowerUp('bomb', milestone.reward.bomb);
    if (milestone.reward.rowClear) addPowerUp('rowClear', milestone.reward.rowClear);
    if (milestone.reward.colorClear) addPowerUp('colorClear', milestone.reward.colorClear);
    claimSeasonalMilestone(key);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.body}>
      <View style={[styles.header, { borderColor: event.color }]}>
        <View style={[styles.iconCircle, { backgroundColor: `${event.color}20` }]}>
          <GameIcon name={event.icon as any} size={24} color={event.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: event.color }]}>{event.name}</Text>
          <Text style={styles.subtitle}>{event.description}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>{daysLeft} days left</Text>
        <Text style={styles.infoText}>
          {points} pts
          {nextMilestone ? ` / ${nextMilestone.points}` : ''}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressToNext * 100}%`, backgroundColor: event.color },
          ]}
        />
      </View>

      <View style={styles.ratesBox}>
        <Text style={styles.ratesText}>
          +{event.pointsPerLine} pts / line  •  +{event.pointsPerLevel} pts / level
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {event.milestones.map((m, i) => {
          const reached = isMilestoneReached(m, points);
          const key = `${instanceId}_${i}`;
          const claimed = seasonalMilestonesClaimed.includes(key);
          return (
            <View
              key={i}
              style={[
                styles.milestoneCard,
                { borderColor: reached ? event.color : COLORS.textMuted },
                claimed && styles.claimedCard,
              ]}
            >
              <View style={styles.milestoneHeader}>
                <Text style={[styles.milestoneLabel, { color: event.color }]}>{m.label}</Text>
                <Text style={styles.milestonePoints}>{m.points} pts</Text>
              </View>
              <View style={styles.rewardRow}>
                <View style={styles.rewardItems}>
                  {m.reward.coins ? (
                    <View style={styles.rewardItem}>
                      <GameIcon name="coin" size={11} />
                      <Text style={styles.rewardText}>+{m.reward.coins}</Text>
                    </View>
                  ) : null}
                  {m.reward.gems ? (
                    <View style={styles.rewardItem}>
                      <GameIcon name="gem" size={11} />
                      <Text style={styles.rewardText}>+{m.reward.gems}</Text>
                    </View>
                  ) : null}
                  {m.reward.bomb ? (
                    <View style={styles.rewardItem}>
                      <GameIcon name="bomb" size={11} />
                      <Text style={styles.rewardText}>x{m.reward.bomb}</Text>
                    </View>
                  ) : null}
                  {m.reward.rowClear ? (
                    <View style={styles.rewardItem}>
                      <GameIcon name="lightning" size={11} />
                      <Text style={styles.rewardText}>x{m.reward.rowClear}</Text>
                    </View>
                  ) : null}
                  {m.reward.colorClear ? (
                    <View style={styles.rewardItem}>
                      <GameIcon name="palette" size={11} />
                      <Text style={styles.rewardText}>x{m.reward.colorClear}</Text>
                    </View>
                  ) : null}
                </View>
                {reached && !claimed ? (
                  <Button
                    title="Claim"
                    onPress={() => handleClaim(i)}
                    variant="primary"
                    size="small"
                  />
                ) : claimed ? (
                  <Text style={styles.claimedLabel}>CLAIMED</Text>
                ) : (
                  <Text style={styles.lockedLabel}>LOCKED</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratesBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 6,
    marginBottom: 10,
  },
  ratesText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 320,
    width: '100%',
  },
  scrollContent: {
    gap: 8,
  },
  milestoneCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    borderLeftWidth: 3,
    padding: 10,
    gap: 6,
  },
  claimedCard: {
    opacity: 0.6,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  milestonePoints: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 6,
    gap: 6,
  },
  rewardItems: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  claimedLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: 1,
  },
  lockedLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
