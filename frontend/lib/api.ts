// In production the frontend proxies /api to the backend (see next.config.ts),
// which keeps the session cookie first-party. Local development points at the
// API directly via NEXT_PUBLIC_API_URL.
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export class BackendError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export type CurrentUser = { id: string; email: string };
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

async function postAuth(path: "login" | "signup", email: string, password: string) {
  const res = await fetch(`${API}/auth/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null) as { error?: unknown } | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : res.statusText;
    throw new BackendError(message, res.status);
  }
  return data;
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
  if (typeof data?.id !== "string" || typeof data.email !== "string") {
    throw new BackendError("Invalid account response", res.status);
  }
  return { id: data.id, email: data.email };
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