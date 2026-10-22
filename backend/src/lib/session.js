import jwt from "jsonwebtoken";

// This function issues a session token for the authenticated user. 
// It creates a JWT (JSON Web Token) containing the user's ID (sub) and signs it with a secret key. 
// The token is set to expire in 7 days. The function then sets the token as an HTTP-only cookie in the response, ensuring that it is secure and not accessible via JavaScript on the client side. 
// The cookie is configured to be secure in production environments and has a same-site policy of "lax" to prevent CSRF attacks.
export function issueSession(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}