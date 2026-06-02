/**
 * Limited-time event system.
 * Defines score multiplier events, XP boost weekends, etc.
 * Events are date-driven — no server needed. A/B testable via device ID hash.
 */

export type EventType = 'score_multiplier' | 'xp_boost' | 'coin_rush' | 'power_up_sale';

export interface LiveEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  /** Multiplier applied (e.g., 2 for 2x) */
  multiplier: number;
  /** Icon name for display */
  icon: string;
  /** Banner color */
  color: string;
  /** Start time (ISO string) */
  startDate: string;
  /** End time (ISO string) */
  endDate: string;
}

/**
 * Recurring event schedule.
 * Events repeat on a predictable cycle so players can anticipate them.
 * Weekend events: Fri 6pm - Sun 11:59pm (local time)
 * Midweek events: Wed 12am - Wed 11:59pm (local time)
 */
const EVENT_SCHEDULE: LiveEvent[] = [
  {
    id: 'double_score_weekend',
    name: '2x Score Weekend',
    description: 'All level scores are doubled!',
    type: 'score_multiplier',
    multiplier: 2,
    icon: 'star',
    color: '#FACC15',
    startDate: '', // dynamically computed
    endDate: '',
  },
  {
    id: 'xp_boost_midweek',
    name: 'XP Rush Wednesday',
    description: 'Earn 50% more Battle Pass XP!',
    type: 'xp_boost',
    multiplier: 1.5,
    icon: 'lightning',
    color: '#A855F7',
    startDate: '',
    endDate: '',
  },
  {
    id: 'coin_rush_weekend',
    name: 'Coin Rush',
    description: 'Earn 2x coins from all levels!',
    type: 'coin_rush',
    multiplier: 2,
    icon: 'coin',
    color: '#22C55E',
    startDate: '',
    endDate: '',
  },
];

/** Check if a recurring weekend event is active (Friday 6pm - Sunday 11:59pm local) */
function isWeekendEventActive(now: Date): boolean {
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const hour = now.getHours();

  if (day === 5 && hour >= 18) return true; // Friday 6pm+
  if (day === 6) return true; // All Saturday
  if (day === 0) return true; // All Sunday
  return false;
}

/** Check if midweek event is active (Wednesday all day) */
function isMidweekEventActive(now: Date): boolean {
  return now.getDay() === 3; // Wednesday
}

/**
 * Alternation key for the weekend event, anchored to THIS weekend's
 * Friday so the event type is identical across Fri/Sat/Sun.
 *
 * The previous version keyed off `Math.ceil(now.getDate() / 7)` using the
 * CURRENT day, so a weekend that straddled a week-number boundary (e.g.
 * Fri the 7th → Sat the 8th: ceil(7/7)=1 odd, ceil(8/7)=2 even) flipped
 * from "2x Score Weekend" to "Coin Rush" mid-weekend — changing both the
 * applied reward and the banner label. Anchoring to the weekend's Friday
 * date makes all three days resolve to the same parity. (For a Sunday
 * whose Friday fell in the previous month, JS Date normalizes the
 * negative day-of-month; the resulting date is still a stable, consistent
 * key for the whole weekend.)
 */
function getWeekendAnchorWeek(now: Date): number {
  const day = now.getDay(); // 5=Fri, 6=Sat, 0=Sun
  const daysSinceFriday = day === 5 ? 0 : day === 6 ? 1 : 2; // Sun is 2 days past Fri
  const friday = new Date(now);
  friday.setDate(now.getDate() - daysSinceFriday);
  return Math.ceil(friday.getDate() / 7);
}

/** Get all currently active events. `now` is injectable for testing. */
export function getActiveEvents(now: Date = new Date()): LiveEvent[] {
  const active: LiveEvent[] = [];

  // Weekend events alternate between score multiplier and coin rush, keyed
  // on the weekend's Friday so the type stays stable Fri→Sun.
  if (isWeekendEventActive(now)) {
    const weekNum = getWeekendAnchorWeek(now);
    const weekendEvent = weekNum % 2 === 1
      ? EVENT_SCHEDULE[0]  // 2x Score Weekend (odd weeks)
      : EVENT_SCHEDULE[2]; // Coin Rush (even weeks)
    active.push(weekendEvent);
  }

  // Midweek XP boost every Wednesday
  if (isMidweekEventActive(now)) {
    active.push(EVENT_SCHEDULE[1]);
  }

  return active;
}

/** Get the score multiplier from active events (multiplicative) */
export function getScoreMultiplier(now: Date = new Date()): number {
  return getActiveEvents(now)
    .filter(e => e.type === 'score_multiplier')
    .reduce((mult, e) => mult * e.multiplier, 1);
}

/** Get the XP multiplier from active events */
export function getXPMultiplier(now: Date = new Date()): number {
  return getActiveEvents(now)
    .filter(e => e.type === 'xp_boost')
    .reduce((mult, e) => mult * e.multiplier, 1);
}

/** Get the coin multiplier from active events */
export function getCoinMultiplier(now: Date = new Date()): number {
  return getActiveEvents(now)
    .filter(e => e.type === 'coin_rush')
    .reduce((mult, e) => mult * e.multiplier, 1);
}

/** Check if any event is currently active */
export function hasActiveEvent(now: Date = new Date()): boolean {
  return getActiveEvents(now).length > 0;
}
