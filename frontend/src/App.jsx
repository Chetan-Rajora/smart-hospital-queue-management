import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import PatientDashboard from "./pages/PatientDashboard";
import BookAppointment from "./pages/BookAppointment";
import QueueStatus from "./pages/QueueStatus";
import DoctorDashboard from "./pages/DoctorDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Patient Portal */}
        <Route path="/patient" element={<PatientDashboard />} />
        <Route
          path="/patient/book-appointment"
          element={<BookAppointment />}
        />
        <Route path="/patient/queue" element={<QueueStatus />} />

        {/* Doctor Portal */}
        <Route path="/doctor" element={<DoctorDashboard />} />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;