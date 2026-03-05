import { useState } from "react";
import { Link } from "react-router-dom";
import "./Register.css";

const austEmailPattern = /^[a-z]+\.[a-z]+\.\d+@aust\.edu$/i;
const usernamePattern = /^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/;
const USERNAME_STORAGE_KEY = "parkar_reserved_usernames";

const getStoredUsernames = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawUsernames = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    const parsed = JSON.parse(rawUsernames ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveUsername = (username) => {
  if (typeof window === "undefined") {
    return;
  }

  const usernames = getStoredUsernames();
  if (!usernames.includes(username)) {
    window.localStorage.setItem(
      USERNAME_STORAGE_KEY,
      JSON.stringify([...usernames, username])
    );
  }
};

const initialValues = {
  studentId: "",
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "") : value;
    setValues((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitted(false);
  };

  const validate = () => {
    const nextErrors = {};
    const normalizedUsername = values.username.trim().toLowerCase();

    if (!values.studentId.trim()) {
      nextErrors.studentId = "Student ID is required.";
    }

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!values.username.trim()) {
      nextErrors.username = "Username is required.";
    } else if (!usernamePattern.test(values.username.trim())) {
      nextErrors.username =
        "Username must start with a letter and be 3-30 characters.";
    } else if (getStoredUsernames().includes(normalizedUsername)) {
      nextErrors.username = "This username is already taken.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "University email address is required.";
    } else if (!austEmailPattern.test(values.email.trim())) {
      nextErrors.email = "Use format: name.dept.id@aust.edu";
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

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;

    if (isValid) {
      saveUsername(values.username.trim().toLowerCase());
    }

    setSubmitted(isValid);
  };

  return (
    <section className="register-page">
      <div className="register-page__container">
        <div className="register-card">
          <Link to="/" className="register-card__home-link">
            {"<-"} Back to Home
          </Link>

          <p className="register-card__eyebrow">AUST Parking Portal</p>
          <h1 className="register-card__title">Create Account</h1>
          <p className="register-card__subtitle">
            Register with your student information.
          </p>

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="register-form__grid register-form__grid--two">
              <div className="register-form__field">
                <label htmlFor="studentId" className="register-form__label">
                  Student ID
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  value={values.studentId}
                  onChange={handleChange}
                  placeholder="Enter your student ID"
                  className="register-form__input"
                />
                {errors.studentId ? (
                  <p className="register-form__error">{errors.studentId}</p>
                ) : null}
              </div>

              <div className="register-form__field">
                <label htmlFor="username" className="register-form__label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={values.username}
                  onChange={handleChange}
                  placeholder="Choose a unique username"
                  className="register-form__input"
                />
                {errors.username ? (
                  <p className="register-form__error">{errors.username}</p>
                ) : null}
              </div>
            </div>

            <div className="register-form__field">
              <label htmlFor="fullName" className="register-form__label">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={values.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="register-form__input"
              />
              {errors.fullName ? (
                <p className="register-form__error">{errors.fullName}</p>
              ) : null}
            </div>

            <div className="register-form__field">
              <label htmlFor="email" className="register-form__label">
                University Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                placeholder="name.dept.id@aust.edu"
                className="register-form__input"
              />
              {errors.email ? (
                <p className="register-form__error">{errors.email}</p>
              ) : null}
            </div>

            <div className="register-form__field">
              <label htmlFor="phone" className="register-form__label">
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
                className="register-form__input"
              />
              {errors.phone ? (
                <p className="register-form__error">{errors.phone}</p>
              ) : null}
            </div>

            <div className="register-form__grid register-form__grid--two">
              <div className="register-form__field">
                <label htmlFor="password" className="register-form__label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={values.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className="register-form__input"
                />
                {errors.password ? (
                  <p className="register-form__error">{errors.password}</p>
                ) : null}
              </div>

              <div className="register-form__field">
                <label
                  htmlFor="confirmPassword"
                  className="register-form__label"
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
                  className="register-form__input"
                />
                {errors.confirmPassword ? (
                  <p className="register-form__error">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>
            </div>

            <button type="submit" className="register-form__button">
              Sign Up
            </button>

            {submitted ? (
              <p className="register-form__success">
                Registration form is valid. Ready for backend integration.
              </p>
            ) : null}
          </form>

          <p className="register-card__footer">
            Already have an account?{" "}
            <Link to="/login" className="register-card__link">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
