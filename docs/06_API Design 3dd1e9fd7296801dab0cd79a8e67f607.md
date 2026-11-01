# 06_API Design

API Purpose

The backend API provides communication between the frontend application and the database.

The API will use a REST-style architecture.

```mermaid
Next.js
   │
   │ HTTPS
   ▼
Express API
   │
   ▼
Business Logic
   │
   ▼
PostgreSQL
```

## Example Endpoints

Events

Method Endpoint Purpose

- GET /api/events Retrieve events
- GET /api/events/:id Retrieve one event
- POST /api/events Create event
- PUT /api/events/:id Update event
- DELETE /api/events/:id Delete event

HTTP Methods

- GET — retrieve data
- POST — create data
- PUT — update data
- DELETE — remove data

## API Response

Example successful response:

```mermaid
{
  "id": "event_123",
  "title": "Team Meeting",
  "startTime": "2026-10-01T09:00:00",
  "endTime": "2026-10-01T10:00:00"
}
```

## API Errors

The API should return appropriate HTTP status codes.

Examples:

Status Meaning

- 200 Successful request
- 201 Resource created
- 400 Invalid request
- 401 Unauthenticated
- 403 Unauthorized
- 404 Resource not found
- 500 Server error