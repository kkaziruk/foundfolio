import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { popAuthError } from "../lib/authIntent";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const msg = popAuthError();
    if (msg) setError(msg);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      setError("");
      navigate("/app", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const signInStudent = async () => {
    if (authLoading) return;
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: {
          prompt: "select_account",
          hd: "nd.edu", // hint only (not enforcement)
        },
      },
    });
    if (error) setError(error.message);
  };

  const goStaff = () => {
    if (authLoading) return;
    navigate("/staff", { replace: false }); // <-- not hardcoded to nd
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <img
            src="/found_folio_(6).png"
            alt="FoundFolio Logo"
            className="w-32 h-32 object-contain mb-6 cursor-pointer hover:opacity-80 transition"
            onClick={() => navigate("/")}
          />
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">
            FoundFolio
          </h2>
          <p className="text-lg text-slate-600 text-center max-w-sm mb-6">
            A searchable lost and found system for campus
          </p>
          <img
            src="/screenshot_2025-11-08_at_1.53.00_pm.png"
            alt="FoundFolio Interface"
            className="w-full max-w-md rounded-lg shadow-xl"
          />
        </div>

        {/* Right side - Login form */}
        <div className="w-full bg-white rounded-xl shadow-lg p-6 md:p-8">
          {/* Mobile logo + tagline */}
          <div className="md:hidden flex flex-col items-center mb-6">
            <img
              src="/found_folio_(6).png"
              alt="FoundFolio Logo"
              className="w-16 h-16 object-contain mb-3 cursor-pointer hover:opacity-80 transition"
              onClick={() => navigate("/")}
            />
            <h2 className="text-xl font-bold text-slate-900 text-center">
              FoundFolio
            </h2>
            <p className="text-sm text-slate-600 text-center">
              Campus Lost & Found
            </p>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Sign in</h1>
          <p className="text-sm text-slate-600 mb-6">
            Choose how you're signing in
          </p>

          {error && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={signInStudent}
              disabled={authLoading}
              className="w-full px-4 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] font-medium transition disabled:opacity-60"
            >
              Student
            </button>

            <button
              onClick={goStaff}
              disabled={authLoading}
              className="w-full px-4 py-3 border-2 border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 font-medium transition disabled:opacity-60"
            >
              Building Manager / Admin
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
