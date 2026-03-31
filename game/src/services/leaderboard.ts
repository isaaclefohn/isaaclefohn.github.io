/**
 * Leaderboard service.
 * Fetches and submits scores to the Vercel API (backed by Upstash Redis).
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
}

/** Fetch leaderboard for a specific level */
export async function fetchLeaderboard(
  type: 'level' | 'weekly' | 'daily',
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

/** Submit a score to the leaderboard */
export async function submitScore(
  type: 'level' | 'weekly' | 'daily',
  levelId: number,
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
      body: JSON.stringify({ type, levelId, score }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
