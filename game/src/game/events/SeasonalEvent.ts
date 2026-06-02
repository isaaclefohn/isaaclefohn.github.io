/**
 * Seasonal Events system.
 * Limited-time themed events (spring, summer, fall, winter, holiday specials)
 * with unique visual flair, dedicated progress tracks, and milestone rewards.
 * The active event rotates based on real-world date.
 */

export type SeasonId = 'spring' | 'summer' | 'fall' | 'winter' | 'newyear' | 'halloween';

export interface SeasonalMilestone {
  points: number;
  reward: { coins?: number; gems?: number; bomb?: number; rowClear?: number; colorClear?: number };
  label: string;
}

export interface SeasonalEvent {
  id: SeasonId;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Inclusive start month index (0-based) */
  startMonth: number;
  /** Inclusive end month index */
  endMonth: number;
  /** Points earned per line cleared */
  pointsPerLine: number;
  /** Bonus points per level completed */
  pointsPerLevel: number;
  /** Milestone rewards at these point thresholds */
  milestones: SeasonalMilestone[];
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'spring',
    name: 'Spring Bloom',
    description: 'Celebrate new beginnings with fresh rewards',
    icon: 'sparkle',
    color: '#A7F3D0',
    startMonth: 2, // March
    endMonth: 4, // May
    pointsPerLine: 2,
    pointsPerLevel: 10,
    milestones: [
      { points: 50, label: 'Sprout', reward: { coins: 150 } },
      { points: 150, label: 'Bud', reward: { coins: 300, bomb: 1 } },
      { points: 300, label: 'Bloom', reward: { coins: 500, gems: 10 } },
      { points: 600, label: 'Garden', reward: { coins: 1000, gems: 20, rowClear: 2 } },
      { points: 1000, label: 'Harvest', reward: { coins: 2000, gems: 40, colorClear: 3 } },
    ],
  },
  {
    id: 'summer',
    name: 'Summer Splash',
    description: 'Heat things up with sizzling bonuses',
    icon: 'fire',
    color: '#FCD34D',
    startMonth: 5,
    endMonth: 7,
    pointsPerLine: 2,
    pointsPerLevel: 12,
    milestones: [
      { points: 50, label: 'Sunrise', reward: { coins: 200 } },
      { points: 150, label: 'Beach', reward: { coins: 350, bomb: 2 } },
      { points: 300, label: 'Wave', reward: { coins: 600, gems: 12 } },
      { points: 600, label: 'Tropic', reward: { coins: 1200, gems: 25, rowClear: 2 } },
      { points: 1000, label: 'Sunset', reward: { coins: 2500, gems: 50, colorClear: 3 } },
    ],
  },
  {
    id: 'fall',
    name: 'Autumn Harvest',
    description: 'Cozy rewards for cooler days',
    icon: 'crown',
    color: '#FB923C',
    startMonth: 8,
    endMonth: 9,
    pointsPerLine: 3,
    pointsPerLevel: 15,
    milestones: [
      { points: 50, label: 'Leaf', reward: { coins: 200 } },
      { points: 150, label: 'Orchard', reward: { coins: 400, bomb: 1, rowClear: 1 } },
      { points: 300, label: 'Feast', reward: { coins: 700, gems: 15 } },
      { points: 600, label: 'Bounty', reward: { coins: 1400, gems: 30, rowClear: 2 } },
      { points: 1000, label: 'Legend', reward: { coins: 2500, gems: 50, colorClear: 3 } },
    ],
  },
  {
    id: 'halloween',
    name: 'Spooky Nights',
    description: 'Trick or treat — mostly treats',
    icon: 'bomb',
    color: '#C084FC',
    startMonth: 9,
    endMonth: 9,
    pointsPerLine: 4,
    pointsPerLevel: 20,
    milestones: [
      { points: 50, label: 'Ghost', reward: { coins: 250, bomb: 2 } },
      { points: 150, label: 'Witch', reward: { coins: 500, gems: 15 } },
      { points: 300, label: 'Haunt', reward: { coins: 1000, gems: 25, colorClear: 2 } },
      { points: 600, label: 'Phantom', reward: { coins: 2000, gems: 50, colorClear: 4 } },
    ],
  },
  {
    id: 'winter',
    name: 'Winter Wonderland',
    description: 'Cozy up with chilly rewards',
    icon: 'gem',
    color: '#93C5FD',
    startMonth: 10,
    endMonth: 11,
    pointsPerLine: 3,
    pointsPerLevel: 15,
    milestones: [
      { points: 50, label: 'Flake', reward: { coins: 200 } },
      { points: 150, label: 'Frost', reward: { coins: 400, bomb: 1 } },
      { points: 300, label: 'Snowman', reward: { coins: 800, gems: 20 } },
      { points: 600, label: 'Blizzard', reward: { coins: 1500, gems: 35, rowClear: 2 } },
      { points: 1000, label: 'Aurora', reward: { coins: 3000, gems: 60, colorClear: 3 } },
    ],
  },
  {
    id: 'newyear',
    name: "New Year's Gala",
    description: 'Ring in the new year with big prizes',
    icon: 'sparkle',
    color: '#FACC15',
    startMonth: 0,
    endMonth: 0,
    pointsPerLine: 5,
    pointsPerLevel: 25,
    milestones: [
      { points: 50, label: 'Toast', reward: { coins: 300, gems: 5 } },
      { points: 150, label: 'Fireworks', reward: { coins: 600, gems: 15, bomb: 2 } },
      { points: 300, label: 'Countdown', reward: { coins: 1200, gems: 30 } },
      { points: 600, label: 'Midnight', reward: { coins: 2500, gems: 60, colorClear: 3 } },
    ],
  },
];

