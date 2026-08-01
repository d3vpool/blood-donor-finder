// src/rateLimit.js
"use strict";

/**
 * Server-side publish rate limiter backed by Redis INCR + EXPIRE.
 *
 * Redis is used (not an in-memory counter) because Render's free tier can
 * cold-start and reset process-local state. The limiter enforces a hard floor
 * independent of any client-side throttling.
 */
function createRateLimiter(redis, { maxPerSecond = 1 } = {}) {
  return async function rateLimitPublish(key) {
    const redisKey = `rl:publish:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, 1);
    }
    return count <= maxPerSecond;
  };
}

module.exports = { createRateLimiter };
