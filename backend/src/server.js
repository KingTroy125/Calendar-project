import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import auth from "./routes/auth.js";
import events from "./routes/events.js";
import { prisma } from "./lib/prisma.js";

// This file builds the Express app for the calendar API. It is exported so
// Vercel can run it as a single serverless Function; locally it also starts a
// normal listener.
const app = express();

// Handle preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.FRONTEND_URL) {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie,X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// A request can arrive with an extra `/api` prefix when it is proxied by the
// frontend (or when the API is called directly at `/api/...`). Strip just that
// first segment so the same route table works everywhere.
app.use((req, _res, next) => {
	if (req.url === "/api") {
		req.url = "/";
	} else if (req.url.startsWith("/api/")) {
		req.url = req.url.slice(4);
	}
	next();
});

app.use((req, res, next) => {
	const startedAt = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - startedAt;
		console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
	});
	next();
});

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.use("/auth", auth);
app.use("/events", events);

app.use((_req, res) => {
	res.status(404).json({ error: "Not found" });
});

// Keep unexpected failures as JSON instead of Express's default HTML stack.
app.use((error, _req, res, _next) => {
	console.error("Unhandled request error:", error);
	res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 3001);

async function startServer() {
	console.log("Connecting to database...");

	try {
		await prisma.$connect();
		console.log("Database connected.");

		const server = app.listen(port, () => {
			console.log(`\nCalendar API server started`);
			console.log(`Listening at http://localhost:${port}`);
			console.log(`Auth routes: /auth/signup, /auth/login, /auth/me, /auth/logout`);
			console.log(`Event routes: GET/POST /events\n`);
		});

		server.on("error", (error) => {
			console.error(`Failed to start API server: ${error.message}`);
			process.exitCode = 1;
		});
	} catch (error) {
		console.error("Database connection failed:", error);
		process.exitCode = 1;
	}
}

// Vercel imports this module and invokes the exported app; it must not open a
// listener. Local development and `npm start` still get a normal server.
if (process.env.VERCEL || process.env.NODE_ENV === "production" && !process.env.PORT) {
  // In serverless, just export the app
} else if (!process.env.VERCEL) {
	startServer();
}

export default app;