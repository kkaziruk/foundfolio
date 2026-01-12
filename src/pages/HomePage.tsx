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
  }, [loading, user, profile?.campus_slug, campus, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
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

      {!selectedItem && <SearchPage campus={campus} onViewItem={setSelectedItem} />}
      {selectedItem && <ItemDetail item={selectedItem} onBack={() => setSelectedItem(null)} />}
    </div>
  );
}