import { useState } from "react";
import { Link } from "react-router-dom";

const austEmailPattern = /^[a-z]+\.[a-z]+\.\d+@aust\.edu$/i;

const initialValues = {
  studentId: "",
  fullName: "",
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

    if (!values.studentId.trim()) {
      nextErrors.studentId = "Student ID is required.";
    }

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
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
    setSubmitted(Object.keys(nextErrors).length === 0);
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

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="studentId"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Student ID
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  value={values.studentId}
                  onChange={handleChange}
                  placeholder="Enter your student ID"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
                {errors.studentId ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.studentId}</p>
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
                placeholder="name.dept.id@aust.edu"
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
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Sign Up
            </button>

            {submitted ? (
              <p className="text-sm text-emerald-700">
                Registration form is valid. Ready for backend integration.
              </p>
            ) : null}
          </form>

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
