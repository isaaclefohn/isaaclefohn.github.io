/**
 * Quest Chain system.
 * Multi-step linked objectives that unlock sequentially as the player
 * progresses. Completing the final step grants a large bonus reward.
 * Quest chains act as onboarding tutorials and long-term goals.
 */

export type QuestStepKind =
  | 'reach_level'
  | 'total_stars'
  | 'clear_lines'
  | 'use_powerup'
  | 'perfect_levels'
  | 'play_games'
  | 'combo'
  | 'spend_coins';

export interface QuestStep {
  id: string;
  kind: QuestStepKind;
  target: number;
  title: string;
  description: string;
}

export interface QuestChain {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: QuestStep[];
  /** Grand reward upon completion */
  reward: {
    coins: number;
    gems: number;
    bomb?: number;
    rowClear?: number;
    colorClear?: number;
  };
}

export const QUEST_CHAINS: QuestChain[] = [
  {
    id: 'newbie',
    name: 'Getting Started',
    description: 'Learn the basics of Color Block Blast',
    icon: 'play',
    color: '#4ADE80',
    steps: [
      {
        id: 'newbie_1',
        kind: 'reach_level',
        target: 3,
        title: 'First Steps',
        description: 'Reach level 3',
      },
      {
        id: 'newbie_2',
        kind: 'total_stars',
        target: 10,
        title: 'Star Starter',
        description: 'Earn 10 stars',
      },
      {
        id: 'newbie_3',
        kind: 'clear_lines',
        target: 50,
        title: 'Line Rookie',
        description: 'Clear 50 lines total',
      },
    ],
    reward: { coins: 300, gems: 5, bomb: 1 },
  },
  {
    id: 'power_player',
    name: 'Power Player',
    description: 'Master the art of power-ups',
    icon: 'bomb',
    color: '#F87171',
    steps: [
      {
        id: 'power_1',
        kind: 'use_powerup',
        target: 5,
        title: 'First Boost',
        description: 'Use 5 power-ups',
      },
      {
        id: 'power_2',
        kind: 'combo',
        target: 5,
        title: 'Combo Artist',
        description: 'Get a 5x combo',
      },
      {
        id: 'power_3',
        kind: 'use_powerup',
        target: 25,
        title: 'Power User',
        description: 'Use 25 power-ups total',
      },
    ],
    reward: { coins: 500, gems: 10, bomb: 2, rowClear: 1 },
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Prove your mastery with perfect scores',
    icon: 'star',
    color: '#FACC15',
    steps: [
      {
        id: 'perfect_1',
        kind: 'perfect_levels',
        target: 5,
        title: 'Shining Start',
        description: 'Get 3 stars on 5 levels',
      },
      {
        id: 'perfect_2',
        kind: 'perfect_levels',
        target: 15,
        title: 'Star Hunter',
        description: 'Get 3 stars on 15 levels',
      },
      {
        id: 'perfect_3',
        kind: 'perfect_levels',
        target: 30,
        title: 'Perfectionist',
        description: 'Get 3 stars on 30 levels',
      },
    ],
    reward: { coins: 1000, gems: 25, bomb: 2, rowClear: 2, colorClear: 2 },
  },
  {
    id: 'marathon',
    name: 'Marathon Master',
    description: 'Play a lot, progress a lot',
    icon: 'fire',
    color: '#C084FC',
    steps: [
      {
        id: 'marathon_1',
        kind: 'play_games',
        target: 25,
        title: 'Casual Player',
        description: 'Play 25 games',
      },
      {
        id: 'marathon_2',
        kind: 'reach_level',
        target: 50,
        title: 'Halfway',
        description: 'Reach level 50',
      },
      {
        id: 'marathon_3',
        kind: 'play_games',
        target: 100,
        title: 'Dedicated',
        description: 'Play 100 games',
      },
      {
        id: 'marathon_4',
        kind: 'reach_level',
        target: 100,
        title: 'Century',
        description: 'Reach level 100',
      },
    ],
    reward: { coins: 2500, gems: 50, bomb: 3, rowClear: 3, colorClear: 3 },
  },
];

/** Calculate progress for a given quest step using current player stats */
export function getStepProgress(step: QuestStep, stats: QuestStats): number {
  switch (step.kind) {
    case 'reach_level':
      return stats.highestLevel;
    case 'total_stars':
      return stats.totalStars;
    case 'clear_lines':
      return stats.totalLinesCleared;
    case 'use_powerup':
      return stats.totalPowerUpsUsed;
    case 'perfect_levels':
      return stats.perfectLevels;
    case 'play_games':
      return stats.totalGamesPlayed;
    case 'combo':
      return stats.bestCombo;
    case 'spend_coins':
      return stats.totalCoinsSpent;
    default:
      return 0;
  }
}

export interface QuestStats {
  highestLevel: number;
  totalStars: number;
  totalLinesCleared: number;
  totalPowerUpsUsed: number;
  perfectLevels: number;
  totalGamesPlayed: number;
  bestCombo: number;
  totalCoinsSpent: number;
}

/** Returns the index of the current (not-yet-completed) step in the chain */
export function getCurrentStepIndex(chain: QuestChain, stats: QuestStats): number {
  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];
    if (getStepProgress(step, stats) < step.target) return i;
  }
  return chain.steps.length; // All complete
}

/** Returns true when every step in a chain is complete */
export function isChainComplete(chain: QuestChain, stats: QuestStats): boolean {
  return getCurrentStepIndex(chain, stats) >= chain.steps.length;
}

/** Overall chain progress as a 0-1 fraction */
export function getChainProgress(chain: QuestChain, stats: QuestStats): number {
  let totalProgress = 0;
  for (const step of chain.steps) {
    const progress = Math.min(1, getStepProgress(step, stats) / step.target);
    totalProgress += progress;
  }
  return totalProgress / chain.steps.length;
}
