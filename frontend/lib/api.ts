const API = process.env.NEXT_PUBLIC_API_URL;

export class BackendError extends Error {}

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
    throw new BackendError(message);
  }
  return data;
}

export function login(email: string, password: string) {
  return postAuth("login", email, password);
}

export function signup(email: string, password: string) {
  return postAuth("signup", email, password);
}