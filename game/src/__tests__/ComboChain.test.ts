/**
 * Pure-function coverage for the combo chain ladder.
 *
 * Before this commit, `ComboChain.ts` was orphaned scaffolding — the
 * labels and multipliers were defined but the UI's `ComboBanner`
 * shipped with its own generic vocabulary (`DOUBLE!`/`TRIPLE!`/`MEGA!`)
 * that bypassed the threshold table. Unifying meant the threshold
 * math now ships on the player's screen, so it deserves regression
 * coverage. The label vocabulary matters for the "wickedly addictive"
 * dopamine framing per the Block Blast research: verbal praise that
 * escalates ("Amazing!", "FEVER!") drives more dopamine than numeric
 * descriptions ("4x", "5x") of the same event.
 */

import {
  getComboChainState,
  getComboBonus,
  getComboXPBonus,
  COMBO_THRESHOLDS,
} from '../game/systems/ComboChain';

describe('getComboChainState', () => {
  it('returns no-op state below chain 2', () => {
    expect(getComboChainState(0).label).toBe('');
    expect(getComboChainState(1).label).toBe('');
    expect(getComboChainState(0).multiplier).toBe(1);
    expect(getComboChainState(1).isFever).toBe(false);
  });

  it('returns "Nice!" at chain 2 with 1.5x multiplier', () => {
    const s = getComboChainState(2);
    expect(s.label).toBe('Nice!');
    expect(s.multiplier).toBe(1.5);
    expect(s.isFever).toBe(false);
  });

  it('returns "Great!" at chain 3 with 2.0x', () => {
    const s = getComboChainState(3);
    expect(s.label).toBe('Great!');
    expect(s.multiplier).toBe(2.0);
    expect(s.isFever).toBe(false);
  });

  it('returns "Amazing!" at chain 4 with 2.5x', () => {
    const s = getComboChainState(4);
    expect(s.label).toBe('Amazing!');
    expect(s.multiplier).toBe(2.5);
    expect(s.isFever).toBe(false);
  });

  it('flips into FEVER at chain 5 with 3.0x', () => {
    // THE inflection point — chain 5 is where the game feels
    // *different*. The banner and haptic pipeline both gate off
    // `isFever`, so this boundary deserves its own assertion.
    const s = getComboChainState(5);
    expect(s.label).toBe('FEVER!');
    expect(s.multiplier).toBe(3.0);
    expect(s.isFever).toBe(true);
  });

  it('promotes to "UNSTOPPABLE!" at chain 6 with 4.0x', () => {
    // Multiplier matches utils/constants.ts COMBO_MULTIPLIERS[5]=4
    // — the actual scoring multiplier the engine applies. Earlier
    // versions had this at 3.5 in the banner but 4.0 in the score,
    // which under-reported the actual reward.
    const s = getComboChainState(6);
    expect(s.label).toBe('UNSTOPPABLE!');
    expect(s.multiplier).toBe(4.0);
    expect(s.isFever).toBe(true);
  });

  it('promotes to "GODLIKE!" at chain 7+ with 5.0x (top tier)', () => {
    // GODLIKE was added in 2026-05-27 to expose the previously-hidden
    // 5x peak that COMBO_MULTIPLIERS[6+] used. Players at chain 7+
    // now see the actual multiplier they're earning.
    const s = getComboChainState(7);
    expect(s.label).toBe('GODLIKE!');
    expect(s.multiplier).toBe(5.0);
    expect(s.isFever).toBe(true);
  });

  it('clamps at the GODLIKE tier for very long chains', () => {
    // Chain 99 doesn't unlock a secret eighth threshold — the
    // ladder saturates at GODLIKE. Test pins that we don't
    // off-by-one into undefined territory.
    const s = getComboChainState(99);
    expect(s.label).toBe('GODLIKE!');
    expect(s.multiplier).toBe(5.0);
  });

  it('uses distinct colors per tier for cohesive UI signaling', () => {
    // Visual contract: each tier has its own color so the player
    // builds a hue-to-meaning association. If two tiers ever shared
    // a color, this test fails loudly.
    const colors = COMBO_THRESHOLDS.map((t) => t.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('getComboBonus', () => {
  it('returns 0 when there is no active chain', () => {
    expect(getComboBonus(100, 0)).toBe(0);
    expect(getComboBonus(100, 1)).toBe(0);
  });

  it('returns the extra points beyond base from the multiplier', () => {
    // At chain 2 (1.5x), base score of 100 → bonus is 50 (the 0.5
    // "extra" above the base). This is the value above the base, not
    // the multiplied score — important because the caller adds bonus
    // ON TOP of the base, not as a replacement.
    expect(getComboBonus(100, 2)).toBe(50);
    expect(getComboBonus(100, 3)).toBe(100); // 2.0x → +100
    expect(getComboBonus(100, 5)).toBe(200); // FEVER 3.0x → +200
  });

  it('rounds the bonus to an integer (scores are integers)', () => {
    // 33 * 0.5 = 16.5 — must round to 17 or 16 cleanly, never
    // surface a fractional coin/score to the player.
    expect(Number.isInteger(getComboBonus(33, 2))).toBe(true);
  });
});

describe('getComboXPBonus', () => {
  it('returns 0 below chain 3 (the floor for XP bonus)', () => {
    expect(getComboXPBonus(0)).toBe(0);
    expect(getComboXPBonus(2)).toBe(0);
  });

  it('scales XP with chain length', () => {
    expect(getComboXPBonus(3)).toBe(15);
    expect(getComboXPBonus(5)).toBe(25);
    expect(getComboXPBonus(10)).toBe(50);
  });

  it('caps at 50 XP — no infinite scaling on long chains', () => {
    expect(getComboXPBonus(20)).toBe(50);
    expect(getComboXPBonus(99)).toBe(50);
  });
});
