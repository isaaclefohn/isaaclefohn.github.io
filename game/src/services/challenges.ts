/**
 * Friend challenge system using deep links.
 * Encodes a level seed and score into a shareable URL.
 * Recipients play the exact same board and compare scores.
 */

import { Share } from 'react-native';
import { hashSeed } from '../utils/seededRandom';

export interface ChallengeData {
  /** Level number for challenge context */
  level: number;
  /** Seed for deterministic board generation */
  seed: number;
  /** Challenger's score to beat */
  challengerScore: number;
  /** Challenger's display name */
  challengerName: string;
}

/** Encode challenge data into a compact string */
function encodeChallenge(data: ChallengeData): string {
  // Simple encoding: level-seed-score-name (base36 for compactness)
  const parts = [
    data.level.toString(36),
    data.seed.toString(36),
    data.challengerScore.toString(36),
    encodeURIComponent(data.challengerName.slice(0, 20)),
  ];
  return parts.join('-');
}

/** Decode a challenge string back to data */
export function decodeChallenge(encoded: string): ChallengeData | null {
  try {
    const parts = encoded.split('-');
    if (parts.length < 4) return null;
    return {
      level: parseInt(parts[0], 36),
      seed: parseInt(parts[1], 36),
      challengerScore: parseInt(parts[2], 36),
      challengerName: decodeURIComponent(parts.slice(3).join('-')),
    };
  } catch {
    return null;
  }
}

/** Generate a challenge from current game state */
export function createChallenge(
  level: number,
  score: number,
  playerName: string
): ChallengeData {
  return {
    level,
    seed: hashSeed(level),
    challengerScore: score,
    challengerName: playerName,
  };
}

/** Share a challenge via native share sheet */
export async function shareChallenge(challenge: ChallengeData): Promise<boolean> {
  const encoded = encodeChallenge(challenge);
  const message =
    `${challenge.challengerName} challenges you to beat ${challenge.challengerScore.toLocaleString()} points on Level ${challenge.level}!\n\n` +
    `Challenge code: ${encoded}\n\n` +
    `Open Color Block Blast and enter this code to play the same board!`;

  try {
    const result = await Share.share({ message });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
