import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import "./Login.css";

const austEmailPattern = /^[a-z]+\.[a-z]+\.\d+@aust\.edu$/i;
const usernamePattern = /^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/;

const initialValues = {
  loginId: "",
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
    const loginId = values.loginId.trim();

    if (!loginId) {
      nextErrors.loginId = "Username or email is required.";
    } else if (loginId.includes("@")) {
      if (!austEmailPattern.test(loginId)) {
        nextErrors.loginId = "Use AUST email format: name.dept.id@aust.edu";
      }
    } else if (!usernamePattern.test(loginId)) {
      nextErrors.loginId =
        "Username must start with a letter and be 3-30 characters.";
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
    <section className="login-page">
      <div className="login-page__container">
        <div className="login-card">
          <Link to="/" className="login-card__home-link">
            {"<-"} Back to Hom
          </Link>

          <p className="login-card__eyebrow">AUST Parking Portal</p>
          <h1 className="login-card__title">Log In</h1>
          <p className="login-card__subtitle">
            Enter your university credentials to continue.
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-form__field">
              <label htmlFor="loginId" className="login-form__label">
                Username or University Email Address
              </label>
              <input
                id="loginId"
                name="loginId"
                type="text"
                value={values.loginId}
                onChange={handleChange}
                placeholder="username or name.dept.id@aust.edu"
                className="login-form__input"
              />
              <p className="login-form__hint">
                You can sign in with your unique username or AUST email.
              </p>
              {errors.loginId ? (
                <p className="login-form__error">{errors.loginId}</p>
              ) : null}
            </div>

            <div className="login-form__field">
              <label htmlFor="password" className="login-form__label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="login-form__input"
              />
              {errors.password ? (
                <p className="login-form__error">{errors.password}</p>
              ) : null}
            </div>

            <button type="submit" className="login-form__button">
              Login
            </button>

            {submitted ? (
              <p className="login-form__success">
                Validation passed. Ready for backend integration.
              </p>
            ) : null}
          </form>

          <p className="login-card__footer">
            New here?{" "}
            <Link to="/register" className="login-card__link">
              Create your account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
