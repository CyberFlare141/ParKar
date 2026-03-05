import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const initialValues = {
  email: "",
  password: "",
};

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("credentials");
  const [challengeId, setChallengeId] = useState("");
  const [purpose, setPurpose] = useState("login");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setChallengeId(response.data.challenge_id);
      setPurpose(response.data.purpose || "login");
      setStep("otp");
      setFeedback(response.data.message || "OTP sent to your registered contact.");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Unable to start login. Please try again.";
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
        purpose,
        otp: otp.trim(),
      });

      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("auth_user", JSON.stringify(response.data.user));
      setFeedback("Authentication successful.");
      navigate("/");
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
      setPurpose(response.data.purpose || purpose);
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
        <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            AUST Parking Portal
            //hello
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Log In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your university credentials to continue.
          </p>

          {step === "credentials" ? (
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