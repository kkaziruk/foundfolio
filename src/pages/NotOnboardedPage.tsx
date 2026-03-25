import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { MapPin } from "lucide-react";

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
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}>
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
          <MapPin className="w-6 h-6 text-amber-500" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Campus not found
        </h1>
        <p className="text-sm text-slate-500 mb-1">
          Your email domain <span className="font-semibold text-slate-700">@{domain}</span> isn't linked to an active FoundFolio campus yet.
        </p>
        <p className="text-sm text-slate-500 mb-6">
          If your institution is interested in getting set up, request a free pilot below.
        </p>

        <div className="space-y-2.5">
          <Link
            to="/about#pilot"
            className="block w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold text-center transition-colors"
          >
            Request a pilot for your campus
          </Link>
          <button
            onClick={signOut}
            className="w-full px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            Try a different account
          </button>
        </div>
      </div>
    </div>
  );
}
