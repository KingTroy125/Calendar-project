# Delete Event

Events can be deleted from two places in the UI, both backed by
`DELETE /events/:id`.

## API

`backend/src/routes/events.js`

- Requires an authenticated session (`requireAuth`).
- Looks the event up by `id` **and** `userId`, so users can only delete their own
  events.
- `404` when the event does not exist or belongs to someone else.
- `204 No Content` on success.

The endpoint is idempotent from the client's point of view: deleting an event
that is already gone returns `404`, which the UI surfaces as an error message.

## Client

`frontend/lib/api.ts`

- `deleteCalendarEvent(id)` calls the endpoint with `credentials: "include"` and
  throws a `BackendError` for non-OK responses.

`frontend/components/dashboard-home.tsx`

- `handleDeleteEvent(event)` calls the API, then removes the event from local
  state, and clears the detail/edit modal if it pointed at the deleted event.

## UI

Both entry points require a second click to confirm, so a single stray click
cannot delete data:

- **Event detail modal** (`frontend/components/event-detail-modal.tsx`):
  `Delete` → inline `Delete event` / `Cancel` confirmation, with a deleting
  state and an inline error message.
- **Month-grid event popover** (`frontend/components/calendar-view.tsx`,
  `EventDetailsTrigger`): the same two-step confirmation inside the popover;
  the popover closes once the delete succeeds.

The detail modal is keyed by event id in `dashboard-home.tsx`, so confirmation
state never leaks between events.

## Verification

`npx tsc --noEmit` and `npm run build` pass in `frontend/`. API behaviour was
checked end to end:

- create → delete → `204`
- subsequent `GET /events` no longer includes the event
- deleting as a different user → `404`
- deleting twice → `404`
- deleting without a session → `401`
