/**
 * Tournament system.
 * Limited-time 24-hour score-based tournaments with tiered brackets.
 * Players compete against seeded bots and earn tier rewards based on
 * their final position when the tournament ends.
 */

export type TournamentTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface TournamentConfig {
  id: string;
  name: string;
  tier: TournamentTier;
  durationHours: number;
  /** Minimum player level to enter */
  entryLevel: number;
  /** Entry fee in coins (0 for free) */
  entryFee: number;
  /** Prize pool structure by rank */
  prizes: {
    first: { coins: number; gems: number };
    second: { coins: number; gems: number };
    third: { coins: number; gems: number };
    topTen: { coins: number; gems: number };
    participation: { coins: number; gems: number };
  };
  color: string;
  icon: string;
}

export const TOURNAMENT_TIERS: Record<TournamentTier, TournamentConfig> = {
  bronze: {
    id: 'tournament_bronze',
    name: 'Bronze Tournament',
    tier: 'bronze',
    durationHours: 24,
    entryLevel: 5,
    entryFee: 0,
    prizes: {
      first: { coins: 500, gems: 10 },
      second: { coins: 300, gems: 5 },
      third: { coins: 200, gems: 3 },
      topTen: { coins: 100, gems: 1 },
      participation: { coins: 25, gems: 0 },
    },
    color: '#CD7F32',
    icon: 'medal-bronze',
  },
  silver: {
    id: 'tournament_silver',
    name: 'Silver Tournament',
    tier: 'silver',
    durationHours: 24,
    entryLevel: 25,
    entryFee: 200,
    prizes: {
      first: { coins: 1500, gems: 25 },
      second: { coins: 900, gems: 15 },
      third: { coins: 600, gems: 10 },
      topTen: { coins: 300, gems: 5 },
      participation: { coins: 75, gems: 1 },
    },
    color: '#C0C0C0',
    icon: 'medal-silver',
  },
  gold: {
    id: 'tournament_gold',
    name: 'Gold Tournament',
    tier: 'gold',
    durationHours: 24,
    entryLevel: 75,
    entryFee: 500,
    prizes: {
      first: { coins: 3500, gems: 60 },
      second: { coins: 2000, gems: 35 },
      third: { coins: 1200, gems: 20 },
      topTen: { coins: 600, gems: 10 },
      participation: { coins: 150, gems: 2 },
    },
    color: '#FACC15',
    icon: 'medal-gold',
  },
  diamond: {
    id: 'tournament_diamond',
    name: 'Diamond Tournament',
    tier: 'diamond',
    durationHours: 24,
    entryLevel: 150,
    entryFee: 1500,
    prizes: {
      first: { coins: 8000, gems: 120 },
      second: { coins: 5000, gems: 75 },
      third: { coins: 3000, gems: 50 },
      topTen: { coins: 1500, gems: 25 },
      participation: { coins: 400, gems: 5 },
    },
    color: '#22D3EE',
    icon: 'crown',
  },
};

export interface TournamentState {
  id: string;
  tier: TournamentTier;
  startedAt: number;
  endsAt: number;
  playerScore: number;
  entered: boolean;
}

/** Check if a tournament tier is available for the player */
export function isTournamentAvailable(tier: TournamentTier, highestLevel: number): boolean {
  return highestLevel >= TOURNAMENT_TIERS[tier].entryLevel;
}

/** Get the highest tier the player can enter */
export function getHighestTier(highestLevel: number): TournamentTier | null {
  const tiers: TournamentTier[] = ['diamond', 'gold', 'silver', 'bronze'];
  for (const t of tiers) {
    if (isTournamentAvailable(t, highestLevel)) return t;
  }
  return null;
}

/** Compute time remaining in a tournament as hours/minutes */
export function getTimeRemaining(endsAt: number, now: number = Date.now()): { hours: number; minutes: number; expired: boolean } {
  const diffMs = endsAt - now;
  if (diffMs <= 0) return { hours: 0, minutes: 0, expired: true };
  return {
    hours: Math.floor(diffMs / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    expired: false,
  };
}

/** Get rank-based prize for a tournament result */
export function getPrizeForRank(
  rank: number,
  config: TournamentConfig,
): { coins: number; gems: number } {
  if (rank === 1) return config.prizes.first;
  if (rank === 2) return config.prizes.second;
  if (rank === 3) return config.prizes.third;
  if (rank <= 10) return config.prizes.topTen;
  return config.prizes.participation;
}

/** Simulate a simple final rank based on player score and tier */
export function simulateFinalRank(playerScore: number, tier: TournamentTier, seed: number): number {
  // Tougher tiers = more competitive bots, higher average score
  const tierStrength: Record<TournamentTier, number> = {
    bronze: 1.0,
    silver: 1.4,
    gold: 1.8,
    diamond: 2.5,
  };

  const strength = tierStrength[tier];
  const rng = ((seed * 9301 + 49297) % 233280) / 233280;
  const competitorAvg = playerScore * strength * (0.7 + rng * 0.6);

  if (playerScore >= competitorAvg * 2) return 1;
  if (playerScore >= competitorAvg * 1.6) return Math.max(1, Math.floor(rng * 3) + 1);
  if (playerScore >= competitorAvg * 1.3) return Math.max(3, Math.floor(rng * 7) + 3);
  if (playerScore >= competitorAvg) return Math.max(10, Math.floor(rng * 15) + 10);
  if (playerScore >= competitorAvg * 0.7) return Math.max(20, Math.floor(rng * 30) + 20);
  return Math.max(50, Math.floor(rng * 50) + 50);
}
