import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { popAuthError, setReturnTo } from "../lib/authIntent";
import { GraduationCap, Building2 } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    const fromState = (location.state as { returnTo?: string } | null)?.returnTo;
    if (fromState) setReturnTo(fromState);
  }, [location.state]);

  const logInStudent = async () => {
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
    navigate("/staff", { replace: false });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        {/* Header copy (tight, calm) */}
        <div className="mx-auto max-w-xl text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Log in to FoundFolio
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-600">
            Access your campus lost &amp; found dashboard. Choose your role to
            continue.
          </p>
        </div>

        {/* Card (hero) */}
        <div className="mx-auto w-full max-w-xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7">
            {error && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Student */}
              <button
                onClick={logInStudent}
                disabled={authLoading}
                className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition p-4 disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <GraduationCap className="w-[18px] h-[18px] text-slate-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Student</div>
                    <p className="mt-1 text-sm text-slate-600">
                      Search everything found across campus.
                    </p>
                  </div>
                </div>
              </button>

              {/* Building Manager / Admin */}
              <button
                onClick={goStaff}
                disabled={authLoading}
                className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition p-4 disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Building2 className="w-[18px] h-[18px] text-slate-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      Building Manager / Admin
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Log items, manage returns, and route high-value items securely.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <p className="mt-5 text-xs text-slate-500 text-center">
              Secure log in. Campus access only.
            </p>

            <div className="mt-5 text-center">
              <Link
                to="/"
                className="text-sm text-slate-600 hover:text-slate-900 underline"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
