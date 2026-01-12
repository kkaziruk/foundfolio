import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function NotOnboardedPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  const domain = user?.email?.split("@")[1]?.toLowerCase() ?? "unknown";

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Campus not supported
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Your email domain <span className="font-medium">{domain}</span> isn’t linked to an active campus.
        </p>

        <div className="flex gap-3">
          <button
            onClick={signOut}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
          >
            Try another account
          </button>
          <Link
            to="/"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-center hover:bg-slate-50 font-medium"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
