import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { AuthProvider, useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import Departments from "./pages/Departments.jsx";
import Attendance from "./pages/Attendance.jsx";
import Payroll from "./pages/Payroll.jsx";
import Notifications from "./pages/Notifications.jsx";
import Settings from "./pages/Settings.jsx";
import Actors from "./pages/Actors.jsx";
import SalaryScales from "./pages/SalaryScales.jsx";
import PayrollDashboard from "./pages/PayrollDashboard.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import EmergencyContacts from "./pages/EmergencyContacts.jsx";

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll-dashboard" element={<PayrollDashboard />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/faculty" element={<Actors />} />
            <Route path="/positions" element={<Actors />} />
            <Route path="/jobgrades" element={<Actors />} />
            <Route path="/users" element={<Actors />} />
            <Route path="/contracts" element={<Actors />} />
            <Route path="/employment-history" element={<Actors />} />
            <Route path="/education" element={<Actors />} />
            <Route path="/emergency-contacts" element={<Actors />} />
            <Route path="/documents" element={<Actors />} />
            <Route path="/leave-types" element={<Actors />} />
            <Route path="/leave-balances" element={<Actors />} />
            <Route path="/leave-requests" element={<Actors />} />
            <Route path="/salary-scales" element={<SalaryScales />} />
            <Route path="/performance-reviews" element={<Actors />} />
            <Route path="/publications" element={<Actors />} />
            <Route path="/teaching-assignments" element={<Actors />} />
            <Route path="/refresh-tokens" element={<Actors />} />
            <Route path="/audit-log" element={<Actors />} />
            <Route path="/:actor" element={<Actors />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
