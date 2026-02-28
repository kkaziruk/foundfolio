import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
import { trackPageView } from "./lib/analytics";

function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackPageView(path);
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteAnalytics />
      <Routes>
        <Route path="/" element={<MarketingPage />} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
