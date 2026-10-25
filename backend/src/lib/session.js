import jwt from "jsonwebtoken";

// Session cookies are used by a browser that talks to the API either directly
// or through the frontend's same-origin `/api` proxy. The proxy keeps the
// cookie first-party, so `SameSite=Lax` is the default. Set
// CROSS_SITE_COOKIES=true only when the browser must call the API on a
// different site directly; that switches to `SameSite=None; Secure`, which
// browsers require for cross-site cookies.
function cookieOptions({ includeMaxAge = true } = {}) {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = process.env.CROSS_SITE_COOKIES === "true" ? "none" : "lax";

  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
  };

  if (includeMaxAge) {
    options.maxAge = 7 * 24 * 60 * 60 * 1000;
  }

  return options;
}

// Issues a session token for the authenticated user. It creates a JWT
// containing the user's ID (sub), signs it with the secret, and sets it as an
// HttpOnly cookie that expires after seven days.
export function issueSession(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, cookieOptions());
}

// Clear with the same attributes used when setting the cookie, otherwise the
// browser keeps the original cookie.
export function clearSession(res) {
  res.clearCookie("token", cookieOptions({ includeMaxAge: false }));
}
