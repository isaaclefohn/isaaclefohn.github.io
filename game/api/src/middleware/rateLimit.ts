/**
 * Rate limiting middleware using Upstash Redis.
 * To be used with Vercel API routes.
 */

// TODO: Uncomment when Upstash is configured
// import { Ratelimit } from '@upstash/ratelimit';
// import { Redis } from '@upstash/redis';
//
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_URL!,
//   token: process.env.UPSTASH_REDIS_TOKEN!,
// });
//
// export const generalLimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(60, '1 m'),
//   analytics: true,
// });
//
// export const writeLimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(10, '1 m'),
//   analytics: true,
// });
//
// export const receiptLimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(5, '1 m'),
//   analytics: true,
// });

export {};
