# Vercel Deployment & Authentication Fixes

This document details the root causes and architectural solutions for two major issues encountered when deploying the Calendar application on Vercel:
1. **`500 FUNCTION_INVOCATION_FAILED`** on the backend Express service.
2. **The Login Redirect Loop** (user logs in successfully but is redirected straight back to `/login` instead of staying on `/dashboard`).

---

## 1. Fix 1: Backend `500 FUNCTION_INVOCATION_FAILED`

### Symptoms
When requesting the backend API directly (e.g. `https://<backend-project>.vercel.app/health`), Vercel displayed:
```text
This page is unavailable
A function needed by this page temporarily failed.
500 FUNCTION_INVOCATION_FAILED
cpt1::4mv5r-1792966469176-121813ac4c4d
```

### Root Causes

1. **Uncaught SyntaxError in pure JavaScript**:
   In `backend/src/lib/session.js`, a TypeScript type annotation (`: any`) was added to a JavaScript file:
   ```javascript
   // ❌ SyntaxError: Missing initializer in const declaration
   const options: any = {
     httpOnly: true,
     ...
   };
   ```
   When Vercel's Node.js runtime booted the serverless function, it imported `server.js` $\rightarrow$ `routes/auth.js` $\rightarrow$ `lib/session.js`. Node crashed immediately during module evaluation before processing any requests.

2. **Missing Vercel Serverless Entrypoint**:
   Vercel serverless functions in Node.js projects must be located in an `api/` directory (or defined via routing rewrites). The repository previously removed the build/route configuration from `backend/vercel.json` without creating an `api/index.js` bridge.

3. **Prisma Engine Bundling**:
   Serverless functions require Prisma engine binaries (`rhel-openssl-3.0.x`) to be bundled into the function output.

### Changes Made

- **Removed Invalid Type Annotation** in [`backend/src/lib/session.js`](file:///c:/Users/trist/Downloads/Calendar-project/backend/src/lib/session.js):
  ```javascript
  // ✅ Valid JavaScript
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
  };
  ```

- **Created Serverless Entrypoint** at [`backend/api/index.js`](file:///c:/Users/trist/Downloads/Calendar-project/backend/api/index.js):
  ```javascript
  import app from "../src/server.js";

  export default app;
  ```

- **Configured Rewrites & Engine Inclusion** in [`backend/vercel.json`](file:///c:/Users/trist/Downloads/Calendar-project/backend/vercel.json):
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "buildCommand": "npx prisma generate",
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/api"
      }
    ],
    "functions": {
      "api/index.js": {
        "includeFiles": "node_modules/.prisma/**"
      }
    }
  }
  ```

- **Guarded Server Listener** in [`backend/src/server.js`](file:///c:/Users/trist/Downloads/Calendar-project/backend/src/server.js):
  Prevented `app.listen()` from running inside Vercel's serverless environment where Vercel manages the HTTP lifecycle:
  ```javascript
  if (!process.env.VERCEL) {
    startServer();
  }
  ```

---

## 2. Fix 2: Login Redirect Loop (Dashboard Bounce)

### Symptoms
1. User logs in with valid credentials on `/login`.
2. Login request succeeds (`POST /api/auth/login` returns `200 OK`).
3. The page briefly navigates to `/dashboard`.
4. Immediately, the page bounces back to `/login`.

### Root Causes

1. **Proxy Failed to Forward the Incoming `Cookie` Header**:
   - The frontend uses Next.js App Router with an API proxy handler at `frontend/app/api/[...path]/route.ts`.
   - When the user logs in, the backend sends `Set-Cookie: token=...`.
   - The browser saves the cookie on the frontend domain (`https://<frontend>.vercel.app`).
   - When the dashboard mounted, it called `GET /api/auth/me`.
   - The browser attached `Cookie: token=...` to the request, but the proxy route copied general headers via `req.headers.forEach(...)` without explicitly ensuring the `cookie` header was set on the backend `fetch` call.
   - The backend received no cookie, resulting in `401 Not authenticated`.

2. **Dashboard 401 Interception**:
   In `frontend/components/dashboard-page.tsx`, any `401` response from `getCurrentUser()` triggers an immediate redirect:
   ```typescript
   if (requestError instanceof BackendError && requestError.status === 401) {
     router.replace('/login');
     return;
   }
   ```

3. **Soft Client-Side Navigation Race Condition**:
   Using `router.push('/dashboard')` immediately after `await login(...)` caused Next.js to render `/dashboard` while the browser was still committing the `Set-Cookie` header. When `getCurrentUser()` executed, the cookie was not yet attached.

### Changes Made

- **Explicit Cookie Forwarding** in [`frontend/app/api/[...path]/route.ts`](file:///c:/Users/trist/Downloads/Calendar-project/frontend/app/api/%5B...path%5D/route.ts):
  ```typescript
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  // Explicitly forward incoming cookies to the backend
  const cookie = req.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  ```

- **Hard Navigation on Successful Authentication** in [`frontend/components/login-form.tsx`](file:///c:/Users/trist/Downloads/Calendar-project/frontend/components/login-form.tsx):
  ```typescript
  if (mode === 'signup') {
    await signup(email, password)
  } else {
    await login(email, password)
  }
  // Full page load ensures cookies are committed before the dashboard mounts
  window.location.href = '/dashboard'
  ```

---

## 3. Architecture & Request Flow

```
Browser (Origin: https://frontend.vercel.app)
  │
  ├─ 1. POST /api/auth/login ─────────────► Next.js API Proxy
  │                                           │ (frontend/app/api/[...path]/route.ts)
  │                                           ▼
  │                                         Backend API (POST /auth/login)
  │                                           │ (backend/api/index.js)
  │                                           ▼
  │                                         Issue JWT Cookie: Set-Cookie: token=...
  │                                           │
  │  ◄─ 2. Returns 200 OK + Set-Cookie ───────┘
  │
  ├─ 3. Full navigation to /dashboard
  │
  ├─ 4. GET /api/auth/me (with Cookie: token=...) ──► Next.js API Proxy
  │                                                     │
  │                                                     ▼ (Forwards Cookie: token=...)
  │                                                   Backend API (GET /auth/me)
  │                                                     │
  │                                                     ▼ (jwt.verify succeeds)
  │  ◄─ 5. Returns 200 OK + { id, email } ─────────────┘
  │
  └─ User stays on Dashboard!
```

---

## 4. Required Vercel Environment Variables

### Frontend Project Settings
| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `BACKEND_URL` | `https://your-backend.vercel.app` | URL of the deployed backend (no trailing slash). |
| `NEXT_PUBLIC_API_URL` | `/api` | Relative proxy path (default). |

### Backend Project Settings
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL pooled connection string (Neon, Supabase, PgBouncer). |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma migrations. |
| `JWT_SECRET` | Strong secret string used to sign and verify session tokens. |
| `FRONTEND_URL` | Frontend origin (e.g. `https://your-frontend.vercel.app`) for CORS. |
| `NODE_ENV` | Set to `production` by Vercel automatically. |

---

## 5. How to Deploy

Commit and push all changes to your repository:

```bash
git add backend/ frontend/ docs/
git commit -m "fix: resolve backend 500 invocation error and dashboard login redirect loop"
git push origin main
```
