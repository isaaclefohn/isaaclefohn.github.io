/**
 * Tests for the core game-state machine (gameStore) — previously 0% covered
 * despite being the heart of gameplay. Exercises every action and locks the
 * gameplay fixes shipped this session:
 *   - swapPieces: free first swap, then 25-coin cost, refusal when broke,
 *     palette honored, golden index cleared in level mode
 *   - holdPiece invalidates the undo snapshot (hold-then-undo no longer
 *     destroys the held piece)
 *   - applyPowerUp threads linesCleared / maxComboThisRun / chromaticClears
 *   - undo one-shot semantics
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    getAllKeys: () => Promise.resolve([] as string[]),
    multiGet: () => Promise.resolve([]),
    multiSet: () => Promise.resolve(),
    multiRemove: () => Promise.resolve(),
  },
}));

// gameStore imports `trackGameEvent` from services/analytics, which pulls in
// expo-constants (an ESM-only native module the ts-jest/node runtime can't
// parse). Stub the analytics surface so the store loads under test — this is
// exactly why gameStore sat at 0% coverage.
jest.mock('../services/analytics', () => ({
  trackGameEvent: () => {},
  track: () => {},
  initSentry: () => {},
  initAnalytics: () => {},
}));

import { useGameStore } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { getLevel, getEndlessConfig } from '../game/levels/LevelGenerator';
import type { LevelConfig } from '../game/engine/GameLoop';

/** A normal level with an unreachable score target so placements never
 *  end the run mid-test, and a small fixed palette to test palette plumbing. */
const testConfig = (): LevelConfig => ({
  ...getLevel(6),
  objective: { type: 'score', target: 1_000_000 },
  paletteSize: 4,
  seed: 12345,
});

const gs = () => useGameStore.getState();

describe('gameStore.startLevel', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('initializes a playing game with three pieces and an empty board', () => {
    const s = gs().gameState!;
    expect(s.status).toBe('playing');
    expect(s.availablePieces).toHaveLength(3);
    expect(s.availablePieces.every(p => p !== null)).toBe(true);
    expect(s.score).toBe(0);
    expect(s.piecesPlaced).toBe(0);
    expect(s.grid.flat().every(c => c === 0)).toBe(true);
    expect(gs().selectedPieceIndex).toBeNull();
    expect(gs().undoSnapshot).toBeNull();
  });
});

describe('gameStore.placePiece', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('places a valid piece, increments piecesPlaced, and snapshots for undo', () => {
    const ok = gs().placePiece(0, 0, 0); // top-left of an empty board
    expect(ok).toBe(true);
    expect(gs().gameState!.piecesPlaced).toBe(1);
    expect(gs().gameState!.availablePieces[0]).toBeNull(); // consumed
    expect(gs().undoSnapshot).not.toBeNull();
  });

  it('rejects an out-of-bounds placement without mutating state', () => {
    const before = gs().gameState!.piecesPlaced;
    const ok = gs().placePiece(0, 100, 100);
    expect(ok).toBe(false);
    expect(gs().gameState!.piecesPlaced).toBe(before);
  });

  it('rejects placement when the game is not playing', () => {
    gs().pauseGame();
    expect(gs().placePiece(0, 0, 0)).toBe(false);
  });
});

describe('gameStore.rotatePiece', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('replaces the tray piece with a rotated variant', () => {
    const before = gs().gameState!.availablePieces[0];
    const ok = gs().rotatePiece(0);
    expect(ok).toBe(true);
    // Same slot still filled; rotation yields a (possibly) new cell layout.
    expect(gs().gameState!.availablePieces[0]).not.toBeNull();
    // Rotating a square is a no-op shape-wise but the call still succeeds;
    // for most pieces the cells array differs. Just assert it didn't crash
    // and the piece object is present.
    expect(before).not.toBeNull();
  });
});

