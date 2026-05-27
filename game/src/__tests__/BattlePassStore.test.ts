/**
 * Regression coverage for the three Battle Pass + achievement findings
 * from the second defensive-audit pass:
 *
 *   1. `claimBattlePassTier` idempotency — every other claim action
 *      in the store uses the same includes-guard pattern; this was
 *      the only outlier and would silently push duplicates on a
 *      rapid double-tap.
 *
 *   2. `startNewBattlePassSeason` reset — without an explicit
 *      season-rollover action, the old `battlePassClaimedTiers`
 *      list would persist into the new season and every tier
 *      would render as already-claimed (because the UI's
 *      `includes(tier)` check has no season qualifier).
 *
 *   3. Achievement coin rewards apply the 2x boost — they're
 *      gameplay-earned rewards (same class as quest payouts,
 *      level wins, etc.) so a player on an active "Double Time"
 *      boost should get doubled coins on achievement unlock.
 *      Previously `checkAchievements` mutated `s.coins` directly
 *      and bypassed `applyBoost`.
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

import { ACHIEVEMENTS, usePlayerStore } from '../store/playerStore';

describe('claimBattlePassTier idempotency', () => {
  beforeEach(() => {
    usePlayerStore.setState({ battlePassClaimedTiers: [] });
  });

  it('records a fresh tier claim', () => {
    usePlayerStore.getState().claimBattlePassTier(3);
    expect(usePlayerStore.getState().battlePassClaimedTiers).toEqual([3]);
  });

  it('does NOT push a duplicate tier on double-tap', () => {
    // THE BUG THIS FIXES. Before the includes-guard, both calls to
    // claimBattlePassTier(3) would push and the list would be [3,3].
    // Downstream `claimedTiers.includes(3)` still returns true but
    // any code that filters/counts entries would see two — and the
    // listener-side reward grant fires once per tap in the UI, so
    // a rapid double-tap would already have credited twice.
    const claim = usePlayerStore.getState().claimBattlePassTier;
    claim(3);
    claim(3);
    claim(3);
    expect(usePlayerStore.getState().battlePassClaimedTiers).toEqual([3]);
  });

  it('accumulates distinct tiers in order', () => {
    const claim = usePlayerStore.getState().claimBattlePassTier;
    claim(1);
    claim(2);
    claim(5);
    expect(usePlayerStore.getState().battlePassClaimedTiers).toEqual([1, 2, 5]);
  });
});

describe('startNewBattlePassSeason', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      battlePassSeason: 1,
      battlePassXP: 4200,
      battlePassClaimedTiers: [1, 2, 3, 4, 5],
      battlePassPremium: true,
    });
  });

  it('increments the season and resets XP + claimed tiers', () => {
    usePlayerStore.getState().startNewBattlePassSeason(2);
    const s = usePlayerStore.getState();
    expect(s.battlePassSeason).toBe(2);
    expect(s.battlePassXP).toBe(0);
    expect(s.battlePassClaimedTiers).toEqual([]);
  });

  it('PRESERVES premium status across the rollover', () => {
    // Premium is a persistent entitlement — the player paid for it
    // (or unlocked it some other persistent way) and shouldn't have
    // to re-buy on each season rollover. This pins that.
    usePlayerStore.getState().startNewBattlePassSeason(2);
    expect(usePlayerStore.getState().battlePassPremium).toBe(true);
  });

  it('is idempotent on same-season call', () => {
    // Calling startNewBattlePassSeason(2) twice produces the same
    // end state — useful for retry-on-failure flows or just
    // defensive replay protection.
    const start = usePlayerStore.getState().startNewBattlePassSeason;
    start(2);
    // simulate the player earning some XP in season 2
    usePlayerStore.setState({ battlePassXP: 500, battlePassClaimedTiers: [1] });
    start(2); // calling for the SAME season should still wipe
    const s = usePlayerStore.getState();
    expect(s.battlePassSeason).toBe(2);
    expect(s.battlePassXP).toBe(0);
    expect(s.battlePassClaimedTiers).toEqual([]);
  });
});

describe('wave-tier achievements', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      coins: 0,
      gems: 0,
      unlockedAchievements: [],
      activeBoostUntil: {},
      bestWaveReached: 0,
      bestCombo: 0,
      totalLinesCleared: 0,
      highestLevel: 0,
      totalScore: 0,
      longestStreak: 0,
      totalChromaticClears: 0,
      totalPowerUpsUsed: 0,
      levelStars: {},
    });
  });

  it('does NOT unlock wave achievements at bestWaveReached 0', () => {
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).not.toContain('wave_5');
    expect(unlocked).not.toContain('wave_10');
    expect(unlocked).not.toContain('wave_20');
  });

  it('unlocks wave_5 at exactly wave 5', () => {
    usePlayerStore.setState({ bestWaveReached: 5 });
    usePlayerStore.getState().checkAchievements();
    expect(usePlayerStore.getState().unlockedAchievements).toContain('wave_5');
    // wave_10 should NOT unlock yet
    expect(usePlayerStore.getState().unlockedAchievements).not.toContain('wave_10');
  });

  it('unlocks wave_5 and wave_10 at wave 10', () => {
    usePlayerStore.setState({ bestWaveReached: 10 });
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).toContain('wave_5');
    expect(unlocked).toContain('wave_10');
    expect(unlocked).not.toContain('wave_20');
  });

  it('unlocks all three at wave 20+', () => {
    usePlayerStore.setState({ bestWaveReached: 25 });
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).toContain('wave_5');
    expect(unlocked).toContain('wave_10');
    expect(unlocked).toContain('wave_20');
  });

  it('credits scaled rewards: 50 + 150 + 500 = 700 coins on first wave 20 run', () => {
    // If a player goes from never-played to wave 20 in one session,
    // all three achievements unlock at once and the rewards are
    // additive. 50 (wave_5) + 150 (wave_10) + 500 (wave_20) = 700.
    usePlayerStore.setState({ bestWaveReached: 20 });
    usePlayerStore.getState().checkAchievements();
    const s = usePlayerStore.getState();
    expect(s.coins).toBe(700);
    expect(s.gems).toBe(25); // 5 from wave_10 + 20 from wave_20
  });
});

describe('combo-tier achievements (FEVER / UNSTOPPABLE / GODLIKE)', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      coins: 0,
      gems: 0,
      unlockedAchievements: [],
      activeBoostUntil: {},
      bestWaveReached: 0,
      bestCombo: 0,
      totalLinesCleared: 0,
      highestLevel: 0,
      totalScore: 0,
      longestStreak: 0,
      totalChromaticClears: 0,
      totalPowerUpsUsed: 0,
      levelStars: {},
    });
  });

  it('does NOT unlock combo achievements at bestCombo 0', () => {
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).not.toContain('combo_fever');
    expect(unlocked).not.toContain('combo_unstoppable');
    expect(unlocked).not.toContain('combo_godlike');
  });

  it('unlocks combo_fever at exactly bestCombo 5', () => {
    usePlayerStore.setState({ bestCombo: 5 });
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).toContain('combo_fever');
    expect(unlocked).not.toContain('combo_unstoppable');
  });

  it('unlocks fever + unstoppable at bestCombo 6', () => {
    usePlayerStore.setState({ bestCombo: 6 });
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).toContain('combo_fever');
    expect(unlocked).toContain('combo_unstoppable');
    expect(unlocked).not.toContain('combo_godlike');
  });

  it('unlocks all three at bestCombo 7+', () => {
    usePlayerStore.setState({ bestCombo: 8 });
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).toContain('combo_fever');
    expect(unlocked).toContain('combo_unstoppable');
    expect(unlocked).toContain('combo_godlike');
  });

  it('parallel tracks: combo + wave + chromatic can all unlock independently', () => {
    // A skill flex: a player who hits GODLIKE chain in a single
    // run but never reaches wave 5 or 25 chromatic clears
    // unlocks the combo tier and ONLY the combo tier. This pins
    // that the three achievement axes are genuinely independent
    // and don't accidentally co-trigger.
    usePlayerStore.setState({
      bestCombo: 7,
      bestWaveReached: 2,
      totalChromaticClears: 3,
    });
    usePlayerStore.getState().checkAchievements();
    const unlocked = usePlayerStore.getState().unlockedAchievements;
    expect(unlocked).toContain('combo_godlike');
    expect(unlocked).not.toContain('wave_5');
    expect(unlocked).not.toContain('chromatic_25');
  });
});

describe('checkAchievements coin boost integration', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      coins: 0,
      gems: 0,
      unlockedAchievements: [],
      activeBoostUntil: {},
      // Reset the state checked by ACHIEVEMENTS so none unlock
      // unless we explicitly set the trigger field below.
      totalLinesCleared: 0,
      highestLevel: 0,
      totalScore: 0,
      longestStreak: 0,
      totalChromaticClears: 0,
      totalPowerUpsUsed: 0,
      bestWaveReached: 0,
      bestCombo: 0,
      levelStars: {},
    });
  });

  it('credits the base coin reward when no boost is active', () => {
    // first_clear unlocks at totalLinesCleared >= 1, rewards 10 coins.
    const firstClear = ACHIEVEMENTS.find((a) => a.id === 'first_clear')!;
    expect(firstClear.reward.coins).toBe(10);

    usePlayerStore.setState({ totalLinesCleared: 1 });
    usePlayerStore.getState().checkAchievements();
    expect(usePlayerStore.getState().coins).toBe(10);
    expect(usePlayerStore.getState().unlockedAchievements).toContain('first_clear');
  });

  it('applies the 2x coin boost when active', () => {
    // THE FIX. Previously this would have credited 10 (bypass).
    // Now with the boost active, the achievement unlock credits 20.
    usePlayerStore.setState({
      totalLinesCleared: 1,
      activeBoostUntil: { coins: Date.now() + 60_000 },
    });
    usePlayerStore.getState().checkAchievements();
    expect(usePlayerStore.getState().coins).toBe(20);
  });

  it('does NOT boost gems (gems boost is not a thing in this game)', () => {
    // Only the coins boost should apply. Gem credits stay raw.
    // Setting totalChromaticClears: 25 unlocks BOTH `first_chromatic`
    // (25 coins) AND `chromatic_25` (100 coins + 3 gems), so the
    // expected coin total is (25 + 100) * 2 = 250 and gems = 3
    // (NOT boosted). This pins both behaviors at once: coins boost
    // and gems-don't-boost.
    usePlayerStore.setState({
      totalChromaticClears: 25,
      activeBoostUntil: { coins: Date.now() + 60_000 },
    });
    usePlayerStore.getState().checkAchievements();
    expect(usePlayerStore.getState().coins).toBe(250); // (25 + 100) * 2
    expect(usePlayerStore.getState().gems).toBe(3); // NOT 6 — gems don't boost
  });

  it('does NOT apply the boost when the window has expired', () => {
    usePlayerStore.setState({
      totalLinesCleared: 1,
      activeBoostUntil: { coins: Date.now() - 1 }, // already expired
    });
    usePlayerStore.getState().checkAchievements();
    expect(usePlayerStore.getState().coins).toBe(10); // NOT 20
  });

  it('totals across multiple newly-unlocked achievements in one boost-multiplied set', () => {
    // first_clear (10) + level_10 (25) = 35 raw, with boost = 70.
    // Important: the boost is applied to the SUM, not each separately,
    // so the implementation's behavior is well-defined.
    usePlayerStore.setState({
      totalLinesCleared: 1,
      highestLevel: 10,
      activeBoostUntil: { coins: Date.now() + 60_000 },
    });
    usePlayerStore.getState().checkAchievements();
    expect(usePlayerStore.getState().coins).toBe(70); // (10+25) * 2
  });
});
