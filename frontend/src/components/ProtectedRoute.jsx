import { Navigate, useLocation } from "react-router-dom";
import {
  clearAuthSession,
  getAuthToken,
  getAuthRole,
  getAuthUser,
  getDashboardPathByRole,
} from "../auth/session";

export default function ProtectedRoute({ children, allowedRoles = null, role = null }) {
  const location = useLocation();
  const token = getAuthToken();
  const user = getAuthUser();
  const currentRole = getAuthRole();

  const requiredRoles =
    Array.isArray(allowedRoles) && allowedRoles.length > 0
      ? allowedRoles.map((item) => String(item).toLowerCase())
      : role
      ? [String(role).toLowerCase()]
      : null;

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    if (!user || !currentRole) {
      clearAuthSession();
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!requiredRoles.includes(currentRole)) {
      return <Navigate to={getDashboardPathByRole(currentRole)} replace />;
    }
  }

  return children;
}
