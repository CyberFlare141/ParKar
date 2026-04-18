import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { resolveBaseUrl } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { setAuthSession } from "../../auth/session";
import "./Register.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const initialValues = {
  id: "",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

function getApiErrorMessage(error, fallbackMessage) {
  const firstFieldError = error?.response?.data?.errors
    ? Object.values(error.response.data.errors)?.[0]?.[0]
    : null;

  return firstFieldError || error?.response?.data?.message || fallbackMessage;
}

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("register");
  const [challengeId, setChallengeId] = useState("");
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
    const nextValue = name === "phone" ? value.replace(/\D/g, "") : value;
    setValues((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFeedback("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.id.trim()) {
      nextErrors.id = "ID is required.";
    }

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    }

    if (!values.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!values.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirm password is required.";
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
      const response = await client.post(ENDPOINTS.REGISTER, {
        fullName: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        university_id: values.id.trim(),
        password: values.password,
        password_confirmation: values.confirmPassword,
      });

      setChallengeId(response.data.challenge_id);
      setStep("otp");
      setFeedback(response.data.message || "Registration complete. OTP sent.");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Registration failed. Please try again."
      );
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setFeedback("Enter a valid 6-digit OTP.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback("");
      const response = await client.post(ENDPOINTS.VERIFY_OTP, {
        challenge_id: challengeId,
        purpose: "register",
        otp: otp.trim(),
      });

      setAuthSession(response.data.token || response.data.access_token, response.data.user);
      setFeedback("Account verified successfully.");
      navigate("/", { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "OTP verification failed. Please try again."
      );
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsSubmitting(true);
      setFeedback("");
      const response = await client.post(ENDPOINTS.RESEND_OTP, {
        challenge_id: challengeId,
      });
      setChallengeId(response.data.challenge_id);
      setFeedback(response.data.message || "OTP resent.");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to resend OTP.");
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="register-page">
      <div className="register-page__glow register-page__glow--teal" />
      <div className="register-page__glow register-page__glow--blue" />
      <div className="register-shell">
        <aside className="register-hero">
          <Link to="/" className="register-back">
            Back to home
          </Link>
          <p className="register-eyebrow">ParKar Portal</p>
          <h1 className="register-title">Create your campus parking account.</h1>
          <p className="register-copy">
            Join the same streamlined experience you see on the home page with
            fast signup, OTP verification, and instant access to your dashboard.
          </p>

          <div className="register-highlights">
            <div className="register-highlight">
              <span className="register-highlight__value">01</span>
              <div>
                <h2>Use any email</h2>
                <p>Gmail and other regular email accounts can register now.</p>
              </div>
            </div>
            <div className="register-highlight">
              <span className="register-highlight__value">02</span>
              <div>
                <h2>Verify in one step</h2>
                <p>An OTP is sent after signup so the account is activated securely.</p>
              </div>
            </div>
            <div className="register-highlight">
              <span className="register-highlight__value">03</span>
              <div>
                <h2>Keep the process clear</h2>
                <p>
                  Real validation messages are shown now, including duplicate email
                  and password issues.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="register-panel">
          <div className="register-card">
            <p className="register-card__eyebrow">
              {step === "register" ? "New account" : "Verify account"}
            </p>
            <h2 className="register-card__title">
              {step === "register" ? "Create Account" : "Enter OTP"}
            </h2>
            <p className="register-card__subtitle">
              {step === "register"
                ? "Use your details to start your ParKar access."
                : "Check your inbox for the 6-digit code we just sent."}
            </p>

            {step === "register" ? (
              <form className="register-form" onSubmit={handleSubmit} noValidate>
                <div className="register-grid register-grid--two">
                  <div className="register-field">
                    <label htmlFor="id">Student ID</label>
                    <input
                      id="id"
                      name="id"
                      type="text"
                      value={values.id}
                      onChange={handleChange}
                      placeholder="20230104141"
                    />
                    {errors.id ? <p className="register-error">{errors.id}</p> : null}
                  </div>

                  <div className="register-field">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={values.fullName}
                      onChange={handleChange}
                      placeholder="Masrafi Iqbal"
                    />
                    {errors.fullName ? (
                      <p className="register-error">{errors.fullName}</p>
                    ) : null}
                  </div>
                </div>

                <div className="register-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    placeholder="yourname@gmail.com"
                  />
                  <p className="register-hint">
                    Use the email address you want to sign in with.
                  </p>
                  {errors.email ? <p className="register-error">{errors.email}</p> : null}
                </div>

                <div className="register-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={values.phone}
                    onChange={handleChange}
                    placeholder="01XXXXXXXXX"
                  />
                  {errors.phone ? <p className="register-error">{errors.phone}</p> : null}
                </div>

                <div className="register-grid register-grid--two">
                  <div className="register-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                    />
                    {errors.password ? (
                      <p className="register-error">{errors.password}</p>
                    ) : null}
                  </div>

                  <div className="register-field">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={values.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat your password"
                    />
                    {errors.confirmPassword ? (
                      <p className="register-error">{errors.confirmPassword}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="register-button register-button--primary"
                >
                  {isSubmitting ? "Submitting..." : "Create Account"}
                </button>

                <button
                  type="button"
                  onClick={() => window.location.assign(googleRedirectUrl)}
                  disabled={isSubmitting}
                  className="register-button register-button--google"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="register-google-icon">
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
            ) : (
              <form className="register-form" onSubmit={handleVerifyOtp} noValidate>
                <div className="register-field">
                  <label htmlFor="otp">Enter 6-digit OTP</label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => {
                      const cleaned = event.target.value.replace(/\D/g, "");
                      setOtp(cleaned);
                      setFeedback("");
                    }}
                    placeholder="123456"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="register-button register-button--primary"
                >
                  {isSubmitting ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResendOtp}
                  className="register-button register-button--secondary"
                >
                  Resend OTP
                </button>
              </form>
            )}

            {feedback ? (
              <p
                className={`register-feedback ${
                  feedback.toLowerCase().includes("successful") ||
                  feedback.toLowerCase().includes("verified") ||
                  feedback.toLowerCase().includes("sent")
                    ? "register-feedback--success"
                    : "register-feedback--error"
                }`}
              >
                {feedback}
              </p>
            ) : null}

            <p className="register-switch">
              Already have an account?{" "}
              <Link to="/login">Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
