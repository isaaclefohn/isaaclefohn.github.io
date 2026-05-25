/**
 * Leaderboard service.
 * Fetches and submits scores to the Vercel API (backed by Upstash Redis).
 */

import { getAccessToken } from './auth';
import { syncDisplayName } from './playerProfile';
import { getWeekId, getTodayId } from '../utils/leaderboardIds';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export type LeaderboardType = 'level' | 'weekly' | 'daily';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
}

/** Fetch leaderboard for a specific board (level number, week id, or day id) */
export async function fetchLeaderboard(
  type: LeaderboardType,
  id: string | number,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  if (!API_URL) return [];

  try {
    const response = await fetch(
      `${API_URL}/api/leaderboard?type=${type}&id=${id}&limit=${limit}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.entries ?? [];
  } catch {
    return [];
  }
}

/** Submit a score to a specific board. `id` is the board id (level number,
 *  week id, or day id). Identity is taken from the JWT server-side; the body
 *  id only selects which board to write. */
export async function submitScore(
  type: LeaderboardType,
  id: string | number,
  score: number,
  authToken?: string
): Promise<boolean> {
  if (!API_URL) return false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}/api/leaderboard`, {
      method: 'POST',
      headers,
      // The API reads the board id under `levelId` for all board types.
      body: JSON.stringify({ type, levelId: id, score }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export interface GameResultInput {
  score: number;
  isDaily: boolean;
  isEndless: boolean;
  level: number;
  displayName?: string;
}

/**
 * Board policy — which leaderboards a finished game contributes to.
 *
 * ★ This is the main design lever for the competitive meta. Trade-off:
 *   - weekly : EVERY game's score feeds the weekly ladder → lively board, more
 *              social proof, but mixes modes (endless can out-score levels).
 *   - daily  : only the fixed-seed Daily Puzzle feeds "Today" → perfectly fair
 *              (everyone plays the same board), but sparser.
 * To make "Today" a best-of-day board instead, drop the `isDaily` guard.
 */
export function boardsForResult(input: GameResultInput): { type: LeaderboardType; id: string }[] {
  const boards: { type: LeaderboardType; id: string }[] = [
    { type: 'weekly', id: getWeekId() },
  ];
  if (input.isDaily) boards.push({ type: 'daily', id: getTodayId() });
  return boards;
}

/**
 * Report a finished game to every board the policy selects. Best-effort and
 * fire-and-forget safe: no-ops when the API isn't configured, the player has no
 * session, or the score is zero. Never throws.
 */
export async function reportGameResult(input: GameResultInput): Promise<void> {
  if (!API_URL || !(input.score > 0)) return;

  const token = await getAccessToken();
  if (!token) return;

  // Best-effort: make the player's chosen name appear on the board.
  if (input.displayName) void syncDisplayName(input.displayName);

  const boards = boardsForResult(input);
  await Promise.all(
    boards.map((b) => submitScore(b.type, b.id, input.score, token).catch(() => false))
  );
}
