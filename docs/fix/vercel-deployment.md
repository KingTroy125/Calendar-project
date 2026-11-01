# Deploying on Vercel

The repository has two deployable apps:

| App | Directory | Vercel Root Directory |
| --- | --- | --- |
| Next.js frontend | `frontend/` | `frontend` |
| Express API | `backend/` | `backend` |

Deploy them as **two Vercel projects**. The frontend proxies `/api/*` to the API
so the session cookie stays first-party in the browser.

## 1. Backend project

Import the repository at [vercel.com/new](https://vercel.com/new) and set the
**Root Directory** to `backend`.

Vercel detects the Express app from `src/server.js`, which exports the Express
instance. `backend/vercel.json` runs `npx prisma generate` during the build and
includes the generated Prisma engines in the Function bundle.

### Environment variables

Set these in **Project Settings → Environment Variables** (Production and
Preview):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used at runtime. Prefer a pooled URL (PgBouncer, Neon pooler, Supabase pooler). |
| `DIRECT_URL` | Direct, non-pooled connection used by Prisma migrations. May equal `DATABASE_URL` if the provider has no pooler. |
| `JWT_SECRET` | Long random value used to sign session JWTs. Never commit it. |
| `FRONTEND_URL` | Exact frontend origin, e.g. `https://your-frontend.vercel.app` (no trailing slash). |

`NODE_ENV` is set to `production` by Vercel. `PORT` is ignored by Functions.

### Database migrations

Run migrations once against the production database (or after schema changes),
from `backend/` with the production `DATABASE_URL`/`DIRECT_URL` available:

```bash
npm run db:deploy
```

Migrations are intentionally **not** run during the Vercel build so a database
outage cannot block a deployment.

### Verify

```bash
curl https://your-backend.vercel.app/health
# {"ok":true}
```

## 2. Frontend project

The existing frontend project keeps **Root Directory** = `frontend`.

### Environment variables

| Name | Value |
| --- | --- |
| `BACKEND_URL` | Backend origin, e.g. `https://your-backend.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Optional. Omit it (or set `/api`) so the app calls its own `/api` proxy. |
| `NEXT_PUBLIC_*` | Any other existing public values. |

`BACKEND_URL` is read by `frontend/next.config.ts` at build time to create the
`/api/:path*` rewrite. Redeploy the frontend after changing it.

## How requests flow

```
Browser → https://frontend.vercel.app/api/auth/login
        → Vercel rewrite (frontend project)
        → https://backend.vercel.app/auth/login
```

Because the browser only talks to the frontend origin, the `token` cookie is
first-party and uses `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/` in
production. If you instead call the API directly on a different site, set
`CROSS_SITE_COOKIES=true` on the backend to switch to `SameSite=None; Secure`
(and add CSRF protection, since that cookie is sent cross-site).

## Local development

Local development is unchanged:

- Frontend: `NEXT_PUBLIC_API_URL=http://localhost:3001` in `frontend/.env`.
- Backend: `npm run dev` in `backend/` reads `backend/.env`.

See `backend/.env.example` for the required values.
