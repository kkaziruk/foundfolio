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
  Inbox,
  Settings,
  Printer,
} from "lucide-react";
import AdminDashboard from "../components/AdminDashboard";
import AddItemForm from "../components/AddItemForm";
import ItemsList from "../components/ItemsList";
import BuildingsManager from "../components/BuildingsManager";
import ManageStaff from "../components/ManageStaff";
import FoundReportsQueue from "../components/FoundReportsQueue";
import BuildingSettings from "../components/BuildingSettings";
import AdminSettings from "../components/AdminSettings";
import FlyerEditorModal from "../components/FlyerEditorModal";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type AdminView = "analytics" | "buildings" | "staff" | "reports";

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
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showFlyerEditor, setShowFlyerEditor] = useState(false);

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

  const shareUrl = `${window.location.origin}/search/${campus}`;

  const handleMakeFlyer = useCallback(() => {
    const flyerUrl = "https://www.foundfolio.co/login";
    const qrHiRes = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${encodeURIComponent(flyerUrl)}&bgcolor=ffffff&color=0f172a&margin=1`;

    const buildingLine = isBuildingManager && selectedBuilding
      ? selectedBuilding.name
      : campusName;

    const logoUrl = `${window.location.origin}/found_folio_(6).png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FoundFolio Flyer — ${buildingLine}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; background: #e2e8f0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body {
      display: flex; flex-direction: column;
      align-items: center; padding: 32px 20px 48px;
    }

    /* ── Print bar ── */
    .print-bar {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; max-width: 520px; margin-bottom: 24px;
    }
    .print-bar p { font-size: 13px; color: #64748b; }
    .print-btn {
      background: #0f172a; color: white; border: none;
      padding: 10px 22px; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: opacity 0.15s;
    }
    .print-btn:hover { opacity: 0.82; }

    /* ── Flyer shell ── */
    .flyer {
      width: 100%; max-width: 520px;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
    }

    /* ── Black header ── */
    .header {
      background: #0f172a;
      padding: 28px 40px 24px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .header-brand {
      display: flex; align-items: center; gap: 12px;
    }
    .header-logo {
      width: 36px; height: 36px;
      object-fit: contain;
    }
    .header-name {
      font-size: 18px; font-weight: 800;
      color: white; letter-spacing: -0.4px;
    }
    .header-badge {
      background: #fbbf24; color: #0f172a;
      font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 100px;
      letter-spacing: 0.2px;
    }

    /* ── Blue campus strip ── */
    .campus-strip {
      background: #1d4ed8;
      padding: 10px 40px;
      display: flex; align-items: center; gap-8px;
    }
    .campus-strip p {
      font-size: 13px; font-weight: 600;
      color: #bfdbfe; letter-spacing: 0.1px;
    }
    .campus-strip span {
      color: white; margin-left: 6px;
    }

    /* ── White body ── */
    .body {
      padding: 44px 40px 40px;
      text-align: center;
    }
    .headline {
      font-size: 56px; font-weight: 900;
      color: #0f172a; line-height: 1.0;
      letter-spacing: -2.5px; margin-bottom: 12px;
    }
    .subhead {
      font-size: 16px; color: #64748b;
      font-weight: 400; line-height: 1.55;
      margin-bottom: 40px;
    }

    /* ── QR code ── */
    .qr-wrap {
      display: inline-block;
      padding: 16px;
      border: 3px solid #2563eb;
      border-radius: 20px;
      margin-bottom: 36px;
      background: white;
    }
    .qr-wrap img { display: block; width: 220px; height: 220px; }

    /* ── OR divider ── */
    .or-row {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 16px;
    }
    .or-line { flex: 1; height: 1px; background: #e2e8f0; }
    .or-text {
      font-size: 10px; color: #94a3b8;
      font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
    }

    /* ── URL chip ── */
    .url-chip {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 12px; font-family: monospace;
      color: #475569;
    }

    /* ── Yellow footer accent ── */
    .footer-accent {
      background: #fbbf24;
      height: 6px;
    }
    .footer {
      background: #0f172a;
      padding: 16px 40px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .footer-left {
      font-size: 12px; font-weight: 600; color: white;
    }
    .footer-right {
      font-size: 11px; color: #64748b;
    }

    @media print {
      html, body { background: white; padding: 0; }
      .print-bar { display: none; }
      .flyer { border-radius: 0; box-shadow: none; max-width: 100%; }
      .headline { font-size: 64px; }
      .qr-wrap img { width: 260px; height: 260px; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <p>Preview — print or save as PDF</p>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="flyer">
    <!-- Black header -->
    <div class="header">
      <div class="header-brand">
        <img src="${logoUrl}" alt="FoundFolio" class="header-logo" />
        <span class="header-name">FoundFolio</span>
      </div>
      <span class="header-badge">Lost &amp; Found</span>
    </div>

    <!-- Blue campus strip -->
    <div class="campus-strip">
      <p>Campus:<span>${buildingLine}</span></p>
    </div>

    <!-- White body -->
    <div class="body">
      <p class="headline">Lost something?</p>
      <p class="subhead">Scan below to see if your item has<br>been turned in to lost &amp; found.</p>

      <div class="qr-wrap">
        <img src="${qrHiRes}" alt="Scan to search FoundFolio" />
      </div>

      <div class="or-row">
        <span class="or-line"></span>
        <span class="or-text">or visit</span>
        <span class="or-line"></span>
      </div>
      <span class="url-chip">foundfolio.co/login</span>
    </div>

    <!-- Yellow accent + dark footer -->
    <div class="footer-accent"></div>
    <div class="footer">
      <span class="footer-left">${buildingLine} · Lost &amp; Found</span>
      <span class="footer-right">Powered by FoundFolio</span>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, [shareUrl, campusName, isBuildingManager, selectedBuilding]);

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

            {isBuildingManager && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                aria-label="Building settings"
                title="Building settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {isCampusAdmin && (
              <button
                onClick={() => setShowAdminSettings(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                aria-label="Campus settings"
                title="Campus settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

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
              <span className="text-sm font-semibold text-slate-700">Viewing:</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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

                  <button
                    onClick={() => setAdminView("reports")}
                    className={`w-full min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      adminView === "reports"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Inbox className="w-4 h-4 shrink-0" />
                    <span className="truncate">Reports</span>
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
                    const flyerUrl = "https://www.foundfolio.co/login";
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(flyerUrl)}&bgcolor=ffffff&color=0f172a&margin=2`;
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Link2 className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Student Search Page</p>
                            <p className="text-xs text-slate-500">Share this link, print the QR code, or make a flyer to post around your building</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-start mb-4">
                          {/* URL + copy */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                              <span className="text-xs text-slate-600 font-mono truncate flex-1">foundfolio.co/login</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(flyerUrl).then(() => {
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
                          </div>

                          {/* QR code */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                              <img
                                src={qrUrl}
                                alt={`QR code for ${shareUrl}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Flyer button */}
                        <button
                          onClick={() => setShowFlyerEditor(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 active:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          Make a printable flyer
                        </button>
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

              {adminView === "reports" && (
                <FoundReportsQueue campus={campus} buildingId={null} />
              )}
            </>
          ) : (
            <>
              {/* Building manager: Items / Reports toggle */}
              {isBuildingManager && (
                <div className="bg-white rounded-xl border border-slate-200 p-1.5 mb-0" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setAdminView("analytics")}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        adminView !== "reports"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 shrink-0" />
                      <span>Items</span>
                    </button>
                    <button
                      onClick={() => setAdminView("reports")}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        adminView === "reports"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Inbox className="w-4 h-4 shrink-0" />
                      <span>Reports</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Per-building intake */}
              {adminView !== "reports" && (
                <>
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

              {adminView === "reports" && isBuildingManager && (
                <FoundReportsQueue
                  campus={campus}
                  buildingId={profile?.building_id ?? null}
                />
              )}
            </>
          )}
        </div>
      </div>

      {showSettings && isBuildingManager && profile?.building_id && (
        <BuildingSettings
          buildingId={profile.building_id}
          buildingName={selectedBuilding?.name ?? "Your building"}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAdminSettings && isCampusAdmin && (
        <AdminSettings
          campus={campus}
          campusName={campusName}
          onClose={() => setShowAdminSettings(false)}
          onNavigateToBuildings={() => {
            setAdminView("buildings");
            setSelectedBuildingId(ALL_BUILDINGS_ID);
          }}
        />
      )}

      {showFlyerEditor && (
        <FlyerEditorModal
          buildingLine={isBuildingManager && selectedBuilding ? selectedBuilding.name : campusName}
          logoUrl={`${window.location.origin}/found_folio_(6).png`}
          onClose={() => setShowFlyerEditor(false)}
        />
      )}
    </div>
  );
}
