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
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const { user, loading, profile } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // NOTE: keeping selection as building NAME for now (matches your existing AddItemForm/ItemsList props)
  // If you later switch those to building_id, this gets even cleaner.
  const [selectedBuilding, setSelectedBuilding] = useState<string>("All Buildings");

  const [adminView, setAdminView] = useState<AdminView>("analytics");
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [buildingNames, setBuildingNames] = useState<string[]>(["All Buildings"]);
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
  }, [loading, user, profile?.campus_slug, isStaff, campus, navigate]);

  // --- Campus display name from DB ---
  useEffect(() => {
    if (!campus) return;

    let cancelled = false;
    setCampusName(campus.toUpperCase());

    const loadCampus = async () => {
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
    };

    loadCampus();
    return () => {
      cancelled = true;
    };
  }, [campus]);

  // --- Fetch buildings (shared function so BuildingsManager can refresh list) ---
  const fetchBuildings = useCallback(async () => {
    if (!profile?.campus_slug || profile.campus_slug !== campus) return;
    if (!isStaff) return;

    try {
      const { data, error } = await supabase
        .from("buildings")
        .select("id,name")
        .eq("campus_slug", campus)
        .order("name");

      if (error) throw error;

      const rows = (data ?? []) as BuildingRow[];
      const names = rows.map((b) => b.name);

      setBuildings(rows);

      // Building managers: lock them to their building
      if (isBuildingManager) {
        if (profile.building_id) {
          const one = rows.find((b) => b.id === profile.building_id);
          const lockedName = one?.name ?? names[0] ?? "Unknown Building";

          setBuildingNames([lockedName]);
          setSelectedBuilding(lockedName);
        } else {
          // If their profile has no building_id, still lock them down
          const fallback = names[0] ?? "Unknown Building";
          setBuildingNames([fallback]);
          setSelectedBuilding(fallback);
        }
      } else {
        // Campus admin: allow All + all buildings
        setBuildingNames(["All Buildings", ...names]);

        // keep prior selection if still valid
        setSelectedBuilding((prev) => {
          if (prev === "All Buildings") return "All Buildings";
          if (names.includes(prev)) return prev;
          return "All Buildings";
        });
      }
    } catch (err) {
      console.error("Error fetching buildings:", err);

      if (isBuildingManager) {
        setBuildingNames(["Unknown Building"]);
        setSelectedBuilding("Unknown Building");
      } else {
        setBuildingNames(["All Buildings"]);
        setSelectedBuilding("All Buildings");
      }
    }
  }, [campus, profile?.campus_slug, profile?.building_id, isStaff, isBuildingManager]);

  // call it when page becomes valid
  useEffect(() => {
    if (!loading && user && profile?.campus_slug && isStaff && campus && profile.campus_slug === campus) {
      fetchBuildings();
    }
  }, [loading, user, profile?.campus_slug, isStaff, campus, profile?.campus_slug, fetchBuildings]);

  const handleItemAdded = () => setRefreshTrigger((p) => p + 1);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const showCampusAdminPanels = useMemo(() => {
    return selectedBuilding === "All Buildings" && !isBuildingManager;
  }, [selectedBuilding, isBuildingManager]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  // While redirects happen
  if (!user || !profile?.campus_slug || !isStaff || profile.campus_slug !== campus) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/found_folio_(6).png" alt="FoundFolio Logo" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Admin</h1>
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
        {/* Building filter */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Building</h3>
                {isBuildingManager && (
                  <p className="text-xs text-slate-500">Locked to your building</p>
                )}
              </div>
            </div>

            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              disabled={isBuildingManager}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] font-medium text-[#374151] disabled:opacity-70"
            >
              {buildingNames.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-8">
          {showCampusAdminPanels ? (
            <>
              {/* Admin Tabs */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdminView("analytics")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      adminView === "analytics"
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#F9FAFB] text-[#374151] hover:bg-slate-200"
                    }`}
                  >
                    <BarChart3 className="w-5 h-5" />
                    Analytics
                  </button>

                  <button
                    onClick={() => setAdminView("buildings")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      adminView === "buildings"
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#F9FAFB] text-[#374151] hover:bg-slate-200"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    Buildings
                  </button>

                  {isCampusAdmin && (
                    <button
                      onClick={() => setAdminView("staff")}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        adminView === "staff"
                          ? "bg-[#3B82F6] text-white"
                          : "bg-[#F9FAFB] text-[#374151] hover:bg-slate-200"
                      }`}
                    >
                      <User className="w-5 h-5" />
                      Staff
                    </button>
                  )}
                </div>
              </div>

              {adminView === "analytics" && (
                <AdminDashboard campus={campus} building={selectedBuilding} />
              )}

              {adminView === "buildings" && (
                <BuildingsManager
                  campus={campus}
                  campusName={campusName}
                  onBuildingsChange={fetchBuildings}
                />
              )}

              {adminView === "staff" && isCampusAdmin && (
                <ManageStaff
                  campus={campus}
                  buildings={buildings} // {id,name}[]
                />
              )}
            </>
          ) : (
            <>
              <AddItemForm onSuccess={handleItemAdded} campus={campus} building={selectedBuilding} />
              <ItemsList refreshTrigger={refreshTrigger} campus={campus} building={selectedBuilding} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
