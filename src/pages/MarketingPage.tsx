import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MarketingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/app", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <img
          src="/found_folio_(6).png"
          alt="FoundFolio"
          className="mx-auto h-14 w-14 object-contain"
        />
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">FoundFolio</h1>
        <p className="mt-3 text-slate-600">
          Campus lost-and-found, unified for students and staff.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-[#2563EB] px-4 py-3 text-white font-semibold hover:bg-[#1D4ED8]"
          >
            Continue
          </button>
          <button
            onClick={() => navigate("/staff")}
            className="rounded-xl border border-slate-300 px-4 py-3 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Staff Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketingPage;
