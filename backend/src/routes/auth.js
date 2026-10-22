import { Router } from "express";
// It hashes the password using bcrypt and issues a session token.
import bcrypt from "bcryptjs";
// lets you declare a schema and validate against it:
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { issueSession } from "../lib/session.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
// This schema defines the expected structure of the request body for signup and login routes.
// It expects an email string that must be a valid email format and a password string that must be at least 8 characters long.
const creds = z.object({ email: z.string().email(), password: z.string().min(8) });

// Signup route
// This route handles user signup by validating the provided email and password against the defined schema.
// It checks if the email is already in use and, if not, creates a new user in the database with a hashed password.
// Upon successful signup, it issues a session token and responds with the user's ID and email.
router.post("/signup", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password" });
  const { email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } }))
    return res.status(409).json({ error: "Email already in use" });

  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12) },
  });
  issueSession(res, user.id);
  res.status(201).json({ id: user.id, email: user.email });
});

// Login route
// This route handles user login by validating the provided email and password.
// It checks if the user exists in the database and verifies the password using bcrypt.
// If the credentials are valid, it issues a session token and responds with the user's ID and email.
// If the credentials are invalid, it responds with a 401 status indicating unauthorized access.
router.post("/login", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) return res.status(401).json({ error: "Invalid credentials" });

  issueSession(res, user.id);
  res.json({ id: user.id, email: user.email });
});

// Get current user route
// This route uses the requireAuth middleware to ensure that the user is authenticated before accessing their information. 
// It retrieves the user's details from the database using their user ID, which is extracted from the JWT token in the request cookies. 
// If the user is found, it returns their ID and email; otherwise, it responds with a 401 status indicating that the user is not authenticated.
// "am i still logged in and who am i" route
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true },
  });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json(user);
});

// Logout route
// This route handles user logout by clearing the session token cookie from the client's browser. 
// It responds with a 204 status code, indicating that the request was successful and there is no content to return.
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.sendStatus(204);
});

export default router;