/** Return the active seasonal event for the given date, or null if none active.
 *
 *  When two events' month ranges both cover the current month, the more
 *  SPECIFIC one (narrowest span) wins. Without this, a broad season that
 *  happens to appear earlier in SEASONAL_EVENTS permanently shadowed a
 *  single-month special event sharing part of its range: Autumn Harvest
 *  (Sep–Oct) sat in front of Spooky Nights (Oct only), so Halloween never
 *  activated — players got Autumn all October, never saw the Halloween
 *  theme/rates/milestones, and the StickerAlbum's "Spooky Season" prompt
 *  pointed at the wrong live event. Preferring the narrower span makes
 *  September → Autumn, October → Halloween, and is a general fix for the
 *  whole broad-shadows-specific class rather than a Halloween point-patch. */
export function getActiveEvent(now: Date = new Date()): SeasonalEvent | null {
  const month = now.getMonth();
  const matches = SEASONAL_EVENTS.filter(
    (event) => event.startMonth <= month && month <= event.endMonth,
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, event) =>
    event.endMonth - event.startMonth < best.endMonth - best.startMonth ? event : best,
  );
}

/** Unique identifier for the current season instance (year + id) for reset tracking */
export function getEventInstanceId(event: SeasonalEvent, now: Date = new Date()): string {
  return `${event.id}_${now.getFullYear()}`;
}

/** Days remaining in the event (roughly) */
export function getEventDaysRemaining(event: SeasonalEvent, now: Date = new Date()): number {
  const year = now.getFullYear();
  const end = new Date(year, event.endMonth + 1, 0, 23, 59, 59);
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/** Returns true if the milestone is earned given current points */
export function isMilestoneReached(milestone: SeasonalMilestone, points: number): boolean {
  return points >= milestone.points;
}

/** Index of the next unreached milestone, or milestones.length if all reached */
export function getNextMilestoneIndex(event: SeasonalEvent, points: number): number {
  for (let i = 0; i < event.milestones.length; i++) {
    if (points < event.milestones[i].points) return i;
  }
  return event.milestones.length;
}
