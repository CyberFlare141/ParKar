import { useState } from "react";
import { Link } from "react-router-dom";

const initialValues = {
  email: "",
  password: "",
};

export default function Login() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitted(false);
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

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitted(Object.keys(nextErrors).length === 0);
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
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Login
            </button>

            {submitted ? (
              <p className="text-sm text-emerald-700">
                Validation passed. Ready for backend integration.
              </p>
            ) : null}
          </form>

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
