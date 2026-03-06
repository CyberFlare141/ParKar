import { Navigate, useLocation } from "react-router-dom";
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  getDashboardPathByRole,
} from "../auth/session";

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const location = useLocation();
  const token = getAuthToken();
  const user = getAuthUser();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!user) {
      clearAuthSession();
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={getDashboardPathByRole(user.role)} replace />;
    }
  }

  return children;
}
