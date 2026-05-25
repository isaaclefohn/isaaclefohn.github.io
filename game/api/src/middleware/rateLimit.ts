/**
 * Upstash Redis client + rate limiters for the API.
 * Everything is lazily constructed so importing never throws when the env
 * vars are absent (the endpoints degrade to a 503 instead of crashing).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/** Shared Redis client (reads UPSTASH_REDIS_REST_URL / _TOKEN from env). */
export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

let writeLimiter: Ratelimit | null = null;

/** Rate limiter for authenticated writes (e.g. score submits): 10 / minute. */
export function getWriteLimit(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!writeLimiter) {
    writeLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rl:write',
    });
  }
  return writeLimiter;
}
