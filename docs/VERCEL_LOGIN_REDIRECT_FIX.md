# Fix: Login Redirect Loop on Vercel Deployment

## Problem
After logging in on the Vercel deployment, users are redirected back to the login page instead of the dashboard. This happens because the session cookie isn't being properly set/stored when using `next.config.ts` rewrites between different Vercel domains (frontend and backend).

## Root Cause
When using `next.config.ts` rewrites to proxy `/api/*` requests from the frontend to a backend on a different domain:
1. The browser makes requests to the frontend origin (`https://your-frontend.vercel.app`)
2. Next.js rewrites forward them to the backend origin
3. The backend sets `Set-Cookie` headers, but browsers often don't persist cookies correctly when they're set during proxied responses in certain Vercel configurations
4. On the subsequent `GET /api/auth/me` request, the cookie isn't sent, so the backend returns 401
5. The dashboard sees a 401 and redirects back to `/login`

## Solution
Use a Next.js Route Handler as an explicit proxy instead of relying solely on rewrites. Route Handlers give us direct control over forwarding both request headers (including cookies) and response headers (including `Set-Cookie`).

## Changes Made

### 1. Added Next.js API Route Handler Proxy
Created `frontend/app/api/[...path]/route.ts` that:
- Proxies all `/api/*` requests to the backend specified by `BACKEND_URL`
- Forwards cookies from the browser to the backend
- Explicitly forwards all `Set-Cookie` headers from the backend to the browser
- Handles all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)

### 2. Existing Configuration (already in place)
- `frontend/next.config.ts` still has rewrites as fallback
- `frontend/lib/api.ts` defaults to `/api` 
- `backend/src/lib/session.js` sets cookies with `SameSite=Lax`, `HttpOnly`, `Secure` in production, `Path=/`

## Environment Variables Required

### Frontend Project (Vercel)
| Variable | Value | Notes |
| --- | --- | --- |
| `BACKEND_URL` | `https://your-backend.vercel.app` | Backend origin (no trailing slash) |
| `NEXT_PUBLIC_API_URL` | `/api` or leave unset | Defaults to `/api` in the codebase |

### Backend Project (Vercel)
| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Use pooled connection in production |
| `DIRECT_URL` | Direct PostgreSQL connection | For migrations |
| `JWT_SECRET` | Long random string | Used to sign session tokens |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | For CORS |
| `NODE_ENV` | `production` | Set by Vercel automatically |

## Testing the Fix

1. Deploy both projects to Vercel with the correct environment variables
2. Open your frontend in a browser and go to `/login`
3. Open DevTools → Network tab
4. Log in with valid credentials
5. Check the `POST /api/auth/login` request - should have `Set-Cookie: token=...` in response headers
6. Check Application/Storage → Cookies for your frontend domain - should have a `token` cookie
7. Check `GET /api/auth/me` - should include `Cookie: token=...` in request headers and return 200
8. You should be redirected to `/dashboard` and stay logged in

## Troubleshooting

### Cookie still not being set
- Ensure `BACKEND_URL` is set correctly on the frontend project
- Redeploy the frontend after adding/changing `BACKEND_URL`
- Check that the backend is accessible at `BACKEND_URL/health`

### Still getting 401 on /auth/me
- Verify the cookie is actually stored in the browser for the frontend domain
- Check that `credentials: "include"` is used (it is in the API client)
- Ensure the backend's `JWT_SECRET` is set and consistent
- Check backend logs in Vercel for any errors

### CORS issues
- The route handler makes server-side requests, so CORS isn't an issue for browser→frontend
- The backend's CORS is mainly for direct calls; with the proxy it's less critical

## Why This Works
The route handler runs on the frontend's Vercel deployment (same origin as the browser), so:
- Cookies set via `Set-Cookie` from the route handler response are set for the frontend domain
- The browser automatically includes cookies on subsequent requests to the same origin
- No cross-site cookie issues occur because everything goes through the frontend origin
- We have full control over header forwarding

## Alternative Approaches
- **Use rewrites only**: Works in some cases but unreliable across different Vercel domains
- **Use a custom domain for both**: Put both under same domain with different paths
- **Set cookies with `SameSite=None; Secure` and call backend directly**: Requires `CROSS_SITE_COOKIES=true` on backend and proper CORS setup
