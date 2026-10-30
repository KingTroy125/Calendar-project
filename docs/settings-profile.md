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

Saves happen on blur or Enter for text inputs, immediately for the date picker,
and with the **Update password** button for the password card. A "Saved" toast
appears for successful saves, and the sidebar name/initials and dashboard
greeting update immediately.

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
  "createdAt": "2026-10-30T00:00:00.000Z"
}
```

## Database migration

The new columns live in
`backend/prisma/migrations/20261030000000_add_user_profile`. Apply them before
using the settings page:

```bash
cd backend
npm run db:deploy
```

Then regenerate the Prisma client if it is not already current:

```bash
npx prisma generate
```

## Files

- `backend/prisma/schema.prisma` — `firstName`, `lastName`, `bio`, `dateOfBirth`.
- `backend/src/routes/auth.js` — `PATCH /auth/me` and `PATCH /auth/password`.
- `frontend/lib/api.ts` — `CurrentUser`, `updateProfile`, `changePassword`, `displayName`.
- `frontend/components/application/settings/settings-profile.tsx` — editable settings UI.
- `frontend/components/application/settings/settings-modal.tsx` — passes the signed-in user in.
- `frontend/components/application/dashboard/dashboard-sidebar.tsx` — shows the real name and opens the modal.
- `frontend/components/dashboard-page.tsx` — owns the user state and refreshes it after saves.
