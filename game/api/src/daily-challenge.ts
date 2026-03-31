/**
 * Daily challenge endpoint.
 * GET /api/daily-challenge — returns today's challenge config
 * Generated deterministically from the date, so all players get the same puzzle.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

function hashDate(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = Math.imul(31, h) + dateStr.charCodeAt(i);
  }
  return Math.abs(h);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const today = new Date().toISOString().split('T')[0];
  const seed = hashDate(today);

  // Generate a daily challenge config
  const challenge = {
    date: today,
    seed,
    gridSize: 8,
    objective: {
      type: 'score' as const,
      target: 2000 + (seed % 1000),
    },
    rewards: {
      coins: 100,
      gems: 5,
    },
  };

  return res.status(200).json(challenge);
}
