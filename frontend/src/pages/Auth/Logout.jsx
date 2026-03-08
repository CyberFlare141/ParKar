import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { clearAuthSession } from "../../auth/session";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        await client.post(ENDPOINTS.LOGOUT);
      } catch {
        // Logout is client-driven for JWT. Ignore API failures.
      } finally {
        clearAuthSession();
        navigate("/login", { replace: true });
      }
    };

    run();
  }, [navigate]);

  return null;
}
