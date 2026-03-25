import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { popAuthError } from "../lib/authIntent";
import { GraduationCap, Building2 } from "lucide-react";

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
          <img src="/found_folio_(6).png" alt="FoundFolio" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            FoundFolio
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-600">
            Find lost items or log what you've found on campus
          </p>
        </div>

        {/* Card (hero) */}
        <div className="mx-auto w-full max-w-xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}>
            {error && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              {/* Student */}
              <button
                onClick={logInStudent}
                disabled={authLoading}
                className="w-full text-left rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all p-4 group disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">Search for lost item</div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Search everything found across campus
                    </p>
                  </div>
                  <span className="text-slate-300 group-hover:text-slate-400 transition-colors text-lg">→</span>
                </div>
              </button>

              {/* Building Manager / Admin */}
              <button
                onClick={goStaff}
                disabled={authLoading}
                className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all p-4 group disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">
                      I want to log or manage items
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Add items, track returns, and manage your building
                    </p>
                  </div>
                  <span className="text-slate-300 group-hover:text-slate-400 transition-colors text-lg">→</span>
                </div>
              </button>
            </div>

            <div className="mt-5 text-center space-y-1.5">
              <p className="text-xs text-slate-400">
                New here?{" "}
                <Link to="/about" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                  Learn how it works
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                Run lost &amp; found?{" "}
                <Link to="/about#pilot" className="text-blue-500 hover:text-blue-700 font-medium transition-colors">
                  Request access
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
