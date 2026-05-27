/**
 * Coverage for `maxComboThisRun` tracking and the related fix to
 * lifetime `bestCombo` updates.
 *
 * Before this change, `gameState.combo` was passed to `recordZenGame`
 * / `recordGamePlayed` at game-over. The live combo is almost always
 * 0 at game-over because game-over fires on a no-clear placement that
 * just reset the chain. Lifetime `bestCombo` therefore almost never
 * updated to reflect actual peak chains.
 *
 * `maxComboThisRun` is the per-run high-water mark — only ever grows,
 * survives the final no-clear reset, and is what should now feed both
 * the lose-modal display ("Peak combo: 5x") and the persisted
 * `bestCombo` lifetime stat.
 */

import { initGame, type LevelConfig } from '../game/engine/GameLoop';
import { PIECE_POOLS } from '../game/engine/Piece';

function basicConfig(): LevelConfig {
  return {
    levelNumber: 0,
    gridSize: 8,
    objective: { type: 'score', target: 999_999 },
    piecePool: PIECE_POOLS.easy,
    starThresholds: [100, 200, 300],
    seed: 42,
    paletteSize: 4,
  };
}

describe('GameState.maxComboThisRun', () => {
  it('initializes to 0 on a fresh game', () => {
    const state = initGame(basicConfig());
    expect(state.maxComboThisRun).toBe(0);
  });

  it('is present in the GameState schema', () => {
    const state = initGame(basicConfig());
    expect('maxComboThisRun' in state).toBe(true);
    expect(typeof state.maxComboThisRun).toBe('number');
  });

  // Note: the actual peak-tracking math (Math.max on each turn) lives
  // inside processTurn and is exercised end-to-end by the integration-
  // level Board / Scoring tests. We pin the *schema* here so a future
  // refactor that accidentally removes the field gets caught.
});
