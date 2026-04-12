/**
 * Quest Chains modal.
 * Shows all quest chains with their steps, progress bars, and final rewards.
 * Completed chains can be claimed for a big bonus.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  QUEST_CHAINS,
  getStepProgress,
  getCurrentStepIndex,
  isChainComplete,
  QuestStats,
} from '../game/systems/QuestChain';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';

interface QuestChainModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QuestChainModal: React.FC<QuestChainModalProps> = ({ visible, onClose }) => {
  const {
    highestLevel,
    levelStars,
    totalLinesCleared,
    totalPowerUpsUsed,
    totalGamesPlayed,
    bestCombo,
    claimedQuestChains,
    addCoins,
    addGems,
    addPowerUp,
    claimQuestChain,
  } = usePlayerStore();

  const stats: QuestStats = {
    highestLevel,
    totalStars: Object.values(levelStars).reduce((a, b) => a + b, 0),
    totalLinesCleared,
    totalPowerUpsUsed,
    perfectLevels: Object.values(levelStars).filter((v) => v >= 3).length,
    totalGamesPlayed,
    bestCombo,
    totalCoinsSpent: 0,
  };

  const handleClaim = (chainId: string) => {
    if (claimedQuestChains.includes(chainId)) return;
    const chain = QUEST_CHAINS.find((c) => c.id === chainId);
    if (!chain) return;
    if (!isChainComplete(chain, stats)) return;

    const reward = chain.reward;
    addCoins(reward.coins);
    if (reward.gems) addGems(reward.gems);
    if (reward.bomb) addPowerUp('bomb', reward.bomb);
    if (reward.rowClear) addPowerUp('rowClear', reward.rowClear);
    if (reward.colorClear) addPowerUp('colorClear', reward.colorClear);
    claimQuestChain(chainId);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Quest Chains</Text>
      <Text style={styles.subtitle}>Long-term goals with epic rewards</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {QUEST_CHAINS.map((chain) => {
          const complete = isChainComplete(chain, stats);
          const claimed = claimedQuestChains.includes(chain.id);
          const currentStep = getCurrentStepIndex(chain, stats);

          return (
            <View
              key={chain.id}
              style={[
                styles.card,
                { borderColor: chain.color },
                claimed && styles.cardClaimed,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${chain.color}20` }]}>
                  <GameIcon name={chain.icon as any} size={18} color={chain.color} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardName, { color: chain.color }]}>{chain.name}</Text>
                  <Text style={styles.cardDesc}>{chain.description}</Text>
                </View>
              </View>

              <View style={styles.stepsBox}>
                {chain.steps.map((step, i) => {
                  const progress = getStepProgress(step, stats);
                  const done = progress >= step.target;
                  const isCurrent = i === currentStep;

                  return (
                    <View key={step.id} style={styles.stepRow}>
                      <View
                        style={[
                          styles.stepDot,
                          done && styles.stepDotDone,
                          isCurrent && styles.stepDotCurrent,
                        ]}
                      >
                        {done && <GameIcon name="check" size={10} color="#FFFFFF" />}
                      </View>
                      <View style={styles.stepText}>
                        <Text
                          style={[
                            styles.stepTitle,
                            done && styles.stepTitleDone,
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={styles.stepDesc}>
                          {step.description} — {Math.min(progress, step.target)}/{step.target}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Reward + claim */}
              <View style={styles.rewardRow}>
                <View style={styles.rewardItems}>
                  <View style={styles.rewardItem}>
                    <GameIcon name="coin" size={11} />
                    <Text style={styles.rewardText}>+{chain.reward.coins}</Text>
                  </View>
                  {chain.reward.gems > 0 && (
                    <View style={styles.rewardItem}>
                      <GameIcon name="gem" size={11} />
                      <Text style={styles.rewardText}>+{chain.reward.gems}</Text>
                    </View>
                  )}
                  {chain.reward.bomb && chain.reward.bomb > 0 && (
                    <View style={styles.rewardItem}>
                      <GameIcon name="bomb" size={11} />
                      <Text style={styles.rewardText}>x{chain.reward.bomb}</Text>
                    </View>
                  )}
                  {chain.reward.rowClear && chain.reward.rowClear > 0 && (
                    <View style={styles.rewardItem}>
                      <GameIcon name="lightning" size={11} />
                      <Text style={styles.rewardText}>x{chain.reward.rowClear}</Text>
                    </View>
                  )}
                  {chain.reward.colorClear && chain.reward.colorClear > 0 && (
                    <View style={styles.rewardItem}>
                      <GameIcon name="palette" size={11} />
                      <Text style={styles.rewardText}>x{chain.reward.colorClear}</Text>
                    </View>
                  )}
                </View>
                {complete && !claimed ? (
                  <Button
                    title="Claim"
                    onPress={() => handleClaim(chain.id)}
                    variant="primary"
                    size="small"
                  />
                ) : claimed ? (
                  <Text style={styles.claimedLabel}>CLAIMED</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 440,
    width: '100%',
  },
  scrollContent: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADII.md,
    borderLeftWidth: 3,
    padding: 12,
    gap: 10,
  },
  cardClaimed: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepsBox: {
    gap: 6,
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepDotCurrent: {
    borderColor: COLORS.accent,
    backgroundColor: `${COLORS.accent}20`,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stepTitleDone: {
    color: COLORS.success,
  },
  stepDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 8,
    gap: 8,
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
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: 1,
  },
});
