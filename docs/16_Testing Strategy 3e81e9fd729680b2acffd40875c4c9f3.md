# 16_Testing Strategy

## Testing Objective

Testing ensures that the Calendar Ecosystem behaves correctly and that changes do not introduce unexpected problems.

## Unit Testing

Tests individual functions or pieces of logic.

Example:

```mermaid
validateEvent()
      ↓
Valid event → true
Invalid event → false
```

## API Testing

Postman will be used for API development and testing.

Example:

```mermaid
POST /api/events
        ↓
   Request Body
        ↓
      API
        ↓
   Expected Response

```

Test cases should include:

- Valid event creation
- Missing title
- Invalid date
- Unauthenticated request
- Unauthorized event access
- Event not found

## Integration Testing

Tests how multiple components work together.

Example:

```mermaid
API
 ↓
Business Logic
 ↓
PostgreSQL
```

The test verifies that the complete operation works rather than testing only one function.

## End-to-End Testing

Tests the system from the user's perspective.

Example:

```mermaid
Login
 ↓
Dashboard
 ↓
Create Event
 ↓
Event appears on calendar
 ↓
Edit Event
 ↓
Delete Event
```

## Testing Principle

Testing should cover both:

Expected behaviour and Failure behaviour.