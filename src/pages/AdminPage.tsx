import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Home,
  Search as SearchIcon,
  Building2,
  BarChart3,
  LogOut,
  User,
  Link2,
  Copy,
  Check,
} from "lucide-react";
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
  const [selectedBuildingId, setSelectedBuildingId] =
    useState<string>(ALL_BUILDINGS_ID);

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [campusName, setCampusName] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

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
  }, [
    loading,
    user,
    profileLoading,
    profile?.campus_slug,
    isStaff,
    campus,
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
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-200" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)" }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/found_folio_(6).png"
              alt="FoundFolio"
              className="w-8 h-8 object-contain"
            />
            <div className="leading-none">
              <span className="text-sm font-semibold text-slate-900">FoundFolio</span>
              {campusName && (
                <span className="text-xs text-slate-500 ml-1.5 font-normal">{campusName}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goAdminHome}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="Home"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate(`/${campus}`)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="Student search"
              title="Student search"
            >
              <SearchIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-sm font-medium ml-1"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Building filter (campus admin only) */}
        {!isBuildingManager && (
          <div className="mb-4 bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-600">Building</span>
            </div>

            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="ff-input text-sm w-full sm:w-auto sm:min-w-[200px]"
              style={{ paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}
            >
              <option value={ALL_BUILDINGS_ID}>All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}


        {/* Breadcrumb context */}
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 select-none">
          <span className="font-medium text-slate-600">{campusName || campus.toUpperCase()}</span>
          <span>›</span>
          {selectedBuildingId === ALL_BUILDINGS_ID ? (
            <>
              <span>All Buildings</span>
              {showCampusAdminPanels && (
                <>
                  <span>›</span>
                  <span className="font-medium text-slate-700 capitalize">{adminView}</span>
                </>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedBuildingId(ALL_BUILDINGS_ID)}
                className="hover:text-slate-700 transition-colors underline underline-offset-2"
              >
                All Buildings
              </button>
              <span>›</span>
              <span className="font-medium text-slate-700">{selectedBuilding?.name ?? "Building"}</span>
              <span>›</span>
              <span className="font-medium text-slate-700">Inventory</span>
            </>
          )}
        </div>

        <div className="space-y-6">
          {showCampusAdminPanels ? (
            <>
              {/* Admin Tabs */}
              <div className="bg-white rounded-xl border border-slate-200 p-1.5" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setAdminView("analytics")}
                    className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      adminView === "analytics"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Analytics</span>
                  </button>

                  <button
                    onClick={() => setAdminView("buildings")}
                    className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      adminView === "buildings"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Buildings</span>
                  </button>

                  {isCampusAdmin && (
                    <button
                      onClick={() => setAdminView("staff")}
                      className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        adminView === "staff"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">Staff</span>
                    </button>
                  )}
                </div>
              </div>

              {adminView === "analytics" && (
                <>
                  <AdminDashboard
                    campus={campus}
                    building={selectedBuildingNameForProps}
                  />

                  {/* Shareable student URL + QR code */}
                  {(() => {
                    const shareUrl = `${window.location.origin}/search/${campus}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=0f172a&margin=2`;
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Link2 className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Student search page</p>
                            <p className="text-xs text-slate-500">Share this URL or QR code so students can search for lost items</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                          {/* URL + copy */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                              <span className="text-xs text-slate-600 font-mono truncate flex-1">{shareUrl}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(shareUrl).then(() => {
                                    setCopiedLink(true);
                                    setTimeout(() => setCopiedLink(false), 2000);
                                  });
                                }}
                                className="flex items-center gap-1.5 flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedLink ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                              Post this link on your campus website, email signature, or bulletin boards.
                            </p>
                          </div>

                          {/* QR code */}
                          <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                              <img
                                src={qrUrl}
                                alt={`QR code for ${shareUrl}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 text-center mt-1">Scan to open</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
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
    </div>
  );
}
