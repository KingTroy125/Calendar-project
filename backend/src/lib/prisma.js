import { PrismaClient } from "@prisma/client";

// Reuse a single client across hot reloads in development and across
// invocations within the same serverless instance in production. Without this,
// every reload/cold start can open a new pool and exhaust the database's
// connection limit.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
