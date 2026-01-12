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

  // Require that staff intent exists (set on StaffSelectPage)
  useEffect(() => {
    const intent = getStaffIntent();
    // If no intent, or campus mismatch, send them back to select page
    if (!intent || !intent.campus || (campus && intent.campus !== campus)) {
      navigate(campus ? `/staff/${campus}` : "/staff", { replace: true });
    }
  }, [campus, navigate]);

  // If already logged in, let PostLoginRouter route them
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
        queryParams: {
          prompt: "select_account",
          hd: "nd.edu", // hint only (not enforcement)
        },
      },
    });

    if (error) setError(error.message);
  };

  const signInWithEmail = async () => {
    if (authLoading || submitting) return;

    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });

      if (error) throw error;

      // Let PostLoginRouter handle allowlist + profile upsert + routing
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
    if (!e) {
      setError("Enter your email first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${window.location.origin}/app`,
      });

      if (error) throw error;

      // Use your existing cross-page error/toast mechanism
      setAuthError("Password reset email sent. Check your inbox.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-slate-900">Staff sign-in</h1>
          <Link
            to={campus ? `/staff/${campus}` : "/staff"}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Back
          </Link>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Sign in for <span className="font-medium">{campusDisplay}</span> using Google
          or your staff email and password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={startOAuth}
          disabled={authLoading || submitting}
          className="w-full px-4 py-3 mb-5 bg-black text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="border-t border-slate-200 my-5" />

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="name@nd.edu"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={signInWithEmail}
            disabled={authLoading || submitting}
            className="w-full px-4 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] font-medium disabled:opacity-60"
          >
            Sign in with email
          </button>

          <button
            onClick={sendReset}
            disabled={submitting}
            className="w-full text-sm text-slate-700 underline hover:text-slate-900"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
