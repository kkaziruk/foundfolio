import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search as SearchIcon, Building2, BarChart3, LogOut, User } from "lucide-react";
import AdminDashboard from "../components/AdminDashboard";
import AddItemForm from "../components/AddItemForm";
import ItemsList from "../components/ItemsList";
import BuildingsManager from "../components/BuildingsManager";
import ManageStaff from "../components/ManageStaff";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type AdminView = "analytics" | "buildings" | "staff";

type BuildingRow = {
  id: string;
  name: string;
  is_system?: boolean | null;
};

const ALL_BUILDINGS_ID = "__ALL__";

export default function AdminPage() {
  const navigate = useNavigate();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const { user, loading, profile, profileLoading } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [adminView, setAdminView] = useState<AdminView>("analytics");

  // ✅ selection is now stable: building id (or "__ALL__")
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(ALL_BUILDINGS_ID);

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [campusName, setCampusName] = useState<string>("");

  const isBuildingManager = profile?.role === "building_manager";
  const isCampusAdmin = profile?.role === "campus_admin";
  const isStaff = isBuildingManager || isCampusAdmin;

  // --- Guard: auth + onboarding + role + campus match ---
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (profileLoading) return;

    if (!profile?.campus_slug) {
      navigate("/not-onboarded", { replace: true });
      return;
    }

    if (!isStaff) {
      navigate("/unauthorized", { replace: true });
      return;
    }

    if (!campus) {
      navigate(`/admin/${profile.campus_slug}`, { replace: true });
      return;
    }

    if (profile.campus_slug !== campus) {
      navigate(`/admin/${profile.campus_slug}`, { replace: true });
      return;
    }
  }, [loading, user, profileLoading, profile?.campus_slug, isStaff, campus, navigate]);

  // --- Campus display name from DB ---
  useEffect(() => {
    if (!campus) return;

    let cancelled = false;
    setCampusName(campus.toUpperCase());

    (async () => {
      try {
        const { data, error } = await supabase
          .from("campuses")
          .select("name,status")
          .eq("slug", campus)
          .eq("status", "active")
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) setCampusName(data?.name ?? campus.toUpperCase());
      } catch {
        if (!cancelled) setCampusName(campus.toUpperCase());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campus]);

  // --- Fetch buildings (shared so BuildingsManager can refresh list) ---
  const fetchBuildings = useCallback(async () => {
    if (!profile?.campus_slug || profile.campus_slug !== campus) return;
    if (!isStaff) return;

    try {
      const { data, error } = await supabase
        .from("buildings")
        .select("id,name,is_system")
        .eq("campus_slug", campus)
        .order("name");

      if (error) throw error;

      const rows = (data ?? []) as BuildingRow[];
      setBuildings(rows);

      // Building manager: lock selection to their building id
      if (isBuildingManager) {
        const lockedId = profile?.building_id ?? rows[0]?.id;
        if (lockedId) setSelectedBuildingId(lockedId);
      } else {
        // Campus admin: keep selection if valid; else default to ALL
        setSelectedBuildingId((prev) => {
          if (prev === ALL_BUILDINGS_ID) return ALL_BUILDINGS_ID;
          const exists = rows.some((b) => b.id === prev);
          return exists ? prev : ALL_BUILDINGS_ID;
        });
      }
    } catch (err) {
      console.error("Error fetching buildings:", err);
      // fallback
      if (isBuildingManager) {
        setSelectedBuildingId(profile?.building_id ?? ALL_BUILDINGS_ID);
      } else {
        setSelectedBuildingId(ALL_BUILDINGS_ID);
      }
      setBuildings([]);
    }
  }, [campus, profile?.campus_slug, profile?.building_id, isStaff, isBuildingManager]);

  useEffect(() => {
    const isReady =
      !loading &&
      !profileLoading &&
      user &&
      isStaff &&
      profile?.campus_slug === campus;

    if (isReady) fetchBuildings();
  }, [loading, profileLoading, user, isStaff, profile?.campus_slug, campus, fetchBuildings]);

  const handleItemAdded = () => setRefreshTrigger((p) => p + 1);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const selectedBuilding = useMemo(() => {
    if (selectedBuildingId === ALL_BUILDINGS_ID) return null;
    return buildings.find((b) => b.id === selectedBuildingId) ?? null;
  }, [selectedBuildingId, buildings]);

  // These components still use building NAME (your current API).
  const selectedBuildingNameForProps = selectedBuilding ? selectedBuilding.name : "All Buildings";

  const showCampusAdminPanels = useMemo(() => {
    return selectedBuildingId === ALL_BUILDINGS_ID && !isBuildingManager;
  }, [selectedBuildingId, isBuildingManager]);

  // Safety: building manager should never land on staff tab
  useEffect(() => {
    if (!isCampusAdmin && adminView === "staff") setAdminView("analytics");
  }, [isCampusAdmin, adminView]);

  // Loading states
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (user && profileLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  if (!user || (!profileLoading && (!profile?.campus_slug || !isStaff || profile.campus_slug !== campus))) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/found_folio_(6).png"
                alt="FoundFolio Logo"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {selectedBuildingId === ALL_BUILDINGS_ID ? "Admin" : selectedBuilding?.name ?? "Building"}
                </h1>
                <p className="text-sm text-slate-600">{campusName}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/${campus}`)}
                className="p-2 rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Back to search"
                title="Back to search"
              >
                <SearchIcon className="w-5 h-5" />
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Building filter (campus admin only) */}
        {!isBuildingManager && (
          <div className="mb-6 bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Building</h3>
                </div>
              </div>

              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] font-medium text-[#374151]"
              >
                <option value={ALL_BUILDINGS_ID}>All Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {showCampusAdminPanels ? (
            <>
              {/* Admin Tabs */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setAdminView("analytics")}
                    className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                      adminView === "analytics"
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#F9FAFB] text-[#374151] hover:bg-slate-200"
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 shrink-0" />
                    <span className="truncate">Analytics</span>
                  </button>

                  <button
                    onClick={() => setAdminView("buildings")}
                    className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                      adminView === "buildings"
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#F9FAFB] text-[#374151] hover:bg-slate-200"
                    }`}
                  >
                    <Building2 className="w-5 h-5 shrink-0" />
                    <span className="truncate">Buildings</span>
                  </button>

                  {isCampusAdmin && (
                    <button
                      onClick={() => setAdminView("staff")}
                      className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                        adminView === "staff"
                          ? "bg-[#3B82F6] text-white"
                          : "bg-[#F9FAFB] text-[#374151] hover:bg-slate-200"
                      }`}
                    >
                      <User className="w-5 h-5 shrink-0" />
                      <span className="truncate">Staff</span>
                    </button>
                  )}
                </div>
              </div>

              {adminView === "analytics" && (
                <AdminDashboard campus={campus} building={selectedBuildingNameForProps} />
              )}

              {adminView === "buildings" && (
                <BuildingsManager
                  campus={campus}
                  campusName={campusName}
                  onBuildingsChange={fetchBuildings}
                />
              )}

              {adminView === "staff" && isCampusAdmin && (
                <ManageStaff campus={campus} buildings={buildings.map((b) => ({ id: b.id, name: b.name }))} />
              )}
            </>
          ) : (
            <>
              {/* Per-building intake */}
              <AddItemForm onSuccess={handleItemAdded} campus={campus} building={selectedBuildingNameForProps} />
              <ItemsList refreshTrigger={refreshTrigger} campus={campus} building={selectedBuildingNameForProps} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}