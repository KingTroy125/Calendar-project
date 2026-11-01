# 05_Application Architecture

## Architecture Layers

The application is divided into three primary layers:

```mermaid
┌─────────────────────────┐
│ Presentation Layer │
│ Next.js + TypeScript │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Application Layer │
│ Node.js + Express │
│ Authentication │
│ Validation │
│ Business Logic │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Data Layer │
│ PostgreSQL │
└─────────────────────────┘
```

## Presentation Layer

Responsible for:

- User interface
- Calendar views
- Forms
- Navigation
- User interaction
- Displaying API responses

## Application Layer

Responsible for:

- API requests
- Authentication
- Authorization
- Input validation
- Business rules
- Processing requests

Data Layer

Responsible for:

- Persistent data storage
- Users
- Events
- Tasks
- Bookings