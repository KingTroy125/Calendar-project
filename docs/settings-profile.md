# Profile Settings

The settings modal (sidebar → **Settings**) is wired to the signed-in account, so
the fields show real data and edits are persisted.

## What the user can edit

| Field | Notes |
| --- | --- |
| Email | Must be unique; duplicates return `409 Conflict`. |
| First name | Up to 60 characters. |
| Last name | Up to 60 characters. |
| Date of birth | Optional date picker; stored as `DATE`. |
| Bio | Up to 280 characters. |
| Password | Change with current + new password (min 8 characters). |
| Week starts on | `Monday` (default) or `Sunday`; drives the month grid, weekly strip and event fetch window. |
| Default event length | 5–240 minutes; pre-fills the end time of a new event (start + length). |

Saves happen on blur or Enter for text inputs, immediately for the date picker,
and with the **Update password** button for the password card. A "Saved" toast
appears for successful saves, and the sidebar name/initials and dashboard
greeting update immediately.

## General page

The **General** page is the calendar app's own preferences, not template
marketing content:

- **Account** — signed-in name, avatar initials and email, an **Edit profile**
  button that jumps to the Profile page, and **Logout**.
- **Appearance** — the light/dark `ThemeToggle` (segmented).
- **Calendar** — **Week starts on** and **Default event length**. Both are
  persisted on the `User` and applied immediately: the month grid rotates its
  weekday headers, the dashboard week strip and event query start on the chosen
  day, and a new timed event opens as `09:00 → 09:00 + duration`.

## Data flow

```
Settings modal → lib/api.ts updateProfile()/changePassword()
              → PATCH /api/auth/me | /api/auth/password   (frontend proxy)
              → backend routes/auth.js
              → prisma.user.update()
              → public user returned → DashboardPage state updated
```

`GET /auth/me` now returns:

```json
{
  "id": "user-id",
  "email": "person@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "bio": "Building a calmer calendar.",
  "dateOfBirth": "1990-12-10",
  "weekStartsOn": "monday",
  "defaultEventDuration": 60,
  "createdAt": "2026-10-30T00:00:00.000Z"
}
```

## Database migration

The profile columns live in
`backend/prisma/migrations/20261030000000_add_user_profile` and the calendar
preferences in `backend/prisma/migrations/20261030010000_add_user_preferences`
(both additive, with defaults). Apply them before using the settings page:

```bash
cd backend
npm run db:deploy
```

Then regenerate the Prisma client if it is not already current:

```bash
npx prisma generate
```

## Files

- `backend/prisma/schema.prisma` — profile fields plus `weekStartsOn`, `defaultEventDuration`.
- `backend/src/routes/auth.js` — `PATCH /auth/me` and `PATCH /auth/password`.
- `frontend/lib/api.ts` — `CurrentUser`, `ProfileUpdate`, `updateProfile`, `changePassword`, `displayName`.
- `frontend/components/application/settings/settings-profile.tsx` — editable profile UI.
- `frontend/components/application/settings/settings-general.tsx` — account summary, theme, calendar defaults, sign out.
- `frontend/components/application/settings/settings-modal.tsx` — passes the signed-in user in and switches pages.
- `frontend/components/application/dashboard/dashboard-sidebar.tsx` — shows the real name and opens the modal.
- `frontend/components/dashboard-page.tsx` — owns the user state and refreshes it after saves.
- `frontend/components/dashboard-home.tsx`, `calendar-view.tsx`, `create-event-modal.tsx` — consume the calendar preferences.
