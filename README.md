# Calendar Project

A full-stack Calendar application built with **Next.js** (frontend) and **Express + Prisma + PostgreSQL** (backend), designed to be deployed as two projects on **Vercel**.

---

## Architecture Overview

- **Frontend (`/frontend`)**: Next.js App Router application with Tailwind CSS, Lucide icons, and an API proxy handler (`/api/[...path]`).
- **Backend (`/backend`)**: Express API with Prisma ORM, PostgreSQL database, and JWT cookie-based session management.
- **Session Handling**: First-party `HttpOnly` session cookies proxied via Next.js to ensure secure cross-deployment authentication.

---

## Documentation

- [Vercel Deployment & Authentication Fixes](docs/VERCEL_FIXES_README.md): Detailed explanation of the `500 FUNCTION_INVOCATION_FAILED` fix and the login redirect loop resolution.
- [Vercel Deployment Guide](docs/vercel-deployment.md): Step-by-step setup for deploying frontend and backend to Vercel.
- [Authentication API Specification](docs/README.md): API contract and schema details for auth endpoints.

---

## Local Development

### 1. Backend Setup

```bash
cd backend
npm install
# Ensure .env has DATABASE_URL, DIRECT_URL, and JWT_SECRET
npm run postinstall # Generates Prisma Client
npm run dev         # Starts on http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # Starts on http://localhost:3000
```