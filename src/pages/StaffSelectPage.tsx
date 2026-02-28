import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setStaffIntent } from "../lib/authIntent";

type Building = { id: string; name: string };

export default function StaffSelectPage() {
  const navigate = useNavigate();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [error, setError] = useState("");

  const campusDisplay = useMemo(() => campus.toUpperCase(), [campus]);

  useEffect(() => {
    if (!campus) return;

    let cancelled = false;

    (async () => {
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
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) setError("Failed to load buildings.");
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

  return (
  <div className="min-h-screen bg-white px-4 py-12">
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Staff Access
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage lost & found for{" "}
          <span className="font-medium">{campusDisplay}</span>.
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Select one to continue.</div>
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Back
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-2">
          {/* Buildings */}
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => selectBuilding(b)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">
                {b.name}
              </div>
            </button>
          ))}

          {buildings.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              No buildings found for this campus.
            </div>
          )}

          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="text-xs uppercase tracking-wide text-slate-500">
              or
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Campus Admin */}
          <button
            onClick={selectAdmin}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
          >
            <div className="text-base font-semibold text-slate-900">
              Campus admin
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Manage items across the entire campus.
            </div>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Secure sign in. Campus access only.
      </div>
    </div>
  </div>
);

}
