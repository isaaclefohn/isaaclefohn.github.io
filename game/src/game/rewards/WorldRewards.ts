/**
 * World completion reward system.
 * Awards bonus rewards when a player completes all levels in a world.
 * Separate bonuses for all-cleared and all-3-starred.
 *
 * Worlds are 50 levels each, 10 worlds total (500 levels).
 */

import { WORLDS, getWorldForLevel } from '../levels/Worlds';

export interface WorldReward {
  worldId: number;
  worldName: string;
  worldIcon: string;
  worldColor: string;
  clearReward: { coins: number; gems: number };
  perfectReward: { coins: number; gems: number; powerUps: { bomb: number; rowClear: number; colorClear: number } };
}

/** Rewards scale with world difficulty */
const WORLD_REWARD_TABLE: Record<number, { clear: { coins: number; gems: number }; perfect: { coins: number; gems: number; bomb: number; rowClear: number; colorClear: number } }> = {
  1: { clear: { coins: 100, gems: 5 }, perfect: { coins: 200, gems: 10, bomb: 2, rowClear: 1, colorClear: 1 } },
  2: { clear: { coins: 150, gems: 8 }, perfect: { coins: 300, gems: 15, bomb: 3, rowClear: 2, colorClear: 1 } },
  3: { clear: { coins: 200, gems: 10 }, perfect: { coins: 400, gems: 20, bomb: 3, rowClear: 2, colorClear: 2 } },
  4: { clear: { coins: 300, gems: 12 }, perfect: { coins: 500, gems: 25, bomb: 4, rowClear: 3, colorClear: 2 } },
  5: { clear: { coins: 400, gems: 15 }, perfect: { coins: 700, gems: 30, bomb: 4, rowClear: 3, colorClear: 3 } },
  6: { clear: { coins: 500, gems: 18 }, perfect: { coins: 900, gems: 40, bomb: 5, rowClear: 4, colorClear: 3 } },
  7: { clear: { coins: 600, gems: 20 }, perfect: { coins: 1100, gems: 50, bomb: 5, rowClear: 4, colorClear: 4 } },
  8: { clear: { coins: 750, gems: 25 }, perfect: { coins: 1400, gems: 60, bomb: 6, rowClear: 5, colorClear: 4 } },
  9: { clear: { coins: 900, gems: 30 }, perfect: { coins: 1700, gems: 75, bomb: 7, rowClear: 5, colorClear: 5 } },
  10: { clear: { coins: 1200, gems: 40 }, perfect: { coins: 2500, gems: 100, bomb: 10, rowClear: 7, colorClear: 7 } },
};

/** Get reward config for a world by index (1-based) */
export function getWorldReward(worldIndex: number): WorldReward {
  const world = WORLDS[worldIndex - 1];
  const rewards = WORLD_REWARD_TABLE[worldIndex] ?? WORLD_REWARD_TABLE[1];

  return {
    worldId: world.id,
    worldName: world.name,
    worldIcon: world.icon,
    worldColor: world.color,
    clearReward: rewards.clear,
    perfectReward: {
      coins: rewards.perfect.coins,
      gems: rewards.perfect.gems,
      powerUps: {
        bomb: rewards.perfect.bomb,
        rowClear: rewards.perfect.rowClear,
        colorClear: rewards.perfect.colorClear,
      },
    },
  };
}

/** Check world completion status */
export function getWorldCompletionStatus(
  worldIndex: number,
  levelStars: Record<number, number>,
): { cleared: boolean; perfected: boolean; levelsCleared: number; levelsPerfected: number; totalLevels: number } {
  const startLevel = (worldIndex - 1) * 50 + 1;
  const endLevel = worldIndex * 50;
  const totalLevels = 50;

  let levelsCleared = 0;
  let levelsPerfected = 0;

  for (let lvl = startLevel; lvl <= endLevel; lvl++) {
    // A level counts as CLEARED if it has been won at least once —
    // i.e. it has an entry in levelStars (completeLevel, the only writer,
    // runs solely on a win). The previous gate of `stars > 0` silently
    // excluded legitimate 0-star WINS of chromatic-objective levels
    // (Level 30/60/90/…), whose win condition is "N chromatic clears",
    // NOT a score threshold — so a player can satisfy the objective while
    // scoring below the 1-star cutoff. That player advanced past the
    // level (highestLevel moved) but the world-clear reward never fired
    // because levelStars[L] stayed 0. Counting by entry-presence fixes
    // the inconsistency; perfected still requires a true 3-star.
    const stars = levelStars[lvl];
    if (stars !== undefined) levelsCleared++;
    if ((stars ?? 0) >= 3) levelsPerfected++;
  }

  return {
    cleared: levelsCleared >= totalLevels,
    perfected: levelsPerfected >= totalLevels,
    levelsCleared,
    levelsPerfected,
    totalLevels,
  };
}

/** Get all world completion statuses */
export function getAllWorldStatuses(
  levelStars: Record<number, number>,
): Array<{
  worldIndex: number;
  reward: WorldReward;
  status: ReturnType<typeof getWorldCompletionStatus>;
}> {
  return WORLDS.map((_, i) => ({
    worldIndex: i + 1,
    reward: getWorldReward(i + 1),
    status: getWorldCompletionStatus(i + 1, levelStars),
  }));
}
