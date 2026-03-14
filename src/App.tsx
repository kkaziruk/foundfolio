import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MarketingPage from "./pages/MarketingPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import PostLoginRouter from "./pages/PostLoginRouter";
import NotOnboardedPage from "./pages/NotOnboardedPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import StaffSelectPage from "./pages/StaffSelectPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root → login; authenticated users are routed by PostLoginRouter */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/about" element={<MarketingPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* staff selection */}
        <Route path="/staff" element={<Navigate to="/staff/nd" replace />} />
        <Route path="/staff/:campus" element={<StaffSelectPage />} />
        <Route path="/staff/:campus/login" element={<StaffLoginPage />} />

        {/* decides where a logged-in user belongs */}
        <Route path="/app" element={<PostLoginRouter />} />

        {/* dynamic campus routes */}
        <Route path="/:campus" element={<HomePage />} />
        <Route path="/admin/:campus" element={<AdminPage />} />

        <Route path="/not-onboarded" element={<NotOnboardedPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
