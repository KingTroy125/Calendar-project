# 14_System Data Flows

This section documents how data moves through the system.

Login Flow

```mermaid
flowchart TD
	A[User] --> B[Login Page] --> C[Authentication Provider]
	C --> D[Backend] --> E[User Account] --> F[Dashboard]
```

Create Event

```mermaid
flowchart TD
	1[User] --> 2[Calendar UI] --> 3(POST /api/events)
	3 --> 4[Authentication] --> 5(Validation) --> 6[Business Logic]
	6 --> 7([PostgreSQL]) --> 8(Response) --> 9[Calendar UI]

```

Read Events

```mermaid
flowchart TD
	1[User] --> 2[Calendar UI] --> 3(GET /api/events)
	3 --> 4[Authentication] --> 5[Business Logic]
	5 --> 6([PostgreSQL]) --> 7[Events] --> 8(API Response) --> 9[Calendar UI]
```

Update Event

```mermaid
User
 ↓
Edit Event
 ↓
PUT /api/events/:id
 ↓
Authentication
 ↓
Validation
 ↓
Business Logic
 ↓
PostgreSQL
 ↓
Updated Event
 ↓
Calendar UI
```

 Delete Event

```mermaid
User
 ↓
Delete Event
 ↓
DELETE /api/events/:id
 ↓
Authentication
 ↓
Authorization
 ↓
Business Logic
 ↓
PostgreSQL
 ↓
Confirmation
 ↓
Calendar UI
```