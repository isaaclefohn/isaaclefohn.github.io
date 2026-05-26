/**
 * Friend system and social features.
 * Manages friend codes, challenge sharing, and social leaderboards.
 * Uses short deterministic friend codes for easy sharing.
 *
 * NOTE: Since this is a local-first game, friend data is stored
 * locally and exchanged via share codes / QR codes.
 */

export interface FriendProfile {
  code: string;
  name: string;
  level: number;
  score: number;
  addedAt: number;
}

export interface ChallengeInvite {
  id: string;
  fromName: string;
  fromCode: string;
  level: number;
  score: number;
  stars: number;
  timestamp: number;
  message: string;
}

/**
 * Generate a unique friend code from player data.
 * Format: 4 alphanumeric characters (e.g., "A7K2")
 */
export function generateFriendCode(displayName: string, seed: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
  let hash = seed;
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash * 31 + displayName.charCodeAt(i)) >>> 0;
  }

  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[hash % chars.length];
    hash = (hash * 17 + i * 31) >>> 0;
  }
  return code;
}

/**
 * Create a challenge invite message for sharing
 */
export function createChallengeMessage(params: {
  fromName: string;
  fromCode: string;
  level: number;
  score: number;
  stars: number;
}): string {
  const { fromName, fromCode, level, score, stars } = params;
  const starEmoji = '\u2B50'.repeat(stars);

  return [
    `${fromName} challenges you!`,
    ``,
    `Level ${level}: ${score.toLocaleString()} points ${starEmoji}`,
    `Can you beat this score?`,
    ``,
    `Friend code: ${fromCode}`,
    `Play Chroma!`,
  ].join('\n');
}

/** Format a friend code for display (add dash) */
export function formatFriendCode(code: string): string {
  if (code.length <= 3) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/** Compare two scores and determine winner */
export function getChallengeResult(
  myScore: number,
  theirScore: number,
): 'win' | 'lose' | 'tie' {
  if (myScore > theirScore) return 'win';
  if (myScore < theirScore) return 'lose';
  return 'tie';
}
