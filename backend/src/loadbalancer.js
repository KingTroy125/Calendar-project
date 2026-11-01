import http from "node:http";
import { URL } from "node:url";

/**
 * Small HTTP load balancer for local development and self-hosted demos.
 *
 * Vercel already distributes traffic across Functions in production; this
 * process is only useful when you run several Express instances yourself.
 *
 * Features:
 *   - round-robin across healthy upstreams
 *   - periodic /health checks with a failure threshold
 *   - failover to the next upstream for retry-safe methods
 *   - X-Load-Balancer-Upstream response header for verification
 *   - /__lb/health and /__lb/upstreams status endpoints
 *
 * Configuration (environment variables):
 *   LB_PORT              Port to listen on (default 8080)
 *   UPSTREAMS            Comma-separated origins (default http://localhost:3001,3002,3003)
 *   HEALTH_PATH          Upstream health path (default /health)
 *   HEALTH_INTERVAL_MS   Health check interval (default 5000)
 *   HEALTH_TIMEOUT_MS    Health check timeout (default 1000)
 *   REQUEST_TIMEOUT_MS   Proxy request timeout (default 15000)
 *   FAILURE_THRESHOLD    Failed checks before marking down (default 2)
 */

const LB_PORT = Number(process.env.LB_PORT ?? 8080);
const HEALTH_PATH = process.env.HEALTH_PATH ?? "/health";
const HEALTH_INTERVAL_MS = Number(process.env.HEALTH_INTERVAL_MS ?? 5000);
const HEALTH_TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS ?? 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 15000);
const FAILURE_THRESHOLD = Number(process.env.FAILURE_THRESHOLD ?? 2);

/** Methods that are safe to retry on a different upstream. */
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const upstreams = (process.env.UPSTREAMS ?? "http://localhost:3001,http://localhost:3002,http://localhost:3003")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean)
  .map((base, index) => {
    const url = new URL(base);
    return {
      id: index + 1,
      label: url.host,
      origin: url.origin,
      healthy: true,
      consecutiveFailures: 0,
      requests: 0,
    };
  });

if (upstreams.length === 0) {
  console.error("[lb] No upstreams configured. Set UPSTREAMS to a comma-separated list.");
  process.exit(1);
}

let cursor = 0;

function pickUpstream() {
  const total = upstreams.length;
  for (let offset = 0; offset < total; offset += 1) {
    const candidate = upstreams[(cursor + offset) % total];
    if (candidate.healthy) {
      cursor = (cursor + offset + 1) % total;
      return candidate;
    }
  }
  return null;
}

function markHealthy(upstream) {
  if (!upstream.healthy) {
    console.log(`[lb] ${upstream.label} is healthy again`);
  }
  upstream.healthy = true;
  upstream.consecutiveFailures = 0;
}

function markFailed(upstream, reason) {
  upstream.consecutiveFailures += 1;
  if (upstream.healthy && upstream.consecutiveFailures >= FAILURE_THRESHOLD) {
    upstream.healthy = false;
    console.warn(`[lb] ${upstream.label} marked unhealthy (${reason})`);
  }
}

async function checkUpstream(upstream) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(HEALTH_PATH, upstream.origin), {
      signal: controller.signal,
      headers: { "user-agent": "calendar-load-balancer" },
    });
    if (response.ok) {
      markHealthy(upstream);
    } else {
      markFailed(upstream, `health returned ${response.status}`);
    }
  } catch (error) {
    markFailed(upstream, error?.name === "AbortError" ? "health timeout" : "health request failed");
  } finally {
    clearTimeout(timer);
  }
}

function checkAllUpstreams() {
  for (const upstream of upstreams) {
    void checkUpstream(upstream);
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function upstreamSnapshot() {
  return upstreams.map(({ id, label, healthy, consecutiveFailures, requests }) => ({
    id,
    upstream: label,
    healthy,
    consecutiveFailures,
    requests,
  }));
}

function proxy(req, res, upstream, attempt = 0) {
  const target = new URL(req.url ?? "/", upstream.origin);
  const headers = { ...req.headers };
  headers.host = upstream.label;
  headers["x-forwarded-for"] = [req.headers["x-forwarded-for"], req.socket.remoteAddress]
    .filter(Boolean)
    .join(", ");
  headers["x-forwarded-proto"] = headers["x-forwarded-proto"] ?? "http";
  headers["x-forwarded-host"] = req.headers.host ?? "";

  const proxyReq = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders.connection;
      delete responseHeaders["keep-alive"];
      delete responseHeaders["transfer-encoding"];
      responseHeaders["x-load-balancer-upstream"] = upstream.label;

      upstream.requests += 1;
      res.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.setTimeout(REQUEST_TIMEOUT_MS, () => {
    proxyReq.destroy(new Error("upstream timeout"));
  });

  proxyReq.on("error", (error) => {
    markFailed(upstream, error.message);
    console.warn(`[lb] ${req.method} ${req.url} -> ${upstream.label} failed: ${error.message}`);

    const canRetry =
      attempt === 0 &&
      !res.headersSent &&
      RETRYABLE_METHODS.has(req.method ?? "") &&
      upstreams.some((candidate) => candidate.healthy);

    if (canRetry) {
      const next = pickUpstream();
      if (next) {
        console.warn(`[lb] retrying ${req.method} ${req.url} on ${next.label}`);
        proxy(req, res, next, attempt + 1);
        return;
      }
    }

    if (!res.headersSent) {
      const status = error.message === "upstream timeout" ? 504 : 502;
      sendJson(res, status, { error: status === 504 ? "Upstream timed out" : "Upstream unavailable" });
    } else {
      res.destroy(error);
    }
  });

  // Do not leave the upstream request hanging if the browser disconnects.
  res.on("close", () => {
    if (!res.writableEnded) proxyReq.destroy();
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

  if (pathname === "/__lb/health") {
    return sendJson(res, 200, {
      ok: true,
      upstreams: upstreams.length,
      healthy: upstreams.filter((upstream) => upstream.healthy).length,
    });
  }

  if (pathname === "/__lb/upstreams") {
    return sendJson(res, 200, { upstreams: upstreamSnapshot() });
  }

  const upstream = pickUpstream();
  if (!upstream) {
    return sendJson(res, 503, { error: "No healthy upstreams" });
  }

  return proxy(req, res, upstream);
});

server.on("error", (error) => {
  console.error(`[lb] Failed to start load balancer: ${error.message}`);
  process.exitCode = 1;
});

server.listen(LB_PORT, () => {
  console.log(`[lb] Load balancer listening on http://localhost:${LB_PORT}`);
  console.log(`[lb] Upstreams: ${upstreams.map((upstream) => upstream.label).join(", ")}`);
  console.log(`[lb] Status: http://localhost:${LB_PORT}/__lb/upstreams`);
  checkAllUpstreams();
});

const healthTimer = setInterval(checkAllUpstreams, HEALTH_INTERVAL_MS);
healthTimer.unref?.();

function shutdown(signal) {
  console.log(`[lb] ${signal} received, shutting down`);
  clearInterval(healthTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
