/**
 * Leaderboard endpoints backed by Upstash Redis sorted sets.
 *   GET  /api/leaderboard?type=daily&id=2026-05-24&limit=50
 *   POST /api/leaderboard { type, levelId, score }   (Authorization: Bearer <supabase jwt>)
 *
 * Security model:
 *  - The submitter's identity comes ONLY from the verified JWT, never the body.
 *  - Scores are sanity-bounded (anti-injection) and stored with ZADD gt, so a
 *    submit can only ever raise the user's own best.
 *  - Display names are resolved server-side from the profiles table, so a client
 *    cannot spoof another player's name.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateUser, getServiceClient } from './middleware/auth';
import { getRedis, getWriteLimit } from './middleware/rateLimit';

const VALID_TYPES = ['level', 'weekly', 'daily'] as const;
type LbType = (typeof VALID_TYPES)[number];

// Loose ceiling that blocks the "score: 999999999" class of cheat. Tighter,
// per-level computed maxima are a follow-up once level configs live server-side.
const MAX_PLAUSIBLE_SCORE = 5_000_000;

const lbKey = (type: string, id: string) => `lb:${type}:${id}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return handleGetLeaderboard(req, res);
  if (req.method === 'POST') return handlePostScore(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetLeaderboard(req: VercelRequest, res: VercelResponse) {
  const type = String(req.query.type ?? '');
  const id = String(req.query.id ?? '');
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);

  if (!VALID_TYPES.includes(type as LbType) || !id) {
    return res.status(400).json({ error: 'Invalid type or id' });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ error: 'Leaderboard unavailable' });

  try {
    const key = lbKey(type, id);
    // Highest score first, with scores interleaved: [member, score, member, ...].
    const flat = await redis.zrange<(string | number)[]>(key, offset, offset + limit - 1, {
      rev: true,
      withScores: true,
    });

    const ids: string[] = [];
    const scoreByUser: Record<string, number> = {};
    for (let i = 0; i < flat.length; i += 2) {
      const uid = String(flat[i]);
      ids.push(uid);
      scoreByUser[uid] = Number(flat[i + 1]);
    }

    // Resolve display names from the authoritative profiles table (service
    // client bypasses RLS). One bounded query per page.
    const names: Record<string, string> = {};
    if (ids.length > 0) {
      const supabase = getServiceClient();
      if (supabase) {
        const { data } = await supabase.from('profiles').select('id, display_name').in('id', ids);
        for (const row of data ?? []) names[row.id] = row.display_name ?? 'Player';
      }
    }

    const entries = ids.map((uid, i) => ({
      rank: offset + i + 1,
      userId: uid,
      displayName: names[uid] ?? 'Player',
      score: scoreByUser[uid],
    }));

    const total = await redis.zcard(key);
    return res.status(200).json({ entries, total });
  } catch (err) {
    console.error('[leaderboard] GET failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function handlePostScore(req: VercelRequest, res: VercelResponse) {
  // Identity comes ONLY from the verified JWT — never the request body.
  const userId = await authenticateUser(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Rate-limit writes per user.
  const writeLimit = getWriteLimit();
  if (writeLimit) {
    const { success } = await writeLimit.limit(userId);
    if (!success) return res.status(429).json({ error: 'Too many requests' });
  }

  const { type, levelId, score } = req.body ?? {};
  if (!VALID_TYPES.includes(type) || levelId === undefined || levelId === null) {
    return res.status(400).json({ error: 'Invalid type or levelId' });
  }
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > MAX_PLAUSIBLE_SCORE) {
    return res.status(400).json({ error: 'Invalid score' });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ error: 'Leaderboard unavailable' });

  try {
    // gt: only replace the user's entry if the new score is higher.
    await redis.zadd(lbKey(type, String(levelId)), { gt: true }, { score: Math.round(score), member: userId });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[leaderboard] POST failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
