import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LogOut } from "lucide-react";
import SearchPage from "../components/SearchPage";
import ItemDetail from "../components/ItemDetail";
import { Item, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { campus: campusParam } = useParams();
  const campus = (campusParam ?? "").toLowerCase();

  const { user, loading, profile } = useAuth();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [campusName, setCampusName] = useState<string>("");

  useEffect(() => {
    if (!campus) return;

    let cancelled = false;
    setCampusName(campus.toUpperCase());

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
    return () => { cancelled = true; };
  }, [campus]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (!profile?.campus_slug) { navigate("/not-onboarded", { replace: true }); return; }
    if (!campus) { navigate(`/${profile.campus_slug}`, { replace: true }); return; }
    if (profile.campus_slug !== campus) { navigate(`/${profile.campus_slug}`, { replace: true }); return; }
  }, [loading, user, profile?.campus_slug, campus, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user || !profile?.campus_slug || profile.campus_slug !== campus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Redirecting…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-200" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.04)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
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

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-sm font-medium"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>

      {!selectedItem && <SearchPage campus={campus} onViewItem={setSelectedItem} />}
      {selectedItem && <ItemDetail item={selectedItem} onBack={() => setSelectedItem(null)} />}
    </div>
  );
}
