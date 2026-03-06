const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getDashboardPathByRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  return "/student/dashboard";
}

export function isTokenExpired(token) {
  if (!token) return true;

  const parts = token.split(".");
  if (parts.length !== 3) {
    // Some environments may use non-JWT tokens; let server-side auth decide.
    return false;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload?.exp || typeof payload.exp !== "number") {
      return false;
    }
    return Date.now() >= payload.exp * 1000;
  } catch {
    // If client cannot decode token reliably, avoid false logout redirects.
    return false;
  }
}
