import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setAuthSession } from "../auth/session";

function parseGoogleCallbackUser(rawUser) {
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export default function GoogleAuthCallbackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const user = parseGoogleCallbackUser(params.get("user"));
    const error = params.get("error");

    if (token && user) {
      setAuthSession(token, user);
      window.location.replace("/");
      return;
    }

    if (error === "access_denied") {
      navigate("/login?error=access_denied", { replace: true });
      return;
    }

    navigate("/login", { replace: true });
  }, [location, navigate]);

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            ParKar
          </p>
          <h1 className="mt-4 text-3xl font-bold">Signing you in...</h1>
          <p className="mt-3 text-sm text-slate-300">
            Please wait while we finish your Google login.
          </p>
        </div>
      </div>
    </section>
  );
}