describe('gameStore.swapPieces', () => {
  beforeEach(() => {
    gs().startLevel(testConfig());
    usePlayerStore.setState({ coins: 1000 });
  });

  it('first swap is free and increments swapsUsed', () => {
    const coinsBefore = usePlayerStore.getState().coins;
    const ok = gs().swapPieces();
    expect(ok).toBe(true);
    expect(gs().gameState!.swapsUsed).toBe(1);
    expect(usePlayerStore.getState().coins).toBe(coinsBefore); // free
  });

  it('second swap costs 25 coins', () => {
    gs().swapPieces(); // free
    const coinsBefore = usePlayerStore.getState().coins;
    const ok = gs().swapPieces();
    expect(ok).toBe(true);
    expect(gs().gameState!.swapsUsed).toBe(2);
    expect(usePlayerStore.getState().coins).toBe(coinsBefore - 25);
  });

  it('refuses the paid swap when the player cannot afford it', () => {
    gs().swapPieces(); // free, swapsUsed=1
    usePlayerStore.setState({ coins: 10 }); // < 25
    const ok = gs().swapPieces();
    expect(ok).toBe(false);
    expect(gs().gameState!.swapsUsed).toBe(1); // unchanged
    expect(usePlayerStore.getState().coins).toBe(10); // not spent
  });

  it('honors the active palette (no color above paletteSize)', () => {
    gs().swapPieces();
    const colors = gs().gameState!.availablePieces
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map(p => p.colorIndex);
    expect(colors.every(c => c >= 1 && c <= 4)).toBe(true); // paletteSize 4
  });

  it('clears the golden index in level mode', () => {
    gs().swapPieces();
    expect(gs().gameState!.goldenPieceIndex).toBeNull();
  });
});

describe('gameStore hold + retrieve', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('moves a tray piece into the hold slot and back', () => {
    const piece0 = gs().gameState!.availablePieces[0];
    expect(gs().holdPiece(0)).toBe(true);
    expect(gs().heldPiece).toBe(piece0);
    expect(gs().gameState!.availablePieces[0]).toBeNull();

    expect(gs().retrieveHeldPiece()).toBe(true);
    expect(gs().heldPiece).toBeNull();
    // retrieved into the first empty slot (slot 0)
    expect(gs().gameState!.availablePieces[0]).toBe(piece0);
  });

  it('invalidates the undo snapshot so hold-then-undo cannot destroy the held piece', () => {
    gs().placePiece(0, 0, 0);     // creates an undo snapshot
    expect(gs().canUndo()).toBe(true);
    gs().holdPiece(1);            // holding must drop the snapshot
    expect(gs().canUndo()).toBe(false);
    expect(gs().undoLastMove()).toBe(false);
    // The held piece survives (was not clobbered by a stale-snapshot undo).
    expect(gs().heldPiece).not.toBeNull();
  });
});

describe('gameStore.undoLastMove', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('restores the pre-placement board and is a one-shot per level', () => {
    const emptyBoard = gs().gameState!.grid.flat().every(c => c === 0);
    expect(emptyBoard).toBe(true);
    gs().placePiece(0, 0, 0);
    expect(gs().gameState!.grid.flat().some(c => c !== 0)).toBe(true); // board changed
    expect(gs().undoLastMove()).toBe(true);
    expect(gs().gameState!.grid.flat().every(c => c === 0)).toBe(true); // restored
    // one-shot: a second undo with no new placement is refused
    expect(gs().undoLastMove()).toBe(false);
  });
});

describe('gameStore.applyPowerUp', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('bomb clears a 3x3 region and preserves run-total bookkeeping', () => {
    // Hand-fill a region so the bomb has something to clear.
    const s = gs().gameState!;
    const grid = s.grid.map(r => [...r]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = 1;
    useGameStore.setState({ gameState: { ...s, grid } });

    const before = gs().gameState!;
    const result = gs().applyPowerUp('bomb', 1, 1); // center of the filled block
    expect(result).not.toBeNull();
    expect(result!.cellsCleared).toBeGreaterThan(0);
    // The session's bookkeeping fix: these must remain defined numbers, not
    // dropped to undefined, after a power-up write.
    const after = gs().gameState!;
    expect(typeof after.linesCleared).toBe('number');
    expect(typeof after.maxComboThisRun).toBe('number');
    expect(after.linesCleared).toBeGreaterThanOrEqual(before.linesCleared);
    // The bombed cells are gone.
    expect(after.grid[1][1]).toBe(0);
  });

  it('color clear on an empty cell is a no-op (returns null)', () => {
    // Fresh board is empty; colorClear keyed on an empty cell color (0)
    // must not "clear" the whole empty board.
    const result = gs().applyPowerUp('colorClear', 0, 0);
    expect(result).toBeNull();
  });
});

describe('gameStore.continueGame', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('resumes a lost game with a fresh tray', () => {
    // Force a lost state.
    const s = gs().gameState!;
    useGameStore.setState({ gameState: { ...s, status: 'lost' } });
    const ok = gs().continueGame();
    expect(ok).toBe(true);
    expect(gs().gameState!.status).toBe('playing');
    expect(gs().gameState!.availablePieces).toHaveLength(3);
  });

  it('refuses to continue a game that is still playing', () => {
    expect(gs().continueGame()).toBe(false);
  });
});

