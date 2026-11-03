import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { createRateLimiter } from "../src/middleware/rate-limit.js";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

function limitedApp({ limit, keyGenerator }) {
  const app = express();
  app.use(express.json());
  app.get(
    "/limited",
    createRateLimiter({
      windowMs: 60_000,
      limit,
      message: "Slow down.",
      keyGenerator,
    }),
    (_req, res) => res.json({ ok: true }),
  );
  return app;
}

test("allows requests up to the limit, then returns 429", async () => {
  await withServer(limitedApp({ limit: 2 }), async (base) => {
    const first = await fetch(`${base}/limited`);
    const second = await fetch(`${base}/limited`);
    const third = await fetch(`${base}/limited`);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);

    assert.deepEqual(await third.json(), { error: "Slow down." });
    assert.ok(third.headers.get("ratelimit"), "draft-8 RateLimit header is present");
    assert.ok(third.headers.get("ratelimit-policy"), "draft-8 RateLimit-Policy header is present");
    assert.ok(third.headers.get("retry-after"), "429 responses include Retry-After");
  });
});

test("keeps a separate bucket per client address", async () => {
  const app = limitedApp({ limit: 1 });
  app.set("trust proxy", 1);

  await withServer(app, async (base) => {
    const request = (ip) =>
      fetch(`${base}/limited`, { headers: { "x-forwarded-for": ip } });

    assert.equal((await request("203.0.113.10")).status, 200);
    assert.equal((await request("203.0.113.11")).status, 200);
    assert.equal((await request("203.0.113.10")).status, 429);
    assert.equal((await request("203.0.113.11")).status, 429);
  });
});

test("RATE_LIMIT_DISABLED=true bypasses the limiter", async () => {
  process.env.RATE_LIMIT_DISABLED = "true";

  try {
    await withServer(limitedApp({ limit: 1 }), async (base) => {
      assert.equal((await fetch(`${base}/limited`)).status, 200);
      assert.equal((await fetch(`${base}/limited`)).status, 200);
    });
  } finally {
    delete process.env.RATE_LIMIT_DISABLED;
  }
});

test("the login route is wired to the login limiter", async () => {
  process.env.VERCEL = "1";
  const { default: app } = await import("../src/server.js");

  await withServer(app, async (base) => {
    const attempt = () =>
      fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "short" }),
      });

    // The body fails validation before any database access, so the limiter is
    // the only thing under test here. The default login limit is 5.
    for (let index = 0; index < 5; index += 1) {
      assert.equal((await attempt()).status, 400);
    }

    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error, /too many sign-in attempts/i);
  });
});
