import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuthSession, setAuthSession } from "../auth/session";
import ProtectedRoute from "./ProtectedRoute";

function makeJwt(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

function renderProtectedRoute({ allowedRoles = ["student"], initialPath = "/student/dashboard" } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <h1>Student Dashboard</h1>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<h1>Login Page</h1>} />
        <Route path="/admin/dashboard" element={<h1>Admin Dashboard</h1>} />
        <Route path="/teacher/dashboard" element={<h1>Teacher Dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthSession();
    vi.useRealTimers();
  });

  it("redirects guests to the login page", () => {
    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Login Page" })).toBeInTheDocument();
  });

  it("renders protected content for a matching role", () => {
    setAuthSession("plain-dev-token", {
      id: 1,
      role: "student",
    });

    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Student Dashboard" })).toBeInTheDocument();
  });

  it("redirects users with the wrong role to their own dashboard", () => {
    setAuthSession("plain-dev-token", {
      id: 1,
      role: "admin",
    });

    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Admin Dashboard" })).toBeInTheDocument();
  });

  it("clears an expired session and redirects to login", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00.000Z"));
    const expiredToken = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });

    setAuthSession(expiredToken, {
      id: 1,
      role: "student",
    });

    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Login Page" })).toBeInTheDocument();
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
