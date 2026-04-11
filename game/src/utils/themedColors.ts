/**
 * Themed color resolver.
 * Returns seasonal-themed colors when a seasonal event is active,
 * otherwise returns the default game palette.
 * Components should use getThemedColors() instead of accessing COLORS.blocks directly
 * to get automatic seasonal theming.
 */

import { COLORS } from './constants';
import { getActiveSeasonalTheme } from '../game/themes/SeasonalThemes';

interface ThemedColors {
  blocks: readonly string[];
  accent: string;
  gold: string;
  backgroundTint: string | null;
  isSeasonalActive: boolean;
  seasonName: string | null;
}

/** Get colors with seasonal theme applied (if active) */
export function getThemedColors(now: Date = new Date()): ThemedColors {
  const theme = getActiveSeasonalTheme(now);

  if (!theme) {
    return {
      blocks: COLORS.blocks,
      accent: COLORS.accent,
      gold: COLORS.accentGold,
      backgroundTint: null,
      isSeasonalActive: false,
      seasonName: null,
    };
  }

  return {
    blocks: theme.blocks,
    accent: theme.accent,
    gold: theme.gold,
    backgroundTint: theme.backgroundTint,
    isSeasonalActive: true,
    seasonName: theme.name,
  };
}
