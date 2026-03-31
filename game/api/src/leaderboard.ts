/**
 * Leaderboard endpoints using Upstash Redis sorted sets.
 * GET  /api/leaderboard?type=level&id=42&limit=50
 * POST /api/leaderboard { type: "level", levelId: 42, score: 5000 }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetLeaderboard(req, res);
  }

  if (req.method === 'POST') {
    return handlePostScore(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetLeaderboard(req: VercelRequest, res: VercelResponse) {
  const { type, id, limit = '50', offset = '0' } = req.query;

  if (!type || !id) {
    return res.status(400).json({ error: 'Missing type or id parameter' });
  }

  // TODO: Implement Upstash Redis ZREVRANGE query
  // const key = `leaderboard:${type}:${id}`;
  // const entries = await redis.zrevrange(key, +offset, +offset + +limit - 1, 'WITHSCORES');

  return res.status(200).json({
    entries: [],
    total: 0,
  });
}

async function handlePostScore(req: VercelRequest, res: VercelResponse) {
  const { type, levelId, score } = req.body;

  if (!type || !levelId || score === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // TODO: Extract user from JWT
  // TODO: ZADD to Upstash Redis (only if higher than existing score)
  // const key = `leaderboard:${type}:${levelId}`;
  // await redis.zadd(key, { score, member: userId }, { gt: true });

  return res.status(200).json({ success: true });
}