describe('gameStore pause / resume', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('toggles between playing and paused', () => {
    gs().pauseGame();
    expect(gs().gameState!.status).toBe('paused');
    gs().resumeGame();
    expect(gs().gameState!.status).toBe('playing');
  });

  it('resume only acts on a paused game', () => {
    gs().resumeGame(); // already playing — no-op
    expect(gs().gameState!.status).toBe('playing');
  });
});

describe('gameStore endless golden piece', () => {
  it('endless mode may roll a golden piece index (or null), never out of range', () => {
    gs().startLevel(getEndlessConfig());
    const idx = gs().gameState!.goldenPieceIndex;
    if (idx !== null) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(gs().gameState!.availablePieces.length);
    }
  });
});

/** Fill the whole board so NO generated piece can be placed (in any rotation). */
const fillBoard = (status: 'playing' | 'lost') => {
  const s = gs().gameState!;
  const fullGrid = s.grid.map((row) => row.map(() => 1));
  useGameStore.setState({ gameState: { ...s, grid: fullGrid, status }, heldPiece: null });
};

describe('gameStore.swapPieces soft-lock guard', () => {
  beforeEach(() => {
    gs().startLevel(testConfig());
    usePlayerStore.setState({ coins: 1000 });
  });

  it('a swap that yields an all-dead tray surfaces game-over (no soft-lock)', () => {
    fillBoard('playing'); // every cell filled -> nothing the reroll produces can fit
    expect(gs().swapPieces()).toBe(true);
    expect(gs().gameState!.status).toBe('lost');
  });

  it('a swap on an open board keeps the game playing', () => {
    expect(gs().swapPieces()).toBe(true); // empty board, any piece fits
    expect(gs().gameState!.status).toBe('playing');
  });
});

describe('gameStore.continueGame soft-lock guard', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('continuing onto an open board resumes play with a fresh full tray', () => {
    const s = gs().gameState!;
    useGameStore.setState({ gameState: { ...s, status: 'lost' } }); // empty board, lost
    expect(gs().continueGame()).toBe(true);
    expect(gs().gameState!.status).toBe('playing');
    expect(gs().gameState!.availablePieces.filter((p) => p !== null)).toHaveLength(3);
  });

  it('continuing onto a completely full board honestly stays lost (no soft-lock)', () => {
    fillBoard('lost'); // board truly dead: even 8 retries can't find a placeable set
    expect(gs().continueGame()).toBe(true);
    expect(gs().gameState!.status).toBe('lost');
  });
});

describe('gameStore selectors + previews', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('getStars is 0 at score 0 and saturates at 3 for a dominating score', () => {
    expect(gs().getStars()).toBe(0);
    const s = gs().gameState!;
    useGameStore.setState({ gameState: { ...s, score: 10_000_000 } });
    expect(gs().getStars()).toBe(3);
  });

  it('peekNextPieces previews a full set WITHOUT consuming the real RNG (idempotent)', () => {
    const a = gs().peekNextPieces();
    const b = gs().peekNextPieces();
    expect(a).toHaveLength(3);
    // It clones the RNG, so repeated peeks are identical AND the live spawn is
    // unaffected — the "NEXT" preview can never desync from what actually
    // spawns. A non-cloning impl would advance the RNG and return a different
    // set on the second call.
    expect(b.map((p) => p.id)).toEqual(a.map((p) => p.id));
    // Colors honor the active palette (testConfig paletteSize 4).
    expect(a.every((p) => p.colorIndex >= 1 && p.colorIndex <= 4)).toBe(true);
  });

  it('resetLevel re-initializes board, score, and tray from the stored config', () => {
    gs().placePiece(0, 0, 0); // mutate: board now non-empty, piecesPlaced 1
    expect(gs().gameState!.piecesPlaced).toBe(1);
    gs().resetLevel();
    const s = gs().gameState!;
    expect(s.piecesPlaced).toBe(0);
    expect(s.score).toBe(0);
    expect(s.grid.flat().every((c) => c === 0)).toBe(true);
    expect(s.availablePieces).toHaveLength(3);
  });

  it('selectPiece sets and clears the selected index', () => {
    gs().selectPiece(2);
    expect(gs().selectedPieceIndex).toBe(2);
    gs().selectPiece(null);
    expect(gs().selectedPieceIndex).toBeNull();
  });
});

