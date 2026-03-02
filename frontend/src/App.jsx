import { Routes, Route, Navigate } from "react-router-dom";

/* ===== PUBLIC ===== */
import Landing from "./pages/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Notifications from "./pages/Notifications";
import Payment from "./pages/Payment";

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

      {/* Shared */}
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/payment" element={<Payment />} />

      {/* Student Routes */}
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/apply" element={<ApplyParking />} />
      <Route path="/student/history" element={<ApplicationHistory />} />
      <Route path="/student/documents" element={<MyDocuments />} />
      <Route path="/student/vehicles" element={<MyVehicles />} />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      <Route path="/teacher/vehicles" element={<TeacherVehicles />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<ManageUsers />} />
      <Route path="/admin/semesters" element={<ManageSemesters />} />
      <Route path="/admin/review" element={<ReviewApplications />} />
      <Route path="/admin/ai-analysis" element={<AIAnalysis />} />
      <Route path="/admin/reports" element={<Reports />} />
      <Route path="/admin/audit-logs" element={<AuditLogs />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;