/**
 * Tournament hub modal.
 * Shows all tournament tiers, their entry requirements, and lets the player
 * enter / check active state. When a tournament ends, results are paid out.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import {
  TOURNAMENT_TIERS,
  TournamentTier,
  isTournamentAvailable,
  getTimeRemaining,
  getPrizeForRank,
  simulateFinalRank,
} from '../game/modes/Tournament';
import { GameIcon } from './GameIcon';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { COLORS, RADII } from '../utils/constants';
import { formatScore } from '../utils/formatters';

interface TournamentModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({ visible, onClose }) => {
  const {
    highestLevel,
    coins,
    weeklyBestScore,
    activeTournament,
    tournamentBestScore,
    enterTournament,
    finishTournament,
    spendCoins,
    addCoins,
    addGems,
  } = usePlayerStore();

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [visible]);

  // Auto-finish expired tournaments
  useEffect(() => {
    if (!visible || !activeTournament) return;
    if (Date.now() < activeTournament.endsAt) return;

    const config = TOURNAMENT_TIERS[activeTournament.tier];
    const rank = simulateFinalRank(
      activeTournament.playerScore,
      activeTournament.tier,
      activeTournament.startedAt,
    );
    const prize = getPrizeForRank(rank, config);
    addCoins(prize.coins);
    if (prize.gems > 0) addGems(prize.gems);
    finishTournament(rank);
  }, [visible, activeTournament, addCoins, addGems, finishTournament]);

  const handleEnter = (tier: TournamentTier) => {
    const config = TOURNAMENT_TIERS[tier];
    if (config.entryFee > 0 && !spendCoins(config.entryFee)) return;
    enterTournament(tier, weeklyBestScore);
  };

  const tiers: TournamentTier[] = ['bronze', 'silver', 'gold', 'diamond'];

  return (
    <Modal visible={visible} onClose={onClose} dismissable>
      <Text style={styles.title}>Tournaments</Text>
      <Text style={styles.subtitle}>24-hour competitive brackets</Text>

      {activeTournament && (
        <View style={[styles.activeBanner, { borderColor: TOURNAMENT_TIERS[activeTournament.tier].color }]}>
          <GameIcon
            name={TOURNAMENT_TIERS[activeTournament.tier].icon as any}
            size={16}
            color={TOURNAMENT_TIERS[activeTournament.tier].color}
          />
          <View style={styles.activeText}>
            <Text style={styles.activeLabel}>
              Active: {TOURNAMENT_TIERS[activeTournament.tier].name}
            </Text>
            <Text style={styles.activeTime}>
              {(() => {
                const t = getTimeRemaining(activeTournament.endsAt, now);
                return t.expired ? 'Ending…' : `${t.hours}h ${t.minutes}m left`;
              })()}
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tiers.map((tier) => {
          const config = TOURNAMENT_TIERS[tier];
          const available = isTournamentAvailable(tier, highestLevel);
          const entered = activeTournament?.tier === tier;
          const canAfford = coins >= config.entryFee;

          return (
            <View
              key={tier}
              style={[
                styles.card,
                { borderColor: available ? config.color : COLORS.surfaceBorder },
                entered && styles.cardEntered,
              ]}
            >
              <View style={styles.cardHeader}>
                <GameIcon name={config.icon as any} size={22} color={config.color} />
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardName, { color: config.color }]}>
                    {config.name}
                  </Text>
                  <Text style={styles.cardEntry}>
                    {config.entryFee === 0 ? 'Free entry' : `${config.entryFee} coins`}
                    {' · '}Level {config.entryLevel}+
                  </Text>
                </View>
              </View>

              <View style={styles.prizesRow}>
                <View style={styles.prizeCol}>
                  <Text style={styles.prizeLabel}>1ST</Text>
                  <View style={styles.prizeValues}>
                    <GameIcon name="coin" size={10} />
                    <Text style={styles.prizeText}>{config.prizes.first.coins}</Text>
                    <GameIcon name="gem" size={10} />
                    <Text style={styles.prizeText}>{config.prizes.first.gems}</Text>
                  </View>
                </View>
                <View style={styles.prizeCol}>
                  <Text style={styles.prizeLabel}>TOP 3</Text>
                  <View style={styles.prizeValues}>
                    <GameIcon name="coin" size={10} />
                    <Text style={styles.prizeText}>{config.prizes.third.coins}</Text>
                    <GameIcon name="gem" size={10} />
                    <Text style={styles.prizeText}>{config.prizes.third.gems}</Text>
                  </View>
                </View>
                <View style={styles.prizeCol}>
                  <Text style={styles.prizeLabel}>TOP 10</Text>
                  <View style={styles.prizeValues}>
                    <GameIcon name="coin" size={10} />
                    <Text style={styles.prizeText}>{config.prizes.topTen.coins}</Text>
                    <GameIcon name="gem" size={10} />
                    <Text style={styles.prizeText}>{config.prizes.topTen.gems}</Text>
                  </View>
                </View>
              </View>

              {entered ? (
                <View style={styles.enteredBox}>
                  <GameIcon name="check" size={12} color={COLORS.success} />
                  <Text style={styles.enteredText}>Entered</Text>
                </View>
              ) : !available ? (
                <View style={styles.lockBox}>
                  <GameIcon name="lock" size={10} color={COLORS.textMuted} />
                  <Text style={styles.lockText}>
                    Reach level {config.entryLevel}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={!canAfford || !!activeTournament}
                  onPress={() => handleEnter(tier)}
                  style={[
                    styles.enterButton,
                    (!canAfford || !!activeTournament) && styles.enterButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.enterButtonText}>
                    {activeTournament
                      ? 'Busy'
                      : canAfford
                      ? 'Enter'
                      : 'Need coins'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {tournamentBestScore > 0 && (
        <Text style={styles.bestText}>Best finish: #{tournamentBestScore}</Text>
      )}
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
    marginBottom: 10,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: RADII.md,
    borderWidth: 2,
    backgroundColor: COLORS.surfaceLight,
    marginBottom: 10,
    width: '100%',
  },
  activeText: {
    flex: 1,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  activeTime: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  scroll: {
    maxHeight: 360,
    width: '100%',
  },
  scrollContent: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderRadius: RADII.md,
    padding: 12,
    gap: 10,
  },
  cardEntered: {
    backgroundColor: `${COLORS.accent}10`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardEntry: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  prizesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prizeCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    borderRadius: RADII.sm,
  },
  prizeLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  prizeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  prizeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  enteredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: RADII.sm,
  },
  enteredText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.success,
  },
  lockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  enterButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    borderRadius: RADII.sm,
    alignItems: 'center',
  },
  enterButtonDisabled: {
    backgroundColor: COLORS.surfaceBorder,
  },
  enterButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bestText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentGold,
    marginTop: 10,
  },
});
