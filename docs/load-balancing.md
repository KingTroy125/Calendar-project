# Load Balancing

This document describes how the Calendar app distributes load today, where the
real bottlenecks are, and how the deployment can scale without redesigning the
API.

The short version: **there is no dedicated load balancer in this project**. The
frontend and API are separate Vercel projects, and Vercel's edge network and
Function scheduler distribute traffic for us. The API is stateless, so any
instance can serve any request. The database connection pool — not the API — is
the first real capacity limit.

---

## Current topology

```mermaid
flowchart LR
    U[Browser] -->|HTTPS| EDGE[Vercel Edge<br/>frontend.vercel.app]

    subgraph Frontend["Frontend project (Next.js)"]
        EDGE --> NEXT[Next.js App Router<br/>static pages + RSC]
        NEXT --> PROXY["/api/[...path]<br/>same-origin proxy"]
    end

    PROXY -->|BACKEND_URL| FN[Vercel Functions<br/>Express API]

    subgraph API["Backend project (Express)"]
        FN --> AUTH[Auth + JWT]
        FN --> EVENTS[Event routes]
    end

    AUTH --> POOL[(Neon pooler<br/>PgBouncer)]
    EVENTS --> POOL
    POOL --> PG[(PostgreSQL primary)]

    MIG[prisma migrate deploy] -->|DIRECT_URL| PG
```

Relevant files:

| Concern | File |
| --- | --- |
| Frontend proxy | `frontend/app/api/[...path]/route.ts` |
| Optional platform rewrite | `frontend/next.config.ts` |
| Express app / listener | `backend/src/server.js` |
| Vercel entry point | `backend/api/index.js` |
| Function bundle config | `backend/vercel.json` |
| Connection URLs | `backend/prisma/schema.prisma` |
| Session cookie | `backend/src/lib/session.js` |

---

## Where load is distributed

| Hop | What distributes traffic | What it means for this app |
| --- | --- | --- |
| Browser → frontend | Vercel anycast DNS + edge network | TLS terminates at the nearest edge; static assets and prerendered pages are served from cache. |
| Frontend rendering | Vercel's Next.js runtime | Each request is handled by a frontend instance; no app-level affinity is required. |
| Frontend → API | The `/api/[...path]` Route Handler (or the `next.config.ts` rewrite) | The browser only talks to the frontend origin, so the session cookie stays first-party. |
| API requests | Vercel Functions scheduler | Each invocation is routed to a running Function instance; concurrency scales automatically and instances scale to zero when idle. |
| API → database | Neon connection pooler (PgBouncer) | Many short-lived Function instances share a much smaller number of real PostgreSQL connections. |
| Migrations | `npm run db:deploy` from a workstation or CI | Uses `DIRECT_URL`, bypassing the pooler because DDL and advisory locks need a direct session. |

Vercel does not expose a user-managed load balancer for this setup, and none is
needed at the current scale. There is nothing to configure for round-robin,
least-connections, or sticky sessions.

---

## Why the API can be balanced freely

The API is deliberately **stateless**:

- Sessions are signed JWTs stored in an `HttpOnly` cookie. No session table and
  no in-memory session store exist, so a login handled by instance A is valid on
  instance B.
- Every event query is scoped by `req.userId` (`where: { userId: req.userId }`),
  so correctness does not depend on which instance receives the request.
- The server keeps no local files, uploads, or per-user caches between requests.
- `GET /health` reads no database state and returns `{ "ok": true }`.

This is what makes horizontal scaling safe. There is no need for sticky
sessions, and losing an instance does not log anyone out.

### Request lifecycle example

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Vercel Edge
    participant F as Next.js /api proxy
    participant A as API Function (instance 1)
    participant D as Neon Postgres

    B->>E: POST /api/auth/login
    E->>F: forward same-origin request
    F->>A: POST /auth/login (BACKEND_URL)
    A->>D: SELECT user by email
    D-->>A: user row + password hash
    A-->>F: 200 + Set-Cookie: token=...
    F-->>B: 200 + Set-Cookie (first-party)
    Note over B,A: Later requests may hit a different API instance
    B->>F: GET /api/events?from=...&to=...
    F->>A: GET /events (instance 2 is fine)
    A->>D: SELECT events WHERE userId = ...
    D-->>A: rows
    A-->>B: JSON
