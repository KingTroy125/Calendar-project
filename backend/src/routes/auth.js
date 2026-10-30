import { Router } from "express";
// It hashes the password using bcrypt and issues a session token.
import bcrypt from "bcryptjs";
// lets you declare a schema and validate against it:
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { issueSession, clearSession } from "../lib/session.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// This schema defines the expected structure of the request body for signup and login routes.
// It expects an email string that must be a valid email format and a password string that must be at least 8 characters long.
const creds = z.object({ email: z.string().email(), password: z.string().min(8) });

// The profile the settings screen can write. Every field is optional so a
// single-field save only touches that column.
const profileUpdate = z.object({
  email: z.string().email().optional(),
  firstName: z.string().trim().max(60).nullable().optional(),
  lastName: z.string().trim().max(60).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must use YYYY-MM-DD")
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Date of birth is not a real date")
    .nullable()
    .optional(),
  weekStartsOn: z.enum(["sunday", "monday"]).optional(),
  defaultEventDuration: z.number().int().min(5).max(240).optional(),
});

const passwordChange = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// What the browser is allowed to see. Never include passwordHash.
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    bio: user.bio ?? null,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    weekStartsOn: user.weekStartsOn ?? "monday",
    defaultEventDuration: user.defaultEventDuration ?? 60,
    createdAt: user.createdAt,
  };
}

// Empty strings from cleared inputs become NULL so "no value" is stored once.
function normalizeText(value) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Signup route
// This route handles user signup by validating the provided email and password against the defined schema.
// It checks if the email is already in use and, if not, creates a new user in the database with a hashed password.
// Upon successful signup, it issues a session token and responds with the user's public profile.
router.post("/signup", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password" });
  const { email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } }))
    return res.status(409).json({ error: "Email address already in use." });

  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12) },
  });
  issueSession(res, user.id);
  res.status(201).json(publicUser(user));
});

// Login route
// This route handles user login by validating the provided email and password.
// It checks if the user exists in the database and verifies the password using bcrypt.
// If the credentials are valid, it issues a session token and responds with the user's public profile.
// If the credentials are invalid, it responds with a 401 status indicating unauthorized access.
router.post("/login", async (req, res) => {
  const parsed = creds.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) return res.status(401).json({ error: "Invalid credentials" });

  issueSession(res, user.id);
  res.json(publicUser(user));
});

// Get current user route
// "am i still logged in and who am i" — returns the profile the settings screen renders.
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json(publicUser(user));
});

// Update the signed-in user's profile. Partial updates are supported so the
// settings screen can save each field on its own.
router.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileUpdate.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid profile" });
  }

  const { email, firstName, lastName, bio, dateOfBirth, weekStartsOn, defaultEventDuration } = parsed.data;
  const data = {};

  if (email !== undefined) data.email = email.trim().toLowerCase();
  if (firstName !== undefined) data.firstName = normalizeText(firstName);
  if (lastName !== undefined) data.lastName = normalizeText(lastName);
  if (bio !== undefined) data.bio = normalizeText(bio);
  if (dateOfBirth !== undefined) {
    data.dateOfBirth = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null;
  }
  if (weekStartsOn !== undefined) data.weekStartsOn = weekStartsOn;
  if (defaultEventDuration !== undefined) data.defaultEventDuration = defaultEventDuration;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    const user = await prisma.user.update({ where: { id: req.userId }, data });
    res.json(publicUser(user));
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Email address already in use." });
    }
    throw error;
  }
});

// Change the password for the signed-in account.
router.patch("/password", requireAuth, async (req, res) => {
  const parsed = passwordChange.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.passwordHash) {
    return res.status(400).json({ error: "This account does not use a password." });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect." });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  res.sendStatus(204);
});

// Logout route
// This route handles user logout by clearing the session token cookie from the client's browser.
// It responds with a 204 status code, indicating that the request was successful and there is no content to return.
router.post("/logout", (_req, res) => {
  clearSession(res);
  res.sendStatus(204);
});

export default router;