/**
 * runId is the once-per-run accounting key. The contract the lose-accounting
 * fix depends on: a fresh id per run (new level / retry / restart), but the
 * SAME id preserved across every in-run transition — most importantly a paid
 * Continue, which takes status lost -> playing -> lost on the SAME run and
 * must therefore count the run only once.
 */
describe('gameStore runId + lastAccountedRunId (once-per-run gate)', () => {
  beforeEach(() => gs().startLevel(testConfig()));

  it('mints a distinct runId on each startLevel, and resets lastAccountedRunId', () => {
    const r1 = gs().gameState!.runId;
    expect(typeof r1).toBe('number');
    useGameStore.setState({ lastAccountedRunId: r1 }); // pretend this run was accounted
    gs().startLevel(testConfig());
    expect(gs().gameState!.runId).not.toBe(r1);        // fresh run
    expect(gs().lastAccountedRunId).toBeNull();        // gate cleared for the new run
  });

  it('resetLevel mints a fresh runId — a retry is a new run', () => {
    const r1 = gs().gameState!.runId;
    gs().resetLevel();
    expect(gs().gameState!.runId).not.toBe(r1);
  });

  it('preserves runId across a paid Continue (lost -> playing is the SAME run)', () => {
    const r = gs().gameState!.runId;
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'lost' } });
    expect(gs().continueGame()).toBe(true);
    expect(gs().gameState!.status).toBe('playing');
    expect(gs().gameState!.runId).toBe(r); // unchanged — still the same run
  });

  it('preserves runId across swap, place/undo, hold, and pause/resume', () => {
    usePlayerStore.setState({ coins: 1000 });
    const r = gs().gameState!.runId;
    gs().swapPieces();
    expect(gs().gameState!.runId).toBe(r);
    gs().placePiece(0, 0, 0);
    expect(gs().gameState!.runId).toBe(r);
    gs().undoLastMove();
    expect(gs().gameState!.runId).toBe(r);
    gs().holdPiece(0);
    expect(gs().gameState!.runId).toBe(r);
    gs().pauseGame();
    gs().resumeGame();
    expect(gs().gameState!.runId).toBe(r);
  });

  it('markRunAccounted stamps the run as finalized', () => {
    const r = gs().gameState!.runId;
    expect(gs().lastAccountedRunId).toBeNull();
    gs().markRunAccounted(r);
    expect(gs().lastAccountedRunId).toBe(r);
  });
});

describe('gameStore undo-snapshot invalidation by swap / power-up', () => {
  beforeEach(() => {
    gs().startLevel(testConfig());
    usePlayerStore.setState({ coins: 1000 });
  });

  it('swapPieces invalidates the placement undo snapshot (no stale revert)', () => {
    gs().placePiece(0, 0, 0); // creates an undo snapshot
    expect(gs().canUndo()).toBe(true);
    gs().swapPieces(); // rerolls the tray + advances RNG -> snapshot is now stale
    expect(gs().canUndo()).toBe(false);
    expect(gs().undoLastMove()).toBe(false); // can't revert to a state that erases the swap
  });

  it('applyPowerUp invalidates the placement undo snapshot (no resurrected cells)', () => {
    gs().placePiece(0, 0, 0); // creates an undo snapshot
    expect(gs().canUndo()).toBe(true);
    // Hand-fill a 3x3 block so the bomb actually clears cells (the set() runs).
    const s = gs().gameState!;
    const grid = s.grid.map((r) => [...r]);
    for (let r = 2; r < 5; r++) for (let c = 2; c < 5; c++) grid[r][c] = 1;
    useGameStore.setState({ gameState: { ...s, grid } });
    const res = gs().applyPowerUp('bomb', 3, 3);
    expect(res).not.toBeNull(); // cleared cells -> the power-up write executed
    expect(gs().canUndo()).toBe(false); // undo can't resurrect the bombed cells
    expect(gs().undoLastMove()).toBe(false);
  });

  it('continueGame invalidates the losing-placement snapshot (no gem-wasting revert)', () => {
    gs().placePiece(0, 0, 0); // snapshot created, status 'playing'
    expect(gs().canUndo()).toBe(true);
    // Simulate that placement having ended the run (the snapshot survives — it's
    // a top-level store field, not part of gameState).
    useGameStore.setState({ gameState: { ...gs().gameState!, status: 'lost' } });
    expect(gs().continueGame()).toBe(true);
    expect(gs().gameState!.status).toBe('playing');
    expect(gs().canUndo()).toBe(false); // can't undo the loss you paid to continue past
  });
});
