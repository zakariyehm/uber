const TOKEN_KEY = "raac.admin.token";
const USER_KEY = "raac.admin.user";

export type AdminUser = {
  id: string;
  role: string;
  phone: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AdminUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function adminDisplayName(user: AdminUser | null) {
  if (!user) return "Owner";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Raac Owner";
}
