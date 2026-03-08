const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_ROLE_KEY = "auth_role";

const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";
const LEGACY_ROLE_KEY = "role";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthRole() {
  const user = getAuthUser();
  if (user?.role) {
    return String(user.role).toLowerCase();
  }

  const persistedRole =
    localStorage.getItem(AUTH_ROLE_KEY) || localStorage.getItem(LEGACY_ROLE_KEY);

  return persistedRole ? persistedRole.toLowerCase() : null;
}

export function setAuthSession(token, user) {
  const resolvedRole = String(user?.role || "").toLowerCase();

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_ROLE_KEY, resolvedRole);

  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
  localStorage.setItem(LEGACY_ROLE_KEY, resolvedRole);
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);

  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
  localStorage.removeItem(LEGACY_ROLE_KEY);
}

export function getDashboardPathByRole(role) {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "admin") return "/admin/dashboard";
  if (normalizedRole === "teacher") return "/teacher/dashboard";
  if (normalizedRole === "student") return "/student/dashboard";
  return "/";
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
