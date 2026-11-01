# 15_Deployment Architecture

## Deployment Objective

> The deployment architecture defines how the application moves from development into a production environment.
> 

Current hosting technology selected:

- Vercel

The exact deployment arrangement for the Node.js/Express backend still needs confirmation.

## Development

```mermaid
Developer
   ↓
Git Repository
   ↓
Local Development
   ├── Next.js
   ├── Node.js / Express
   └── PostgreSQL
```

## Production

High-level model:

```mermaid
Users
  ↓
Production Web Application
  ↓
Backend API
  ↓
PostgreSQL
```

## Deployment Considerations

The final deployment design should define:

- Frontend hosting
- Backend hosting
- Database hosting
- Environment variables
- Production secrets
- HTTPS
- Deployment process
- Rollback process

These should not be finalized until the actual hosting configuration is agreed.