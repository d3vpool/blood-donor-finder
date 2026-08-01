// src/redis.js
"use strict";

/**
 * Redis access for the tracking service.
 *
 * - Production always requires a real Redis via REDIS_URL (NODE_ENV=production
 *   fails fast if it is missing). Never uses the in-memory shim.
 * - Dev/test only: when REDIS_URL is absent and NODE_ENV is not production, a
 *   non-persistent in-memory shim implements the pub/sub + counter subset so
 *   tests and local demos run without a Redis server.
 */

function createMemoryRedis() {
  const listeners = new Map(); // channel -> Set<handler>
  const store = new Map(); // key -> { value, expiresAt }

  return {
    mode: "memory",

    publish(channel, message) {
      const set = listeners.get(channel);
      if (set) {
        for (const handler of [...set]) handler(channel, message);
      }
      return Promise.resolve(0);
    },

    async subscribe(channel, handler) {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel).add(handler);
      return () => {
        const set = listeners.get(channel);
        if (set) {
          set.delete(handler);
          if (set.size === 0) listeners.delete(channel);
        }
      };
    },

    async incr(key) {
      const now = Date.now();
      const rec = store.get(key);
      if (!rec || rec.expiresAt <= now) {
        store.set(key, { value: 1, expiresAt: now + 1000 });
        return 1;
      }
      rec.value += 1;
      return rec.value;
    },

    async expire(key, secs) {
      const rec = store.get(key);
      if (rec) rec.expiresAt = Date.now() + secs * 1000;
      return true;
    },

    async get(key) {
      const rec = store.get(key);
      if (!rec || rec.expiresAt <= Date.now()) return null;
      return String(rec.value);
    },

    async set(key, value) {
      store.set(key, { value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return "OK";
    },

    close() {
      listeners.clear();
      store.clear();
    },
  };
}

async function createRedis(env) {
  const url = env.REDIS_URL;
  const nodeEnv = env.NODE_ENV || "development";

  if (!url) {
    if (nodeEnv === "production") {
      throw new Error("REDIS_URL is required in production.");
    }
    console.warn("[redis] No REDIS_URL set — using in-memory shim (dev/test only).");
    return createMemoryRedis();
  }

  const Redis = require("ioredis");
  const client = new Redis(url, { maxRetriesPerRequest: 3 });
  const sub = new Redis(url, { maxRetriesPerRequest: 3 });
  const handlers = new Map(); // channel -> Set<handler>

  await new Promise((resolve, reject) => {
    const onReady = () => {
      client.off("error", onError);
      resolve();
    };
    const onError = (err) => {
      client.off("ready", onReady);
      reject(err);
    };
    client.once("ready", onReady);
    client.once("error", onError);
  });

  sub.on("message", (channel, message) => {
    const set = handlers.get(channel);
    if (set) {
      for (const handler of [...set]) handler(channel, message);
    }
  });

  return {
    mode: "redis",

    publish(channel, message) {
      return client.publish(channel, message);
    },

    async subscribe(channel, handler) {
      if (!handlers.has(channel)) {
        handlers.set(channel, new Set());
        await sub.subscribe(channel);
      }
      handlers.get(channel).add(handler);
      return () => {
        const set = handlers.get(channel);
        if (set) {
          set.delete(handler);
          if (set.size === 0) {
            handlers.delete(channel);
            sub.unsubscribe(channel).catch(() => {});
          }
        }
      };
    },

    incr(key) {
      return client.incr(key);
    },

    expire(key, secs) {
      return client.expire(key, secs);
    },

    get(key) {
      return client.get(key);
    },

    set(key, value) {
      return client.set(key, value);
    },

    close() {
      client.disconnect();
      sub.disconnect();
    },
  };
}

module.exports = { createRedis, createMemoryRedis };
