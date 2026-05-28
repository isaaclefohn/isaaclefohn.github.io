/**
 * Prestige-cosmetic unlock gating.
 *
 * Some board themes / block skins (see `unlockAchievementId` on
 * GameTheme / BlockSkin) are earned BY SKILL, not bought with gems.
 * They unlock when the player holds the named achievement and become
 * equippable for free.
 *
 * Design decision (Option A, confirmed): prestige access is gated
 * PURELY on the achievement — we do NOT add prestige cosmetics to the
 * `ownedThemes` / `ownedBlockSkins` gem-purchase ledgers. The
 * achievement is the single source of truth. Achievements are
 * permanent in normal play, so this is durable, and it avoids a second
 * write path that could diverge from achievement state. (If seasonal
 * achievement resets are ever added, revisit and persist on
 * first-equip instead.)
 *
 * Pure module — no React, no store imports — mirroring FeatureGating.ts
 * so the gate is trivially unit-testable.
 */

export interface PrestigeUnlockResult {
  /** True when the cosmetic is achievement-gated and not yet earned. */
  locked: boolean;
  /**
   * Present only when locked: the achievement id that unlocks it.
   * The caller resolves a human label via the ACHIEVEMENTS array
   * (kept out of this file to keep it store-free).
   */
  requirementAchievementId?: string;
}

/**
 * Compute whether a cosmetic is locked behind an unearned achievement.
 *
 * - No `unlockAchievementId` → not a prestige item → never locked.
 * - Has one, and it's in `unlockedAchievements` → unlocked.
 * - Has one, and it's NOT earned yet → locked, with the requirement id.
 */
export function checkPrestigeUnlock(
  unlockAchievementId: string | undefined,
  unlockedAchievements: string[],
): PrestigeUnlockResult {
  if (!unlockAchievementId) return { locked: false };
  if (unlockedAchievements.includes(unlockAchievementId)) return { locked: false };
  return { locked: true, requirementAchievementId: unlockAchievementId };
}

/** Convenience predicate: is this cosmetic a prestige (achievement-gated) one? */
export function isPrestigeCosmetic(unlockAchievementId: string | undefined): boolean {
  return !!unlockAchievementId;
}
