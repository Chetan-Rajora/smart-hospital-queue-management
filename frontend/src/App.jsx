import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PatientDashboard from "./pages/PatientDashboard";
import BookAppointment from "./pages/BookAppointment";
import QueueStatus from "./pages/QueueStatus";
import DoctorDashboard from "./pages/DoctorDashboard";
import LoginPage from "./pages/LoginPage";
import { getHomePath, getStoredUser, getToken } from "./lib/api";

function ProtectedRoute({ roles, children }) {
  const location = useLocation();
  const user = getStoredUser();
  if (!getToken() || !user) {
    const loginPath = roles.includes("DOCTOR") || roles.includes("ADMIN") ? "/staff-login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff-login" element={<LoginPage staffMode />} />
        <Route path="/patient" element={<ProtectedRoute roles={["PATIENT"]}><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/book-appointment" element={<ProtectedRoute roles={["PATIENT"]}><BookAppointment /></ProtectedRoute>} />
        <Route path="/patient/queue" element={<ProtectedRoute roles={["PATIENT"]}><QueueStatus /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute roles={["DOCTOR", "ADMIN"]}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
