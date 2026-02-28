import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LogOut, LifeBuoy } from "lucide-react";
import SearchPage from "../components/SearchPage";
import ItemDetail from "../components/ItemDetail";
import FeedbackReportModal from "../components/FeedbackReportModal";
import { StudentSafeItem, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { setReturnTo } from "../lib/authIntent";
import { trackItemViewed } from "../lib/analytics";

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const { user, loading, profile } = useAuth();
  const [selectedItem, setSelectedItem] = useState<StudentSafeItem | null>(null);
  const [campusName, setCampusName] = useState<string>("");
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Fetch campus name from database
  useEffect(() => {
    if (!campus) return;

    let cancelled = false;
    setCampusName(campus.toUpperCase()); // default immediately

    const loadCampus = async () => {
      try {
        const { data, error } = await supabase
          .from("campuses")
          .select("name, status")
          .eq("slug", campus)
          .eq("status", "active")
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) {
          setCampusName(data?.name ?? campus.toUpperCase());
        }
      } catch {
        if (!cancelled) {
          setCampusName(campus.toUpperCase());
        }
      }
    };

    loadCampus();

    return () => {
      cancelled = true;
    };
  }, [campus]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setReturnTo(`${location.pathname}${location.search}`);
      navigate("/login", { replace: true });
      return;
    }

    if (!profile?.campus_slug) {
      navigate("/not-onboarded", { replace: true });
      return;
    }

    // If campus param missing, go to the user's campus
    if (!campus) {
      navigate(`/${profile.campus_slug}`, { replace: true });
      return;
    }

    // Enforce campus membership
    if (profile.campus_slug !== campus) {
      navigate(`/${profile.campus_slug}`, { replace: true });
      return;
    }
  }, [loading, user, profile?.campus_slug, campus, navigate, location.pathname, location.search]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!user || !profile?.campus_slug) return;
    const dismissKey = `ff_student_checklist_dismissed_${user.id}`;
    if (localStorage.getItem(dismissKey) === "1") {
      setShowChecklist(false);
      return;
    }

    let cancelled = false;
    const loadChecklistState = async () => {
      setChecklistLoading(true);
      const hasSearchedLocally = localStorage.getItem(`ff_search_${profile.campus_slug}_has_searched`) === "1";
      const { count: claimCount, error: claimErr } = await supabase
        .from("claim_requests")
        .select("id", { count: "exact", head: true })
        .eq("requester_user_id", user.id);

      if (claimErr) console.error("Failed to load claim checklist state:", claimErr);

      if (!cancelled) {
        const hasStarted = hasSearchedLocally || (claimCount ?? 0) > 0;
        setShowChecklist(!hasStarted);
        setChecklistLoading(false);
      }
    };

    loadChecklistState().catch((err) => {
      console.error("Failed to evaluate student checklist:", err);
      if (!cancelled) setChecklistLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, profile?.campus_slug]);

  const dismissChecklist = () => {
    if (!user) return;
    localStorage.setItem(`ff_student_checklist_dismissed_${user.id}`, "1");
    setShowChecklist(false);
  };

  const handleViewItem = (item: StudentSafeItem) => {
    trackItemViewed({ item_id: item.id, campus: item.campus_slug });
    setSelectedItem(item);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (!user || !profile?.campus_slug || profile.campus_slug !== campus) {
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
                alt="Found Folio Logo"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Lost & Found</h1>
                <p className="text-sm text-slate-600">{campusName}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedItem
                    ? "bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE]"
                    : "bg-slate-100 text-slate-700"
                }`}
                aria-label="Search items"
                title="Search items"
              >
                Search
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

      {checklistLoading && !selectedItem && (
        <div className="mx-auto mt-6 w-full max-w-7xl px-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Checking quick-start status...
          </div>
        </div>
      )}

      {showChecklist && !selectedItem && (
        <div className="mx-auto mt-6 w-full max-w-7xl px-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-900">Get started in 30 seconds</p>
                <p className="text-sm text-blue-800 mt-1">
                  1. Run your first search. 2. Submit your first claim request when you spot your item.
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
        </div>
      )}

      {!selectedItem && <SearchPage campus={campus} onViewItem={handleViewItem} />}
      {selectedItem && <ItemDetail item={selectedItem} onBack={() => setSelectedItem(null)} />}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <p className="text-xs text-slate-500">FoundFolio</p>
          <p className="text-xs text-slate-500">Need help? Use the floating button.</p>
        </div>
      </footer>

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
          itemId: selectedItem?.id ?? null,
        }}
      />
    </div>
  );
}
