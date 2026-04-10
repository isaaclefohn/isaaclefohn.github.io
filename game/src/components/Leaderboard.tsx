/**
 * Procedural leaderboard for social proof.
 * Generates believable "nearby players" with seeded random names and scores.
 * Creates implicit competition without requiring online services.
 * Inspired by Royal Match's "players near you" technique.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameIcon } from './GameIcon';
import { COLORS, RADII, SPACING } from '../utils/constants';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn',
  'Parker', 'Drew', 'Jamie', 'Blake', 'Avery', 'Skyler', 'Dakota', 'Reese',
  'Hayden', 'Charlie', 'Emery', 'Finley', 'Sage', 'Rowan', 'Kai', 'Phoenix',
  'River', 'Noel', 'Shay', 'Jules', 'Kit', 'Wren', 'Ash', 'Eden',
];

/** Simple seeded PRNG for deterministic leaderboard generation */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

interface LeaderboardProps {
  playerScore: number;
  playerName: string;
  level: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ playerScore, playerName, level }) => {
  const entries = useMemo<LeaderboardEntry[]>(() => {
    // Seed based on level + current day so it rotates daily
    const today = new Date();
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const rand = seededRand(level * 31337 + daySeed);

    // Generate 4 "nearby" players with scores around the player's score
    const others: LeaderboardEntry[] = [];
    for (let i = 0; i < 4; i++) {
      const nameIdx = Math.floor(rand() * FIRST_NAMES.length);
      const suffix = Math.floor(rand() * 900) + 100;
      const scoreDelta = Math.floor((rand() - 0.4) * playerScore * 0.6);
      others.push({
        rank: 0,
        name: `${FIRST_NAMES[nameIdx]}${suffix}`,
        score: Math.max(100, playerScore + scoreDelta),
        isPlayer: false,
      });
    }

    // Add the player
    others.push({
      rank: 0,
      name: playerName,
      score: playerScore,
      isPlayer: true,
    });

    // Sort descending and assign ranks
    others.sort((a, b) => b.score - a.score);
    others.forEach((e, i) => { e.rank = i + 1; });

    return others;
  }, [playerScore, playerName, level]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GameIcon name="trophy" size={14} color={COLORS.accentGold} />
        <Text style={styles.headerText}>Leaderboard</Text>
      </View>
      {entries.map((entry, i) => (
        <View
          key={i}
          style={[
            styles.row,
            entry.isPlayer && styles.playerRow,
          ]}
        >
          <Text style={[styles.rank, entry.rank === 1 && styles.rank1]}>
            {entry.rank}
          </Text>
          <Text
            style={[styles.name, entry.isPlayer && styles.playerName]}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          <Text style={[styles.score, entry.isPlayer && styles.playerScore]}>
            {entry.score.toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  playerRow: {
    backgroundColor: `${COLORS.accent}15`,
  },
  rank: {
    width: 20,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  rank1: {
    color: COLORS.accentGold,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  playerName: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  score: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  playerScore: {
    color: COLORS.accentGold,
  },
});
