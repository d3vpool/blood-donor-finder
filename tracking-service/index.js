// index.js
"use strict";

require("dotenv").config();
const { createRedis } = require("./src/redis");
const { createAuth } = require("./src/auth");
const { createDb } = require("./src/firestore");
const { createRateLimiter } = require("./src/rateLimit");
const { createApp } = require("./src/app");

async function main() {
  const env = process.env;
  const port = Number(env.PORT || 8080);

  const redis = await createRedis(env);
  const auth = await createAuth(env);
  const db = await createDb(env);
  const rateLimit = createRateLimiter(redis, { maxPerSecond: 1 });

  const app = createApp({ redis, auth, db, config: { rateLimit } });

  app.server.listen(port, () => {
    console.log(`[tracking] listening on :${port} (redis=${redis.mode}, auth=${auth.mode})`);
  });

  const shutdown = async () => {
    console.log("[tracking] shutting down");
    await app.close();
    await redis.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[tracking] fatal startup error:", err);
  process.exit(1);
});
