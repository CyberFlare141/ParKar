import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { resolveBaseUrl } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { getDashboardPathByRole, setAuthSession } from "../../auth/session";

const initialValues = {
  email: "",
  password: "",
};

function buildGoogleRedirectUrl() {
  return `${resolveBaseUrl().replace(/\/$/, "")}${ENDPOINTS.GOOGLE_REDIRECT}`;
}

function parseGoogleCallbackUser(rawUser) {
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleRedirectUrl = useMemo(buildGoogleRedirectUrl, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const user = parseGoogleCallbackUser(params.get("user"));
    const error = params.get("error");

    if (token && user) {
      setAuthSession(token, user);
      window.location.replace("/");
      return;
    }

    if (error === "access_denied") {
      setFeedback("Google sign-in was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFeedback("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "University email address is required.";
    }

    if (!values.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback("");
      const response = await client.post(ENDPOINTS.LOGIN, values);
      setAuthSession(response.data.token || response.data.access_token, response.data.user);
      setFeedback("Authentication successful.");
      navigate(getDashboardPathByRole(response?.data?.user?.role), { replace: true });
    } catch (error) {
      const firstFieldError = error?.response?.data?.errors
        ? Object.values(error.response.data.errors)?.[0]?.[0]
        : null;
      const message =
        firstFieldError ||
        error?.response?.data?.message ||
        "Unable to start login. Please try again.";
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            AUST Parking Portal
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Log In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your university credentials to continue.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                University Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                placeholder="name.dept.id@aust.edu"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
              {errors.email ? (
                <p className="mt-1 text-sm text-rose-600">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
              {errors.password ? (
                <p className="mt-1 text-sm text-rose-600">{errors.password}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Login"}
            </button>

            <button
              type="button"
              onClick={() => window.location.assign(googleRedirectUrl)}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ fontFamily: '"Google Sans", "Segoe UI", sans-serif' }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
              >
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.44a5.51 5.51 0 0 1-2.39 3.62v3.01h3.87c2.27-2.09 3.57-5.16 3.57-8.65Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3.01c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.72-4.96H1.28v3.1A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.37-2.27v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.37l4-3.1Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.77c1.77 0 3.35.61 4.59 1.8l3.44-3.44C17.95 1.09 15.23 0 12 0A12 12 0 0 0 1.28 6.63l4 3.1c.94-2.85 3.59-4.96 6.72-4.96Z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          {feedback ? <p className="mt-4 text-sm text-slate-700">{feedback}</p> : null}

          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{" "}
            <Link
              to="/register"
              className="font-semibold text-cyan-700 underline-offset-2 hover:underline"
            >
              Create your account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
