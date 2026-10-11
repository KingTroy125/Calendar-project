import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import auth from "./routes/auth.js";
import { prisma } from "./lib/prisma.js";

// This file sets up an Express server for the backend of a calendar application. 
// It imports necessary modules, configures middleware, and defines routes for user authentication. 
// The server connects to a database using Prisma and listens for incoming requests on a specified port. 
// It also includes logging for request details and handles errors during server startup and database connection.
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
	const startedAt = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - startedAt;
		console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
	});
	next();
});
app.use("/auth", auth);

const port = Number(process.env.PORT || 3001);

async function startServer() {
	console.log("Connecting to database...");

	try {
		await prisma.$connect();
		console.log("Database connected.");

		const server = app.listen(port, () => {
			console.log(`\nCalendar API server started`);
			console.log(`Listening at http://localhost:${port}`);
			console.log(`Auth routes: /auth/signup, /auth/login, /auth/me, /auth/logout\n`);
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

startServer();