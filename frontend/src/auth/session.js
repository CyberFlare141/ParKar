const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_ROLE_KEY = "auth_role";

const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";
const LEGACY_ROLE_KEY = "role";

function readStorage(key) {
  if (typeof window === "undefined") return null;

  return (
    window.sessionStorage.getItem(key) ??
    window.localStorage.getItem(key)
  );
}

function writeSession(key, value) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(key, value);
  window.localStorage.setItem(key, value);
}

function removeStoredValue(key) {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

function normalizeToken(rawToken) {
  if (typeof rawToken !== "string") return null;

  const trimmed = rawToken.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return null;
  }

  return trimmed.replace(/^Bearer\s+/i, "").trim() || null;
}

export function getAuthToken() {
  const primary = normalizeToken(readStorage(AUTH_TOKEN_KEY));
  if (primary) return primary;
  return normalizeToken(readStorage(LEGACY_TOKEN_KEY));
}

export function getAuthUser() {
  const raw = readStorage(AUTH_USER_KEY) || readStorage(LEGACY_USER_KEY);
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

  const persistedRole = readStorage(AUTH_ROLE_KEY) || readStorage(LEGACY_ROLE_KEY);

  return persistedRole ? persistedRole.toLowerCase() : null;
}

export function setAuthSession(token, user) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    clearAuthSession();
    return;
  }

  const resolvedRole = String(user?.role || "").toLowerCase();

  writeSession(AUTH_TOKEN_KEY, normalizedToken);
  writeSession(AUTH_USER_KEY, JSON.stringify(user));
  writeSession(AUTH_ROLE_KEY, resolvedRole);

  writeSession(LEGACY_TOKEN_KEY, normalizedToken);
  writeSession(LEGACY_USER_KEY, JSON.stringify(user));
  writeSession(LEGACY_ROLE_KEY, resolvedRole);

  window.dispatchEvent(new Event("auth-session-changed"));
}

export function clearAuthSession() {
  removeStoredValue(AUTH_TOKEN_KEY);
  removeStoredValue(AUTH_USER_KEY);
  removeStoredValue(AUTH_ROLE_KEY);

  removeStoredValue(LEGACY_TOKEN_KEY);
  removeStoredValue(LEGACY_USER_KEY);
  removeStoredValue(LEGACY_ROLE_KEY);
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
