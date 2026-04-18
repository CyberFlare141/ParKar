import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { resolveBaseUrl } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { getDashboardPathByRole, setAuthSession } from "../../auth/session";
import "./Login.css";

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
    const message = params.get("message");

    if (token && user) {
      setAuthSession(token, user);
      window.location.replace("/");
      return;
    }

    if (error === "access_denied") {
      setFeedback(message || "Google sign-in was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (error === "google_auth_failed") {
      setFeedback(message || "Google sign-in failed. Please try again.");
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
      nextErrors.email = "Email address is required.";
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
    <section className="login-page">
      <div className="login-page__glow login-page__glow--teal" />
      <div className="login-page__glow login-page__glow--green" />
      <div className="login-shell">
        <aside className="login-hero">
          <p className="login-eyebrow">ParKar Portal</p>
          <h1 className="login-title">Return to your campus parking portal.</h1>
          <p className="login-copy">
            Sign in with your university account to continue managing permits,
            documents, notifications, and renewal requests from one place.
          </p>

          <div className="login-points">
            <div className="login-point">
              <span className="login-point__value">01</span>
              <div>
                <h2>Use your email</h2>
                <p>Sign in with the same email address you used during registration.</p>
              </div>
            </div>
            <div className="login-point">
              <span className="login-point__value">02</span>
              <div>
                <h2>Google stays available</h2>
                <p>Continue with Google if your campus account is linked there.</p>
              </div>
            </div>
            <div className="login-point">
              <span className="login-point__value">03</span>
              <div>
                <h2>Clearer auth feedback</h2>
                <p>Login and Google callback issues now show readable messages.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="login-panel">
          <div className="login-card">
            <p className="login-card__eyebrow">Welcome back</p>
            <h1 className="login-card__title">Log In</h1>
            <p className="login-card__subtitle">
              Enter your account credentials to continue.
            </p>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  placeholder="yourname@gmail.com"
                />
                {errors.email ? <p className="login-error">{errors.email}</p> : null}
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={values.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                {errors.password ? <p className="login-error">{errors.password}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="login-button login-button--primary"
              >
                {isSubmitting ? "Submitting..." : "Login"}
              </button>

              <button
                type="button"
                onClick={() => window.location.assign(googleRedirectUrl)}
                disabled={isSubmitting}
                className="login-button login-button--google"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="login-google-icon">
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

            {feedback ? (
              <p
                className={`login-feedback ${
                  feedback.toLowerCase().includes("successful")
                    ? "login-feedback--success"
                    : "login-feedback--error"
                }`}
              >
                {feedback}
              </p>
            ) : null}

            <p className="login-switch">
              New here? <Link to="/register">Create your account</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
