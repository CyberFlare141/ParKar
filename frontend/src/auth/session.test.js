import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  clearAuthSession,
  getAuthRole,
  getAuthToken,
  getAuthUser,
  getDashboardPathByRole,
  isTokenExpired,
  setAuthSession,
} from "./session";

function makeJwt(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("auth session helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("stores the normalized token, user, and role in browser storage", () => {
    const user = {
      id: 7,
      name: "John Alex",
      role: "Student",
    };

    setAuthSession("Bearer test-token", user);

    expect(getAuthToken()).toBe("test-token");
    expect(getAuthUser()).toEqual(user);
    expect(getAuthRole()).toBe("student");
    expect(localStorage.getItem("token")).toBe("test-token");
    expect(sessionStorage.getItem("auth_role")).toBe("student");
  });

  it("clears both current and legacy auth storage keys", () => {
    setAuthSession("test-token", { role: "admin" });

    clearAuthSession();

    expect(getAuthToken()).toBeNull();
    expect(getAuthUser()).toBeNull();
    expect(getAuthRole()).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("auth_token")).toBeNull();
  });

  it("maps roles to dashboard paths", () => {
    expect(getDashboardPathByRole("admin")).toBe("/admin/dashboard");
    expect(getDashboardPathByRole("teacher")).toBe("/teacher/dashboard");
    expect(getDashboardPathByRole("student")).toBe("/student/dashboard");
    expect(getDashboardPathByRole("unknown")).toBe("/");
  });

  it("detects expired JWT tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));

    const expiredToken = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
    const activeToken = makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 });

    expect(isTokenExpired(expiredToken)).toBe(true);
    expect(isTokenExpired(activeToken)).toBe(false);
    expect(isTokenExpired("plain-dev-token")).toBe(false);
  });
});
