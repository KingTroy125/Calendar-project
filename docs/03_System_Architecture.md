# 03_System_Architecture

## 3.1 Architecture Objective

The system architecture describes how information moves through the Calendar Ecosystem from the user interface to the backend and database.

The first architecture deliverable should therefore be a high-level flow diagram showing:

```mermaid
flowchart TD
User --> Web/Future_Mobile_Client --> Backend_API --> Business_Logic --> Database
```

---

## 3.2 High-Level System Architecture

```mermaid
flowchart TD
    User[User]
    Web["Web App<br/>Next.js + TS"]
    Mobile["Mobile App<br/>(Future)"]
    API["Backend API<br/>Node.js + Express"]
    Auth[Auth]
    Logic["Business Logic"]
    Valid[Validation]
    DB[("PostgreSQL<br/>Database")]

    User --> Web
    User --> Mobile
    Web -->|HTTPS / API| API
    Mobile -->|HTTPS / API| API
    API --> Auth
    API --> Logic
    API --> Valid
    Logic --> DB
```

> **Important**
The Mobile App box is shown for the architecture to model the interaction between mobile/web applications, backend servers and the database.
> 
> 
> It is not part of the current MVP implementation. The BRS explicitly lists the mobile application as out of scope.
> 

---

## 3.3 Diagram

```mermaid
flowchart TD
    subgraph Presentation["PRESENTATION LAYER"]
        User[User]
        Web["Next.js Web App"]
        Mobile["Mobile App (Future)"]
        User --> Web
        User --> Mobile
    end

    subgraph Application["APPLICATION LAYER"]
        Backend["Node.js / Express"]
        Auth[Auth]
        EventLogic["Event Logic"]
        Validation[Validation]
        Backend --> Auth
        Backend --> EventLogic
        Backend --> Validation
    end

    subgraph Data["DATA LAYER"]
        PG[("PostgreSQL")]
        Users[(Users)]
        Events[(Events)]
        PG --> Users
        Users --> Events
    end

    Presentation -->|HTTPS / REST API| Application
    Application -->|SQL / DB Operations| Data
```

**Layer 1 — Client**

1. User
2. Web Application — Next.js + TypeScript
3. Mobile Application — Future

**Layer 2 — Backend**

1. Backend API — Node.js + Express
2. Authentication
3. Business Logic
4. Validation

**Layer 3 — Database**

1. PostgreSQL
2. Users
3. Events

---

## 3.4 Connections

Use arrows in this direction:

```mermaid
flowchart TD
    User --> WebApp["Next.js Web App"]
    WebApp --> API["Node.js / Express API"]
    API --> AuthValid["Authentication / Validation"]
    AuthValid --> Logic["Business Logic"]
    Logic --> PG[("PostgreSQL")]
```

And for the future mobile client:

```mermaid
flowchart TD
		Mobile["Mobile App (Future)"] --> API2["Node.js / Express API"]
    API2 --> PG2[("PostgreSQL")]
```

**Do not connect the frontend directly to PostgreSQL.**

The intended architecture is:

```mermaid

flowchart LR
Frontend --> Backend --> Database
```

---

## 3.5 Example Data Flow — Creating an Event

This is a useful second diagram underneath the main architecture diagram.

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Next.js Calendar UI
    participant BE as Express Backend
    participant Auth as Authentication + Validation
    participant Logic as Event Business Logic
    participant DB as PostgreSQL (Events)

    U->>UI: Create Event
    UI->>BE: POST /api/events
    BE->>Auth: Verify & validate request
    Auth->>Logic: Pass validated request
    Logic->>DB: Insert event
    DB-->>UI: Event Created
    UI-->>U: Updated UI
```

---

## 3.6 Architecture Principles

### Principle 1 — No direct database access from frontend

```mermaid
flowchart LR
    A["Next.js"] -.->|Not allowed| B[("PostgreSQL")]
    C["Next.js"] --> D["Express API"] --> E[("PostgreSQL")]
```

### Principle 2 — Authentication before protected data

```mermaid
flowchart TD
    Request --> Authenticate --> Authorize --> Process["Process request"] --> DB[("Database")]
```

### Principle 3 — Backend owns business logic

The frontend should handle presentation and user interaction.

The backend should handle:

- Authentication
- Validation
- Business rules
- Database operations

### Principle 4 — Future clients use the same API

A future mobile application should be able to communicate with the same backend API rather than creating a separate backend.

```mermaid
flowchart LR
    Web["Web App"] --> Backend["Node.js / Express"]
    MobileFuture["Mobile App (Future)"] --> Backend
    FutureClient["Future Client"] --> Backend
    Backend --> PG[("PostgreSQL")]
```