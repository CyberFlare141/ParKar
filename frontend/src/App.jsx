import { Routes, Route, Navigate } from "react-router-dom";

/* ===== PUBLIC ===== */
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Logout from "./pages/Auth/Logout";
import Notifications from "./pages/Notifications";
import Payment from "./pages/Payment";
import ProtectedRoute from "./components/ProtectedRoute";

/* ===== STUDENT ===== */
import StudentDashboard from "./pages/Student/StudentDashboard";
import ApplyParking from "./pages/Student/ApplyParking";
import ApplicationHistory from "./pages/Student/ApplicationHistory";
import MyDocuments from "./pages/Student/MyDocuments";
import MyVehicles from "./pages/Student/MyVehicles";

/* ===== TEACHER ===== */
import TeacherDashboard from "./pages/Teacher/TeacherDashboard";
import TeacherVehicles from "./pages/Teacher/TeacherVehicles";

/* ===== ADMIN ===== */
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ManageUsers from "./pages/Admin/ManageUsers";
import ManageSemesters from "./pages/Admin/ManageSemesters";
import ReviewApplications from "./pages/Admin/ReviewApplications";
import AIAnalysis from "./pages/Admin/AIAnalysis";
import Reports from "./pages/Admin/Reports";
import AuditLogs from "./pages/Admin/AuditLogs";

function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<Landing />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/logout" element={<Logout />} />

      {/* Shared */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/apply"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <ApplyParking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/history"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <ApplicationHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/documents"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <MyDocuments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/vehicles"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <MyVehicles />
          </ProtectedRoute>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/vehicles"
        element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherVehicles />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/semesters"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ManageSemesters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/review"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ReviewApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ai-analysis"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AIAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
