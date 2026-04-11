/**
 * Comeback bonus system.
 * Rewards players who return after being away for 2+ days.
 * Bigger rewards for longer absences to re-engage churning players.
 * Inspired by Candy Crush's "welcome back" mechanic.
 */

export interface ComebackReward {
  coins: number;
  gems: number;
  powerUp?: { type: 'bomb' | 'rowClear' | 'colorClear'; count: number };
  message: string;
  daysAway: number;
}

/**
 * Calculate comeback reward based on days since last play.
 * Returns null if player hasn't been away long enough.
 */
export function getComebackReward(lastPlayDate: string | null): ComebackReward | null {
  if (!lastPlayDate) return null;

  const now = new Date();
  const last = new Date(lastPlayDate);
  const diffMs = now.getTime() - last.getTime();
  const daysAway = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysAway < 2) return null;

  if (daysAway >= 14) {
    return {
      coins: 200,
      gems: 10,
      powerUp: { type: 'bomb', count: 3 },
      message: "We've missed you! Here's a big welcome back gift!",
      daysAway,
    };
  }

  if (daysAway >= 7) {
    return {
      coins: 100,
      gems: 5,
      powerUp: { type: 'bomb', count: 2 },
      message: "Welcome back! Here's a gift to get you started!",
      daysAway,
    };
  }

  if (daysAway >= 3) {
    return {
      coins: 50,
      gems: 2,
      powerUp: { type: 'bomb', count: 1 },
      message: "Good to see you again! Here's a bonus!",
      daysAway,
    };
  }

  // 2 days away
  return {
    coins: 25,
    gems: 0,
    message: 'Welcome back! Here are some bonus coins!',
    daysAway,
  };
}
