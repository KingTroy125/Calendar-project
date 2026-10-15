# Calendar Authentication API

## Purpose

This document describes the current authentication API and the design constraints for evolving it safely. The API is an Express service backed by PostgreSQL through Prisma. The frontend is a separate Next.js application and sends credential requests with cookies enabled.

Authentication is session-cookie based: after successful signup or login, the API signs a JWT and sets it in an HttpOnly cookie. The frontend receives only the public user fields; it must not read, store, or forward the JWT itself.

## Service Configuration

Run commands from `backend/`.

```bash
npm run dev
```

The API listens on `PORT` (default `3001`). The frontend's `NEXT_PUBLIC_API_URL` must be the API base URL, for example `http://localhost:3001`; the frontend calls `/auth/...` beneath it. Configure `FRONTEND_URL` to the exact frontend origin so credentialed CORS requests are accepted.

Required secrets and database values are supplied through the backend environment:

- `DATABASE_URL`: PostgreSQL connection URL used by Prisma.
- `DIRECT_URL`: direct database URL if required by the Prisma schema/configuration.
- `JWT_SECRET`: strong, randomly generated signing secret; never commit it.
- `FRONTEND_URL`: allowed browser origin for credentialed API requests.
- `PORT`: optional HTTP port.

Production must serve the API over HTTPS. The current server connects Prisma before listening and logs startup plus request method, path, status, and duration. Do not add request bodies, cookies, passwords, or authorization tokens to logs.

## API Contract

All endpoints are mounted under `/auth`. Request and response bodies use JSON except logout, which has no response body.

### `POST /auth/signup`

Creates an email/password account and immediately establishes a session.

Request:

```json
{
  "email": "person@example.com",
  "password": "at-least-eight-characters"
}
```

Success: `201 Created`

```json
{
  "id": "user-id",
  "email": "person@example.com"
}
```

The response includes `Set-Cookie: token=...`; browser code should use `credentials: "include"` and must not expose the cookie to JavaScript.

Errors currently returned by the route:

- `400 Bad Request`: email/password does not satisfy the schema (`email` must be valid format; password must be at least 8 characters).
- `409 Conflict`: email is already in use.

### `POST /auth/login`

Verifies credentials and establishes a session.

Request: same shape as signup.

Success: `200 OK`, with `{ "id": "user-id", "email": "person@example.com" }` and a new `token` cookie.

Errors currently returned by the route:

- `400 Bad Request`: request fails schema validation.
- `401 Unauthorized`: account does not exist or password does not match. The same response avoids revealing which credential was incorrect.

### `GET /auth/me`

Returns the current authenticated user. The `requireAuth` middleware verifies the JWT cookie and supplies the user ID to the route. The route reads only `id` and `email` from the database.

Success: `200 OK`

```json
{
  "id": "user-id",
  "email": "person@example.com"
}
```

`401 Unauthorized` is returned when the cookie is missing/invalid or the user no longer exists.

### `POST /auth/logout`

Clears the browser's `token` cookie.

Success: `204 No Content`.

Because the JWT is stateless, clearing the cookie logs out that browser but does not revoke a copied token. A copied token can remain valid until its seven-day expiry.

## Session and Password Design

- Passwords are hashed using bcryptjs with cost factor `12`; plaintext passwords are never written to the database.
- The signed JWT contains the user's ID as the standard `sub` claim and expires after seven days.
- The cookie is `HttpOnly`, `SameSite=Lax`, and has a seven-day `maxAge`. `Secure` is enabled when `NODE_ENV=production`.
- `HttpOnly` prevents ordinary client-side JavaScript from reading the token. `Secure` requires HTTPS in production. `SameSite=Lax` is a useful CSRF mitigation, not a replacement for threat-model-specific CSRF controls.
- The Prisma `User` model has a unique email and optional password hash. The `Account` model represents provider identities and enforces uniqueness on `(provider, providerAccountId)`.

## Frontend Integration

The frontend posts JSON to the API with `credentials: "include"`. On non-2xx responses, it displays the backend's `{ "error": "..." }` message. The frontend should not invent authentication or validation errors that contradict the API response. Browser validation may improve usability, but server validation remains authoritative.

Example:

```ts
await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
})
```

## Production Hardening Priorities

These are recommendations, not claims about existing behavior:

1. **Rate limiting and abuse controls:** apply stricter limits to signup and login by IP/account, with monitoring and a gradual backoff strategy. Avoid permanent account lockouts that enable denial of service.
2. **Email normalization:** trim and normalize email before lookup/create (at minimum lowercase consistently) so case variants do not create confusing duplicate identities. Keep the unique database constraint as the final arbiter; handle unique-constraint races as `409`.
3. **CSRF and origin policy:** keep exact-origin credentialed CORS. For deployments where cross-site cookies are needed, explicitly design `SameSite=None; Secure` and add CSRF defenses such as origin validation or a token. Never use wildcard CORS with credentials.
4. **Session revocation:** if immediate logout/revocation is required, use server-side sessions or add a session/version identifier checked on authenticated requests. Cookie clearing alone cannot revoke an issued JWT.
5. **Secret and cookie lifecycle:** validate `JWT_SECRET` at process startup, rotate it deliberately, and set explicit cookie `path` and production domain policy. Cookie clearing must use the same path/domain attributes as cookie creation.
6. **Consistent errors:** define a JSON error contract for unexpected database and server failures. Do not expose stack traces or internal error details to clients; retain safe diagnostic context in server logs.
7. **Input and response limits:** enforce request-size limits, validate content type, normalize/validate input server-side, and select only public fields in every user response.
8. **Email ownership:** add an email verification flow before treating an address as verified or enabling sensitive recovery actions. Syntax validation alone does not prove that an address exists or belongs to the user.
9. **Observability:** keep request logs structured and redacted; add correlation IDs and metrics for latency and status classes without logging secrets or credential payloads.

## Verification Checklist

- Signup success creates exactly one user, stores a bcrypt hash, returns only public user fields, and sets an HttpOnly cookie.
- Signup rejects invalid input and duplicate email with the documented status codes.
- Login succeeds for the correct password; wrong password and unknown account return the same `401` body.
- `/auth/me` succeeds with a valid cookie and returns `401` when unauthenticated.
- Logout clears the cookie with matching cookie attributes.
- CORS permits the configured frontend origin with credentials and rejects unapproved origins.
- Logs never contain credentials, JWTs, or cookie values.
