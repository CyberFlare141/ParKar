import { Routes, Route, Navigate } from "react-router-dom";

/* ===== PUBLIC ===== */
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Logout from "./pages/Auth/Logout";
import Notifications from "./pages/Notifications";
import Payment from "./pages/Payment";
import About from "./pages/About/About";
import Contact from "./pages/Contact/Contact";
import Profile from "./pages/Profile";

/* ===== AUTH GUARD =====*/
import ProtectedRoute from "./components/ProtectedRoute";

/* ===== STUDENT ===== */
import StudentDashboard from "./pages/Student/StudentDashboard";
import ApplyParking from "./pages/Student/ApplyParking";
import ApplicationHistory from "./pages/Student/ApplicationHistory";
import MyDocuments from "./pages/Student/MyDocuments";
import MyVehicles from "./pages/Student/MyVehicles";
import RenewApplication from "./pages/Student/RenewApplication";
import RenewalOverview from "./pages/Student/RenewalOverview";

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
import BackButtonLayout from "./components/BackButtonLayout";
import GoogleAuthCallbackHandler from "./components/GoogleAuthCallbackHandler";
import NotificationPopup from "./components/NotificationPopup";

function App() {
  return (
    <>
      <NotificationPopup />
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth/google/success" element={<GoogleAuthCallbackHandler />} />
        <Route element={<BackButtonLayout />}>
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

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
          path="/student/renew"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <RenewalOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/renew/:applicationId"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <RenewApplication />
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
          path="/teacher/apply"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <ApplyParking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/renew"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <RenewalOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/renew/:applicationId"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <RenewApplication />
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
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
