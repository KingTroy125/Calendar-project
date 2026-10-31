// In production the frontend proxies /api to the backend
const API = "/api";

export class BackendError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export type WeekStartsOn = "sunday" | "monday";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  /** YYYY-MM-DD, or null when unset. */
  dateOfBirth: string | null;
  /** Which day the week views start on. */
  weekStartsOn: WeekStartsOn;
  /** Default length in minutes for a new timed event. */
  defaultEventDuration: number;
  createdAt: string;
};

/** Fields the settings screen can write. All are optional (partial save). */
export type ProfileUpdate = Partial<
  Pick<
    CurrentUser,
    "email" | "firstName" | "lastName" | "bio" | "dateOfBirth" | "weekStartsOn" | "defaultEventDuration"
  >
>;

export type CalendarEventColor = "blue" | "green" | "pink" | "purple" | "amber";
export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  color: CalendarEventColor;
};
export type NewCalendarEvent = Omit<CalendarEvent, "id">;

async function getApiError(res: Response) {
  const data = await res.json().catch(() => null) as { error?: unknown } | null;
  return typeof data?.error === "string" ? data.error : res.statusText;
}

function toCurrentUser(data: Record<string, unknown> | null, status: number): CurrentUser {
  if (typeof data?.id !== "string" || typeof data.email !== "string") {
    throw new BackendError("Invalid account response", status);
  }

  const text = (value: unknown) => (typeof value === "string" && value ? value : null);

  return {
    id: data.id,
    email: data.email,
    firstName: text(data.firstName),
    lastName: text(data.lastName),
    bio: text(data.bio),
    dateOfBirth: text(data.dateOfBirth),
    weekStartsOn: data.weekStartsOn === "sunday" ? "sunday" : "monday",
    defaultEventDuration:
      typeof data.defaultEventDuration === "number" ? data.defaultEventDuration : 60,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
  };
}

async function postAuth(path: "login" | "signup", email: string, password: string) {
  const res = await fetch(`${API}/auth/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : res.statusText;
    throw new BackendError(message, res.status);
  }
  return toCurrentUser(data, res.status);
}

export function login(email: string, password: string) {
  return postAuth("login", email, password);
}

export function signup(email: string, password: string) {
  return postAuth("signup", email, password);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await fetch(`${API}/auth/me`, { credentials: "include" });
  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : res.statusText;
    throw new BackendError(message, res.status);
  }
  return toCurrentUser(data, res.status);
}

/** Save one or more profile fields. Returns the refreshed user. */
export async function updateProfile(update: ProfileUpdate): Promise<CurrentUser> {
  const res = await fetch(`${API}/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : res.statusText;
    throw new BackendError(message, res.status);
  }
  return toCurrentUser(data, res.status);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch(`${API}/auth/password`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new BackendError(await getApiError(res), res.status);
}

export async function logout() {
  const res = await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new BackendError(res.statusText, res.status);
}

export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`${API}/events?${params}`, { credentials: "include" });
  if (!res.ok) throw new BackendError(await getApiError(res), res.status);
  return res.json() as Promise<CalendarEvent[]>;
}

export async function createCalendarEvent(event: NewCalendarEvent): Promise<CalendarEvent> {
  const res = await fetch(`${API}/events`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new BackendError(await getApiError(res), res.status);
  return res.json() as Promise<CalendarEvent>;
}

export async function updateCalendarEvent(id: string, event: NewCalendarEvent): Promise<CalendarEvent> {
  const res = await fetch(`${API}/events/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new BackendError(await getApiError(res), res.status);
  return res.json() as Promise<CalendarEvent>;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const res = await fetch(`${API}/events/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new BackendError(await getApiError(res), res.status);
}

/** "Ada Lovelace", falling back to the part of the email before the @. */
export function displayName(user: Pick<CurrentUser, "firstName" | "lastName" | "email">) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  const handle = user.email.split("@")[0] ?? "";
  return handle ? handle.charAt(0).toUpperCase() + handle.slice(1) : "there";
}
