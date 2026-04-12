/**
 * Boss Rush intro/progress modal.
 * Shows the player's best run, current progress, medals earned,
 * and lets them start a new run.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { BOSS_RUSH_CONFIG, getBossRushMedal, isBossRushUnlocked } from '../game/modes/BossRush';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';
import { formatScore } from '../utils/formatters';

interface BossRushModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

const MEDAL_INFO: Record<string, { color: string; label: string; icon: string }> = {
  none: { color: COLORS.textMuted, label: 'None', icon: 'shield' },
  bronze: { color: '#CD7F32', label: 'Bronze', icon: 'medal-bronze' },
  silver: { color: '#C0C0C0', label: 'Silver', icon: 'medal-silver' },
  gold: { color: '#FACC15', label: 'Gold', icon: 'medal-gold' },
  platinum: { color: '#22D3EE', label: 'Platinum', icon: 'crown' },
};

export const BossRushModal: React.FC<BossRushModalProps> = ({ visible, onClose, onStart }) => {
  const { highestLevel, bossRushBestScore, bossRushBestBosses } = usePlayerStore();

  const unlocked = isBossRushUnlocked(highestLevel);
  const medal = getBossRushMedal(bossRushBestBosses);
  const medalInfo = MEDAL_INFO[medal];

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <View style={styles.iconCircle}>
        <GameIcon name="crown" size={32} color={COLORS.accentGold} />
      </View>
      <Text style={styles.title}>Boss Rush</Text>
      <Text style={styles.subtitle}>Defeat all 20 bosses in one run</Text>

      {!unlocked ? (
        <View style={styles.lockBox}>
          <GameIcon name="lock" size={16} color={COLORS.textMuted} />
          <Text style={styles.lockText}>
            Reach level {BOSS_RUSH_CONFIG.unlockLevel} to unlock
          </Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{bossRushBestBosses}</Text>
                <Text style={styles.statLabel}>BEST</Text>
                <Text style={styles.statSub}>Bosses Beaten</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatScore(bossRushBestScore)}</Text>
                <Text style={styles.statLabel}>BEST</Text>
                <Text style={styles.statSub}>Total Score</Text>
              </View>
            </View>

            <View style={[styles.medalBox, { borderColor: medalInfo.color }]}>
              <GameIcon name={medalInfo.icon as any} size={20} color={medalInfo.color} />
              <View style={styles.medalText}>
                <Text style={styles.medalLabel}>Current Medal</Text>
                <Text style={[styles.medalName, { color: medalInfo.color }]}>
                  {medalInfo.label}
                </Text>
              </View>
            </View>

            <View style={styles.rewardsBox}>
              <Text style={styles.rewardsTitle}>Rewards</Text>
              <View style={styles.rewardRow}>
                <GameIcon name="coin" size={14} />
                <Text style={styles.rewardText}>
                  +{BOSS_RUSH_CONFIG.rewardPerBoss.coins} per boss
                </Text>
              </View>
              <View style={styles.rewardRow}>
                <GameIcon name="gem" size={14} />
                <Text style={styles.rewardText}>
                  +{BOSS_RUSH_CONFIG.rewardPerBoss.gems} per boss
                </Text>
              </View>
              <View style={styles.rewardRow}>
                <GameIcon name="sparkle" size={14} color={COLORS.accent} />
                <Text style={styles.rewardText}>
                  Complete all 20: +2000 coins, +50 gems
                </Text>
              </View>
            </View>

            <View style={styles.startingBox}>
              <Text style={styles.startingTitle}>Starting Power-Ups</Text>
              <View style={styles.startingRow}>
                <View style={styles.startingItem}>
                  <GameIcon name="bomb" size={14} />
                  <Text style={styles.startingText}>x{BOSS_RUSH_CONFIG.startingPowerUps.bomb}</Text>
                </View>
                <View style={styles.startingItem}>
                  <GameIcon name="lightning" size={14} />
                  <Text style={styles.startingText}>x{BOSS_RUSH_CONFIG.startingPowerUps.rowClear}</Text>
                </View>
                <View style={styles.startingItem}>
                  <GameIcon name="palette" size={14} />
                  <Text style={styles.startingText}>x{BOSS_RUSH_CONFIG.startingPowerUps.colorClear}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <Button title="Start Boss Rush" onPress={onStart} variant="primary" size="large" />
        </>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.accentGold}20`,
    borderWidth: 2,
    borderColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  lockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
  },
  lockText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  scroll: {
    maxHeight: 320,
    width: '100%',
  },
  scrollContent: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  medalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADII.md,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceLight,
  },
  medalText: {
    flex: 1,
  },
  medalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  medalName: {
    fontSize: 14,
    fontWeight: '900',
  },
  rewardsBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 10,
    gap: 4,
  },
  rewardsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  startingBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    padding: 10,
    marginBottom: 8,
  },
  startingTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  startingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  startingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startingText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
