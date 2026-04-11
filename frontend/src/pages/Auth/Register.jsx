import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import client, { resolveBaseUrl } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { setAuthSession } from "../../auth/session";

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
      nextErrors.email = "University email address is required.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    }

    if (!values.password.trim()) {
      nextErrors.password = "Password is required.";
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
      const payload = error?.response?.data;
      const message = payload?.message || "Registration failed. Please try again.";
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
      const message =
        error?.response?.data?.message || "OTP verification failed. Please try again.";
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
      const message = error?.response?.data?.message || "Failed to resend OTP.";
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            AUST Parking Portal
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Register with your student information.
          </p>

          {step === "register" ? (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                  htmlFor="id"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  ID
                </label>
                <input
                  id="id"
                  name="id"
                  type="text"
                  value={values.id}
                  onChange={handleChange}
                  placeholder="Enter your ID"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
                  {errors.id ? (
                    <p className="mt-1 text-sm text-rose-600">{errors.id}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={values.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                  {errors.fullName ? (
                    <p className="mt-1 text-sm text-rose-600">{errors.fullName}</p>
                  ) : null}
                </div>
              </div>

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
                  placeholder="name.id@aust.edu"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
                {errors.email ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={values.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
                {errors.phone ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.phone}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                    placeholder="Create a password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                  {errors.password ? (
                    <p className="mt-1 text-sm text-rose-600">{errors.password}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                  {errors.confirmPassword ? (
                    <p className="mt-1 text-sm text-rose-600">
                      {errors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Sign Up"}
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
                Sign Up with Google
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleVerifyOtp} noValidate>
              <div>
                <label
                  htmlFor="otp"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Enter 6-digit OTP
                </label>
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleResendOtp}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Resend OTP
              </button>
            </form>
          )}

          {feedback ? <p className="mt-4 text-sm text-slate-700">{feedback}</p> : null}

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-cyan-700 underline-offset-2 hover:underline"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
} 
