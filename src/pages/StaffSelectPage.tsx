import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setStaffIntent } from "../lib/authIntent";

type Building = { id: string; name: string };

export default function StaffSelectPage() {
  const navigate = useNavigate();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [error, setError] = useState("");

  const campusDisplay = useMemo(() => campus.toUpperCase(), [campus]);

  useEffect(() => {
    if (!campus) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: campusRow, error: campusErr } = await supabase
          .from("campuses")
          .select("slug,status")
          .eq("slug", campus)
          .eq("status", "active")
          .maybeSingle();

        if (campusErr) throw campusErr;
        if (!campusRow?.slug) {
          setError("This campus is not active.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("buildings")
          .select("id,name,is_system")
          .eq("campus_slug", campus)
          .eq("is_system", false) 
          .order("name");

        if (error) throw error;

        if (!cancelled) setBuildings((data ?? []) as Building[]);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError("Failed to load buildings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campus]);

  const selectAdmin = () => {
    setError("");
    setStaffIntent({ mode: "campus_admin", campus });
    navigate(`/staff/${campus}/login`, { replace: false });
  };

  const selectBuilding = (b: Building) => {
    setError("");
    setStaffIntent({ mode: "building_manager", campus, building_id: b.id });
    navigate(`/staff/${campus}/login`, { replace: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading staff options…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-slate-900">Staff sign-in</h1>
          <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 underline">
            Back
          </Link>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Select your building (manager) or campus admin for{" "}
          <span className="font-medium">{campusDisplay}</span>.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={selectAdmin}
          className="w-full px-4 py-3 mb-4 bg-black text-white rounded-lg hover:bg-slate-800 font-medium"
        >
          Campus Admin
        </button>

        <div className="space-y-2">
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => selectBuilding(b)}
              className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-900"
            >
              {b.name}
            </button>
          ))}
        </div>

        {buildings.length === 0 && (
          <div className="text-sm text-slate-600 mt-4">No buildings found for this campus.</div>
        )}
      </div>
    </div>
  );
}