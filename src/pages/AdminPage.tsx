import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Home,
  Search as SearchIcon,
  Building2,
  BarChart3,
  LogOut,
  User,
  LifeBuoy,
} from "lucide-react";
import AdminDashboard from "../components/AdminDashboard";
import AddItemForm from "../components/AddItemForm";
import ItemsList from "../components/ItemsList";
import BuildingsManager from "../components/BuildingsManager";
import ManageStaff from "../components/ManageStaff";
import FeedbackReportModal from "../components/FeedbackReportModal";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { setReturnTo } from "../lib/authIntent";

type AdminView = "analytics" | "buildings" | "staff";

type BuildingRow = {
  id: string;
  name: string;
  is_system?: boolean | null;
};

const ALL_BUILDINGS_ID = "__ALL__";
const HINT_KEY = "ff_admin_building_hint_dismissed";

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const { user, loading, profile, profileLoading } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [adminView, setAdminView] = useState<AdminView>("analytics");

  // ✅ selection is now stable: building id (or "__ALL__")
  const [selectedBuildingId, setSelectedBuildingId] =
    useState<string>(ALL_BUILDINGS_ID);

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [campusName, setCampusName] = useState<string>("");

  const [showBuildingHint, setShowBuildingHint] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const dismissBuildingHint = useCallback(() => {
    setShowBuildingHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }, []);

  const isBuildingManager = profile?.role === "building_manager";
  const isCampusAdmin = profile?.role === "campus_admin";
  const isStaff = isBuildingManager || isCampusAdmin;

  useEffect(() => {
    if (!user || !profile?.campus_slug || !isStaff) return;
    const dismissKey = `ff_staff_checklist_dismissed_${user.id}`;
    if (localStorage.getItem(dismissKey) === "1") {
      setShowChecklist(false);
      return;
    }

    let cancelled = false;
    const loadStaffChecklist = async () => {
      let query = supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("campus_slug", profile.campus_slug);

      if (isBuildingManager && profile.building_id) {
        const { data: buildingData, error: buildingErr } = await supabase
          .from("buildings")
          .select("name")
          .eq("id", profile.building_id)
          .maybeSingle();
        if (buildingErr) console.error("Failed to load manager building name:", buildingErr);
        const managedBuilding = buildingData?.name ?? "";
        if (managedBuilding) {
          query = query.eq("building", managedBuilding);
        }
      }

      const { count, error } = await query;
      if (error) {
        console.error("Failed to load staff checklist state:", error);
      }
      if (!cancelled) setShowChecklist((count ?? 0) === 0);
    };

    loadStaffChecklist().catch((err) => {
      console.error("Failed to evaluate staff checklist:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [user, profile?.campus_slug, profile?.building_id, isStaff, isBuildingManager]);

  const dismissChecklist = () => {
    if (!user) return;
    localStorage.setItem(`ff_staff_checklist_dismissed_${user.id}`, "1");
    setShowChecklist(false);
  };

  // --- Guard: auth + onboarding + role + campus match ---
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setReturnTo(`${location.pathname}${location.search}`);
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
  }, [
    loading,
    user,
    profileLoading,
    profile?.campus_slug,
    isStaff,
    campus,
    location.pathname,
    location.search,
    navigate,
  ]);

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
  }, [
    campus,
    profile?.campus_slug,
    profile?.building_id,
    isStaff,
    isBuildingManager,
  ]);

  useEffect(() => {
    const isReady =
      !loading &&
      !profileLoading &&
      user &&
      isStaff &&
      profile?.campus_slug === campus;

    if (isReady) fetchBuildings();
  }, [
    loading,
    profileLoading,
    user,
    isStaff,
    profile?.campus_slug,
    campus,
    fetchBuildings,
  ]);

  const handleItemAdded = () => setRefreshTrigger((p) => p + 1);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // ✅ Admin “Home” = reset to campus admin landing (All Buildings + Analytics)
  const goAdminHome = useCallback(() => {
    setSelectedBuildingId(ALL_BUILDINGS_ID);
    setAdminView("analytics");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  const selectedBuilding = useMemo(() => {
    if (selectedBuildingId === ALL_BUILDINGS_ID) return null;
    return buildings.find((b) => b.id === selectedBuildingId) ?? null;
  }, [selectedBuildingId, buildings]);

  // These components still use building NAME (your current API).
  const selectedBuildingNameForProps = selectedBuilding
    ? selectedBuilding.name
    : "All Buildings";

  const showCampusAdminPanels = useMemo(() => {
    return selectedBuildingId === ALL_BUILDINGS_ID && !isBuildingManager;
  }, [selectedBuildingId, isBuildingManager]);

  // Safety: building manager should never land on staff tab
  useEffect(() => {
    if (!isCampusAdmin && adminView === "staff") setAdminView("analytics");
  }, [isCampusAdmin, adminView]);

  // Loading states
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  if (user && profileLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );

  if (
    !user ||
    (!profileLoading &&
      (!profile?.campus_slug || !isStaff || profile.campus_slug !== campus))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Redirecting…
      </div>
    );
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
                  {selectedBuildingId === ALL_BUILDINGS_ID
                    ? "Admin"
                    : selectedBuilding?.name ?? "Building"}
                </h1>
                <p className="text-sm text-slate-600">{campusName}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {/* ✅ Home: returns to admin landing (All Buildings + Analytics) */}
              <button
                onClick={goAdminHome}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Home"
                title="Home"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              {/* (Optional) Back to student search */}
              <button
                onClick={() => navigate(`/${campus}`)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Back to search"
                title="Back to search"
              >
                <SearchIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Student Search</span>
              </button>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Building filter (campus admin only) */}
        {!isBuildingManager && (
          <div className="mb-3 bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700">
                    Building
                  </h3>
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

        {/* Hint: directly under dropdown (only when ALL selected) */}
        {!isBuildingManager &&
          selectedBuildingId === ALL_BUILDINGS_ID &&
          showBuildingHint && (
            <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-slate-700" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">
                    Inspect building inventory
                  </div>

                  <button
                    onClick={dismissBuildingHint}
                    className="text-slate-500 hover:text-slate-700 text-sm leading-none"
                    aria-label="Dismiss"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-sm text-slate-600 mt-1">
                  Use the{" "}
                  <span className="font-medium text-slate-800">Building</span>{" "}
                  dropdown above to drill into a location and export a CSV of
                  all items.
                </div>
              </div>
            </div>
          )}

        <div className="space-y-8">
          {showChecklist && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Quick-start checklist (30 seconds)</p>
                  <p className="text-sm text-blue-800 mt-1">
                    1. Log your first item. 2. Move one item to confirm operations flow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissChecklist}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

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
                <AdminDashboard
                  campus={campus}
                  building={selectedBuildingNameForProps}
                />
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
                  buildings={buildings.map((b) => ({
                    id: b.id,
                    name: b.name,
                  }))}
                />
              )}
            </>
          ) : (
            <>
              {/* Per-building intake */}
              <AddItemForm
                onSuccess={handleItemAdded}
                campus={campus}
                building={selectedBuildingNameForProps}
              />
              <ItemsList
                refreshTrigger={refreshTrigger}
                campus={campus}
                building={selectedBuildingNameForProps}
              />
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setReportIssueOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1D4ED8]"
      >
        <LifeBuoy className="h-4 w-4" />
        Help / Report Issue
      </button>

      <FeedbackReportModal
        isOpen={reportIssueOpen}
        onClose={() => setReportIssueOpen(false)}
        context={{
          route: `${location.pathname}${location.search}`,
          role: profile?.role ?? "unknown",
          itemId: null,
        }}
      />
    </div>
  );
}
