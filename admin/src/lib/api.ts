import { clearSession, getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function errorMessage(err: unknown, fallback = "Request failed") {
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return "Could not reach the API. Check that the backend is running.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    throw new ApiError(data.error || data.message || "Request failed", response.status);
  }
  return data as T;
}

export async function getHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.ok;
}
