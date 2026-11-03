# Rate limiting and abuse protection

The API uses [`express-rate-limit`](https://express-rate-limit.mintlify.app/) to
cap abusive traffic before it reaches Prisma or bcrypt. Limits are deliberately
conservative for authentication and generous for normal calendar use.

## Active limits

| Scope | Key | Default | Window | Env override |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | client IP + email | 5 attempts | 15 minutes | `AUTH_LOGIN_LIMIT`, `AUTH_LOGIN_WINDOW_MS` |
| `POST /auth/signup` | client IP | 5 attempts | 1 hour | `AUTH_SIGNUP_LIMIT`, `AUTH_SIGNUP_WINDOW_MS` |
| `/events/*` | signed-in user | 300 requests | 1 minute | `EVENTS_RATE_LIMIT`, `EVENTS_RATE_LIMIT_WINDOW_MS` |
| `GET/PATCH /auth/me`, `PATCH /auth/password` | signed-in user | 60 requests | 1 minute | `AUTH_ACCOUNT_LIMIT`, `AUTH_ACCOUNT_WINDOW_MS` |

Why these keys:

- **Login** counts the pair of client and account. Several people behind one
  office/NAT address can still each sign in, while repeated guesses against a
  single account stop after a handful of tries.
- **Signup** has no account yet, so it is counted per client address.
- **Events** runs after `requireAuth`, so it counts per user id. One person
  refreshing the calendar does not consume anyone else's quota.
- **Account** endpoints use the same per-user key so a signed-in session cannot
  hammer profile reads, profile saves, or password changes.

`/health` and `POST /auth/logout` are not rate limited: the first is used by the
load balancer and the second is a cheap cookie clear.

## Behaviour

Every limited response includes draft-8 headers:

```
RateLimit-Policy: 5;w=900
RateLimit: "auth-login";r=0;t=842
```

When the limit is reached the API returns `429 Too Many Requests`, a
`Retry-After` header, and the usual JSON error shape:

```json
{ "error": "Too many sign-in attempts. Please wait a few minutes and try again." }
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_DISABLED` | unset | Set to `true` to bypass every limiter (local experiments and scripted tests). |
| `AUTH_LOGIN_LIMIT` | `5` | Login attempts per key and window. |
| `AUTH_LOGIN_WINDOW_MS` | `900000` | Login window in milliseconds (15 minutes). |
| `AUTH_SIGNUP_LIMIT` | `5` | Signup attempts per IP and window. |
| `AUTH_SIGNUP_WINDOW_MS` | `3600000` | Signup window in milliseconds (1 hour). |
| `EVENTS_RATE_LIMIT` | `300` | Event requests per user and window. |
| `EVENTS_RATE_LIMIT_WINDOW_MS` | `60000` | Events window in milliseconds (1 minute). |
| `AUTH_ACCOUNT_LIMIT` | `60` | Account requests per user and window. |
| `AUTH_ACCOUNT_WINDOW_MS` | `60000` | Account window in milliseconds (1 minute). |
| `TRUST_PROXY` | `1` on Vercel, `false` elsewhere | Number of trusted proxy hops, or `true`/`false`. |

### Trust proxy

The limiter keys on `req.ip`. When the API sits behind a proxy, Express must be
told how many hops to trust, otherwise every request appears to come from the
proxy.

- **Vercel** puts the Function behind one proxy hop, so `TRUST_PROXY` defaults
  to `1` when `VERCEL=1`.
- **Local load balancer / nginx / a single reverse proxy** — set
  `TRUST_PROXY=1`; the bundled balancer appends the client address to
  `X-Forwarded-For`.
- **Direct local requests** — leave it unset so a client cannot spoof
  `X-Forwarded-For` and dodge the limit.

Do not set `TRUST_PROXY=true` on a directly reachable server; that trusts the
left-most forwarded value and lets clients choose their own key.

## Multiple instances

The store is in memory and belongs to one Node process. With `npm run cluster`
(3 APIs) each instance keeps its own counters, so the effective ceiling is up to
3× the documented limit. That is acceptable for this MVP because the load
balancer spreads requests and every instance still enforces the limit.

If limits must be exact across instances, replace the default store with a
shared one (for example `rate-limit-redis` backed by Redis/Upstash) and point
`TRUST_PROXY` at the real proxy chain. The middleware factory in
`backend/src/middleware/rate-limit.js` is the single place to pass a `store`
option.

## Verification

The automated tests create isolated limiters and also exercise the real login
route through the exported Express app:

```bash
cd backend
npm test
```

Expected: 4 passing tests covering the limit, per-client isolation,
`RATE_LIMIT_DISABLED`, and route wiring.

Manual check against a running API (each request returns `400` until the
sixth, which returns `429`):

```bash
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Content-Type: application/json" \
    -d '{"email":"not-an-email","password":"short"}' \
    http://localhost:3001/auth/login
done
```

Reset by restarting the API, waiting for the window to pass, or setting
`RATE_LIMIT_DISABLED=true` while testing other behaviour.
