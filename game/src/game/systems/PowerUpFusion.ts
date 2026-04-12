/**
 * Power-Up Fusion system.
 * Lets players combine 3 of the same power-up into an enhanced mega variant,
 * or trade duplicates for alternative power-ups. Adds depth to inventory
 * management and rewards hoarding.
 */

export type PowerUpKind = 'bomb' | 'rowClear' | 'colorClear';
export type MegaKind = 'megabomb' | 'megaRow' | 'megaColor';

export interface FusionRecipe {
  /** Source power-up type */
  source: PowerUpKind;
  /** How many of the source are consumed */
  sourceCost: number;
  /** Result variant (mega version of same type) */
  result: MegaKind;
  /** Display name of the result */
  resultName: string;
  /** Short description of result effect */
  resultDescription: string;
  /** Icon to display for result */
  resultIcon: string;
  /** Color for result */
  resultColor: string;
}

export const FUSION_RECIPES: FusionRecipe[] = [
  {
    source: 'bomb',
    sourceCost: 3,
    result: 'megabomb',
    resultName: 'Mega Bomb',
    resultDescription: 'Clears a 7x7 area plus corners',
    resultIcon: 'bomb',
    resultColor: '#F97316',
  },
  {
    source: 'rowClear',
    sourceCost: 3,
    result: 'megaRow',
    resultName: 'Storm Strike',
    resultDescription: 'Clears 3 rows and 3 columns',
    resultIcon: 'lightning',
    resultColor: '#3B82F6',
  },
  {
    source: 'colorClear',
    sourceCost: 3,
    result: 'megaColor',
    resultName: 'Rainbow Blast',
    resultDescription: 'Clears all blocks of 2 random colors',
    resultIcon: 'palette',
    resultColor: '#EC4899',
  },
];

/** Trade-in conversion rates between power-up kinds */
export interface TradeRecipe {
  from: PowerUpKind;
  fromCost: number;
  to: PowerUpKind;
  toAmount: number;
}

export const TRADE_RECIPES: TradeRecipe[] = [
  // Cheap (bombs) → premium
  { from: 'bomb', fromCost: 5, to: 'rowClear', toAmount: 1 },
  { from: 'bomb', fromCost: 10, to: 'colorClear', toAmount: 1 },
  // Row clears
  { from: 'rowClear', fromCost: 3, to: 'bomb', toAmount: 1 },
  { from: 'rowClear', fromCost: 5, to: 'colorClear', toAmount: 1 },
  // Color clears
  { from: 'colorClear', fromCost: 1, to: 'rowClear', toAmount: 2 },
  { from: 'colorClear', fromCost: 1, to: 'bomb', toAmount: 4 },
];

/** Check if the player can afford a given fusion recipe */
export function canFuse(
  recipe: FusionRecipe,
  powerUps: Record<PowerUpKind, number>,
): boolean {
  return powerUps[recipe.source] >= recipe.sourceCost;
}

/** Check if the player can afford a trade */
export function canTrade(
  recipe: TradeRecipe,
  powerUps: Record<PowerUpKind, number>,
): boolean {
  return powerUps[recipe.from] >= recipe.fromCost;
}