```

---

## Health checks

`GET /health` exists on the API and returns:

```json
{ "ok": true }
```

Use it for:

- uptime monitors and synthetic checks,
- smoke tests after a deployment,
- a quick way to confirm `BACKEND_URL` is reachable.

It is intentionally cheap and does **not** touch the database. Vercel's own
routing does not consume this endpoint; it replaces unhealthy instances at the
platform level.

If deeper checks are needed later, add a separate `/health/db` that runs a
bounded `SELECT 1` with a short timeout. Do not make the liveness endpoint depend
on the database, or a transient database blip will look like an API outage.

---

## Limits and bottlenecks

| Resource | Current configuration | Implication |
| --- | --- | --- |
| Function concurrency / duration | Set by the Vercel plan | Requests must stay short. Slow queries or bcrypt work reduce effective throughput. |
| JSON body size | `express.json({ limit: "1mb" })` in `backend/src/server.js` | Large payloads are rejected before reaching a route. Vercel also enforces a platform body limit. |
| Database connections | One Prisma pool per Function instance | The pooler is the first thing to exhaust under a traffic spike. |
| Password hashing | bcrypt cost factor `12` | Login and signup are CPU-bound and are the most expensive routine requests. |
| Event listing | Indexed by `(userId, date)` | Date-window queries stay cheap; avoid unbounded scans. |
| Cold starts | Prisma engines are bundled via `backend/vercel.json` | First request after idle is slower; keep the bundle lean and the region close to the database. |

### The connection pool is the real limit

Each serverless instance creates its own Prisma client and its own pool. With
many concurrent instances, the total number of PostgreSQL connections can grow
quickly even if each instance opens only a few.

Use two URLs:

| Variable | Used by | Should point at |
| --- | --- | --- |
| `DATABASE_URL` | Prisma Client at runtime | Pooled connection (Neon `-pooler` host, PgBouncer) |
| `DIRECT_URL` | `prisma migrate deploy` | Direct connection |

For Neon, a typical pooled runtime URL looks like:

```text
postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/DB?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15
```

`connection_limit=1` is a sensible starting point for serverless: each instance
holds very few connections and the pooler multiplexes the rest. Raise it only
after measuring, and keep the total below the database plan's connection limit.

Migrations are deliberately **not** run during the Vercel build, so a database
outage cannot block a deployment. Run them as an explicit step:

```bash
cd backend
npm run db:deploy
```

---

## Failure modes

| Failure | What users see | Mitigation |
| --- | --- | --- |
| Function cold start | One slow request, then normal latency | Keep the bundle small; co-locate regions; avoid heavy top-level work. |
| Pool exhaustion | `500` responses, timeouts, slow queries | Pooled `DATABASE_URL`, `connection_limit=1`, shorter transactions, monitor connections. |
| Database outage | `500` from API routes; frontend still loads | Do not run migrations in builds; add retries/backoff for transient connection errors. |
| Region mismatch | Elevated latency on every API call | Run the backend Function in the same region as the Neon primary. |
| Proxy misconfiguration | `BACKEND_URL not configured` or `500` from `/api/*` | Verify `BACKEND_URL` on the frontend project and redeploy after changing it. |
| Function timeout | `504`/platform error | Keep queries bounded; add indexes; avoid large synchronous loops. |
| Retried non-idempotent `POST` | Duplicate events in theory | Do not auto-retry writes on the client; use an idempotency key if retries become necessary. |

`DELETE /events/:id` is effectively idempotent from the client's perspective:
the owner gets `204` once, and a repeat returns `404`. `POST /events` is not
idempotent, so a network-level retry can create a second event.

---

## Scaling playbook

### Phase 0 — current

- Two Vercel projects (frontend and backend), one Neon PostgreSQL primary.
- Vercel handles edge distribution and Function concurrency.
- Stateless JWT sessions allow any instance to serve any request.
- Nothing to load-balance manually.

### Phase 1 — harden before scaling

1. Add rate limiting for `POST /auth/login` and `POST /auth/signup`. Use a shared
   store (for example Upstash Redis); in-memory counters do not work across
   serverless instances.
2. Add structured request logs with request IDs, latency, and status classes.
   Never log cookies, JWTs, or passwords.
3. Tune the database pool (`connection_limit`, `connect_timeout`) and alert on
   connection saturation.
4. Add a database-aware health check for dashboards, separate from `/health`.
5. Co-locate the backend project's region with the database region.

### Phase 2 — move beyond Vercel Functions (only if needed)

```mermaid
flowchart TD
    U[Users] --> LB[Managed load balancer<br/>TLS + health checks]
    LB --> A1[API instance 1]
    LB --> A2[API instance 2]
    LB --> A3[API instance 3]
    A1 --> R[(Redis<br/>rate limits / cache)]
    A2 --> R
    A3 --> R
    A1 --> P[(PgBouncer)]
    A2 --> P
    A3 --> P
    P --> DB[(PostgreSQL primary)]
    DB --> RR[(Read replica)]
```

- Keep the API stateless so the balancer can use round-robin or
  least-connections without sticky sessions.
- Point health checks at `/health`; remove unhealthy instances from rotation.
- Put shared rate limiting and hot caches in Redis, not process memory.
- Use a read replica for list-heavy reads if the primary becomes saturated;
  keep writes on the primary.
- Keep the same request contract so the frontend proxy does not change.

### Phase 3 — multi-region

- Run stateless API instances in more than one region behind latency-based
  routing.
- Keep a single write primary and use read replicas for regional reads.
- Accept that writes are cross-region; design the UI for that latency.
- Decide data residency and failover policy before adding regions, not after.

The project's own scalability note applies: **do not add infrastructure before
there is a measured requirement for it.**

---

## Load testing

Test on a preview deployment or a local backend with a Neon branch — not on
production without approval.

Useful targets:

- `GET /health` — baseline routing and cold-start cost.
- `POST /auth/login` — bcrypt and database read cost.
- `GET /api/events?from=...&to=...` — authenticated read path through the proxy.
- `POST /api/events` — authenticated write path.

A minimal k6 scenario:

```js
import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "60s", target: 50 },
    { duration: "30s", target: 0 },
  ],
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/health`);
  check(res, { "status is 200": (r) => r.status === 200 });
}
```

Measure p50/p95/p99 latency, error rate, Function invocations, and database
connection count. Watch for pool saturation before latency becomes visible to
users.

---

## Operational checklist

- [ ] `BACKEND_URL` points at the backend origin on the frontend project.
- [ ] Backend `FRONTEND_URL` matches the frontend origin exactly.
- [ ] `DATABASE_URL` uses the pooled host; `DIRECT_URL` is direct.
- [ ] Migrations run explicitly via `npm run db:deploy`, never during the build.
- [ ] `/health` returns `{ "ok": true }` after every deploy.
- [ ] Backend and database are in the same region.
- [ ] Login and signup have rate limiting before public launch.
- [ ] Logs are structured, redacted, and retained long enough to debug incidents.
- [ ] A load test has established a real baseline before adding infrastructure.

---

## Related documentation

- [Authentication API](README.md) — cookie, JWT, and endpoint contract.
- [Generic load-balancing design note](09_Load%20Balancing%203dd1e9fd729680ff8df4cebefd690499.md)
  — the original system-design exercise this document replaces for the shipped
  app.
- [Deployment architecture](15_Deployment%20Architecture%203e81e9fd72968021a029db1878eeca91.md)
- [Scalability strategy](10_Scalability%20Strategy%203dd1e9fd72968050b1ddd2f4e5df57a6.md)
- [Caching](08_Caching%203dd1e9fd72968031bd66d7190fed4dcb.md)
