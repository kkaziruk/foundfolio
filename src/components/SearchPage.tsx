// src/pages/SearchPage.tsx
import React, { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, Package } from "lucide-react";
import { supabase, Item } from "../lib/supabase";

interface SearchPageProps {
  campus: string;
  onViewItem: (item: Item) => void;
}

const CATEGORIES = [
  "All Categories",
  "Jacket/Coat",
  "Sweatshirt/Hoodie",
  "Shirt/Top",
  "Pants/Shorts",
  "Shoes",
  "Hat/Beanie",
  "Scarf/Gloves",
  "Jewelry",
  "Watch",
  "Sunglasses",
  "Glasses/Contacts",
  "Backpack",
  "Purse/Handbag",
  "Reusable Bag",
  "Lunchbox/Tupperware",
  "Wallet",
  "Keys",
  "ID Card/License",
  "Credit/Debit Card",
  "Passport",
  "Bike Lock",
  "Phone",
  "Laptop",
  "Tablet/iPad",
  "Headphones/Earbuds",
  "Charger/Cable",
  "USB Drive",
  "Calculator",
  "Camera",
  "Gaming Device",
  "Textbook",
  "Notebook",
  "Planner/Binder",
  "Folder",
  "Writing Utensils",
  "Medication",
  "Medical Device",
  "Cosmetics/Makeup",
  "Hair Accessories",
  "Water Bottle",
  "Sports Equipment",
  "Musical Instrument",
  "Umbrella",
  "Other",
];

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SearchPage({ campus, onViewItem }: SearchPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedBuilding, setSelectedBuilding] = useState("All Buildings");

  const [buildings, setBuildings] = useState<string[]>(["All Buildings"]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  const [results, setResults] = useState<Item[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const activeFilterCount =
    (selectedCategory !== "All Categories" ? 1 : 0) +
    (selectedBuilding !== "All Buildings" ? 1 : 0);

  // Load buildings
  useEffect(() => {
    let cancelled = false;

    const loadBuildings = async () => {
      setBuildingsLoading(true);
      try {
        const { data, error } = await supabase
          .from("buildings")
          .select("name")
          .eq("campus_slug", campus)
          .order("name");

        if (error) throw error;

        const names = (data ?? []).map((b: any) => b.name).filter(Boolean);

        if (!cancelled) {
          setBuildings(["All Buildings", ...names]);
          setSelectedBuilding((prev) =>
            prev === "All Buildings" || names.includes(prev) ? prev : "All Buildings"
          );
        }
      } catch (err) {
        console.error("Failed to load buildings:", err);
        if (!cancelled) setBuildings(["All Buildings"]);
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };

    loadBuildings();
    return () => { cancelled = true; };
  }, [campus]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!searchTerm.trim()) {
      setHasSearched(true);
      setResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      await supabase.from("searches").insert({
        search_term: searchTerm.trim(),
        campus: campus,
      });
    } catch {
      // Ignore logging failures
    }

    try {
      let query = supabase
        .from("items")
        .select("id, photo_url, description, category, building, date_found")
        .eq("status", "available")
        .eq("campus_slug", campus);

      if (selectedCategory !== "All Categories") {
        query = query.eq("category", selectedCategory);
      }

      if (selectedBuilding !== "All Buildings") {
        query = query.eq("building", selectedBuilding);
      }

      if (searchTerm.trim()) {
        const keywords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

        if (keywords.length) {
          const escaped = keywords.map((k) =>
            k.replace(/%/g, "\\%").replace(/_/g, "\\_")
          );
          const orConditions = escaped.map((k) => `description.ilike.%${k}%`).join(",");
          query = query.or(orConditions);
        }
      }

      const { data, error } = await query
        .order("date_found", { ascending: false })
        .limit(100);

      if (error) throw error;

      setResults(data || []);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    setSelectedCategory("All Categories");
    setSelectedBuilding("All Buildings");
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* ── Hero search section ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 text-center" style={{ fontFamily: "Poppins, system-ui, sans-serif" }}>
            Lost something?
          </h1>
          <p className="text-sm text-slate-500 text-center mb-6">
            Search items found across campus
          </p>

          <form onSubmit={handleSearch} autoComplete="off">
            {/* Search row */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" style={{ width: "18px", height: "18px" }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Describe your item — e.g. blue backpack"
                  className="ff-input pl-10 pr-4"
                  style={{ paddingTop: "0.8125rem", paddingBottom: "0.8125rem" }}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="ff-btn-primary px-4 sm:px-5 flex items-center gap-2 whitespace-nowrap"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 sm:hidden" />
                    <span className="hidden sm:inline">Search</span>
                    <Search className="w-4 h-4 hidden sm:block" />
                  </>
                )}
              </button>
            </div>

            {/* Filter toggle */}
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="ff-input text-sm"
                    style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Building
                  </label>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => setSelectedBuilding(e.target.value)}
                    disabled={buildingsLoading || buildings.length <= 1}
                    className="ff-input text-sm disabled:opacity-60"
                    style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                  >
                    {buildings.map((building) => (
                      <option key={building} value={building}>{building}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── Results area ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Loading */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Searching…</p>
          </div>
        )}

        {/* Empty states */}
        {!isSearching && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {searchTerm.trim() === "" ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700">Enter a search term</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  Describe what you lost — like "black water bottle" or "AirPods"
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700">No items found</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  Try different keywords or check back later as new items are logged daily.
                </p>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {!isSearching && results.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {results.map((item) => {
                const dateStr = relativeDate(item.date_found as string | null | undefined);
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewItem(item as Item)}
                    className="text-left bg-white rounded-xl border border-slate-200 overflow-hidden group transition-all duration-150 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                  >
                    {/* Image */}
                    <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.description}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-100 to-slate-200">
                          <Package className="w-7 h-7 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 mb-2">
                        {item.description}
                      </p>

                      <div className="space-y-1">
                        <span className="ff-chip ff-chip-blue text-[11px]">
                          {item.category}
                        </span>

                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] text-slate-500 truncate">{item.building}</span>
                        </div>

                        {dateStr && (
                          <p className="text-[11px] text-slate-400">{dateStr}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Pre-search idle state */}
        {!isSearching && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">Search to see results</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Type what you lost above and tap Search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
