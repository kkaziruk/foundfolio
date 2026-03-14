// src/pages/StaffLoginPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getStaffIntent, setAuthError } from "../lib/authIntent";

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const campusDisplay = useMemo(() => campus.toUpperCase(), [campus]);

  useEffect(() => {
    const intent = getStaffIntent();
    if (!intent || !intent.campus || (campus && intent.campus !== campus)) {
      navigate(campus ? `/staff/${campus}` : "/staff", { replace: true });
    }
  }, [campus, navigate]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/app", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const startOAuth = async () => {
    if (authLoading || submitting) return;
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: { prompt: "select_account", hd: "nd.edu" },
      },
    });
    if (error) setError(error.message);
  };

  const signInWithEmail = async () => {
    if (authLoading || submitting) return;
    const e = email.trim().toLowerCase();
    if (!e || !password) { setError("Enter your email and password."); return; }

    setSubmitting(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) throw error;
      navigate("/app", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReset = async () => {
    if (submitting) return;
    const e = email.trim().toLowerCase();
    if (!e) { setError("Enter your email first."); return; }

    setSubmitting(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setAuthError("Password reset email sent. Check your inbox.");
      navigate(campus ? `/staff/${campus}/login` : "/staff", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Staff sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {campusDisplay} · Choose your sign-in method
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}>
          {error && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={startOAuth}
            disabled={authLoading || submitting}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mb-5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium text-sm transition-colors disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Email / password */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ff-input text-sm"
                placeholder="name@nd.edu"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ff-input text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && signInWithEmail()}
              />
            </div>

            <button
              onClick={signInWithEmail}
              disabled={authLoading || submitting}
              className="ff-btn-primary w-full"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>

            <button
              onClick={sendReset}
              disabled={submitting}
              className="w-full text-xs text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            to={campus ? `/staff/${campus}` : "/staff"}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
