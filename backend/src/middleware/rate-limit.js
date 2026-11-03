import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/**
 * Rate limiting for the public API.
 *
 * Three limits are exposed:
 *
 *   - login:  per client IP + email, 5 attempts / 15 minutes
 *   - signup: per client IP,         5 attempts / hour
 *   - events: per signed-in user,    300 requests / minute
 *
 * Every value can be tuned from the environment (see `docs/rate-limiting.md`),
 * and `RATE_LIMIT_DISABLED=true` turns all of them off for local experiments.
 *
 * Limits are kept in memory, per API instance. That is enough for a single
 * server or a single Vercel Function; when several API instances run behind the
 * load balancer each instance keeps its own counter, so the effective limit is
 * multiplied by the number of instances.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function readPositiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isDisabled() {
  return process.env.RATE_LIMIT_DISABLED === "true";
}

/**
 * Build a limiter with the shared response shape and headers. Exported so the
 * tests can create short, isolated limits instead of waiting 15 minutes.
 */
export function createRateLimiter({ windowMs, limit, message, keyGenerator, identifier }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    statusCode: 429,
    message: { error: message },
    skip: isDisabled,
    identifier,
    ...(keyGenerator ? { keyGenerator } : {}),
  });
}

// express-rate-limit normalises IPv6 addresses through ipKeyGenerator; using
// req.ip directly would count a whole IPv6 subnet as separate strings.
function clientKey(req) {
  return ipKeyGenerator(req.ip ?? "");
}

// Count a login attempt against the pair of client and account. A shared
// office/NAT address can still sign in to different accounts, while repeated
// guesses against one account are stopped after a handful of tries.
function loginKey(req) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return `${clientKey(req)}:${email}`;
}

// Authenticated event requests are counted per user, not per address, so two
// people behind the same network do not consume each other's quota.
function eventsKey(req) {
  return req.userId ? `user:${req.userId}` : clientKey(req);
}

export const loginLimiter = createRateLimiter({
  identifier: "auth-login",
  windowMs: readPositiveInt("AUTH_LOGIN_WINDOW_MS", 15 * MINUTE),
  limit: readPositiveInt("AUTH_LOGIN_LIMIT", 5),
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
  keyGenerator: loginKey,
});

export const signupLimiter = createRateLimiter({
  identifier: "auth-signup",
  windowMs: readPositiveInt("AUTH_SIGNUP_WINDOW_MS", HOUR),
  limit: readPositiveInt("AUTH_SIGNUP_LIMIT", 5),
  message: "Too many sign-up attempts. Please try again later.",
  keyGenerator: clientKey,
});

export const eventsLimiter = createRateLimiter({
  identifier: "events",
  windowMs: readPositiveInt("EVENTS_RATE_LIMIT_WINDOW_MS", MINUTE),
  limit: readPositiveInt("EVENTS_RATE_LIMIT", 300),
  message: "Too many calendar requests. Please slow down and try again shortly.",
  keyGenerator: eventsKey,
});
