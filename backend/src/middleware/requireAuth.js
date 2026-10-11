import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const { sub } = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.userId = sub;
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
}