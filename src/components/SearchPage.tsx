// src/pages/SearchPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, ImageIcon, ChevronDown } from "lucide-react";
import { supabase, Item } from "../lib/supabase";

interface SearchPageProps {
  campus: string;
  campusName?: string;
  onViewItem: (item: Item) => void;
}

// Quick-launch chips shown before first search
const QUICK_CHIPS: { label: string; query: string; icon: string }[] = [
  { label: "Phone",       query: "phone",       icon: "📱" },
  { label: "Keys",        query: "keys",        icon: "🔑" },
  { label: "Wallet",      query: "wallet",      icon: "👜" },
  { label: "Backpack",    query: "backpack",    icon: "🎒" },
  { label: "Headphones",  query: "headphones",  icon: "🎧" },
  { label: "Laptop",      query: "laptop",      icon: "💻" },
  { label: "Water Bottle",query: "water bottle",icon: "🍶" },
  { label: "Jacket",      query: "jacket",      icon: "🧥" },
  { label: "Glasses",     query: "glasses",     icon: "👓" },
  { label: "AirPods",     query: "airpods",     icon: "🎵" },
  { label: "ID Card",     query: "id card",     icon: "🪪" },
  { label: "Umbrella",    query: "umbrella",    icon: "☂️" },
];

// Grouped categories for the filter panel
const CATEGORY_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Clothing",
    items: ["Jacket/Coat","Sweatshirt/Hoodie","Shirt/Top","Pants/Shorts","Shoes","Hat/Beanie","Scarf/Gloves"],
  },
  {
    label: "Accessories",
    items: ["Jewelry","Watch","Sunglasses","Glasses/Contacts"],
  },
  {
    label: "Bags",
    items: ["Backpack","Purse/Handbag","Reusable Bag","Lunchbox/Tupperware"],
  },
  {
    label: "Essentials",
    items: ["Wallet","Keys","ID Card/License","Credit/Debit Card","Passport","Bike Lock"],
  },
  {
    label: "Electronics",
    items: ["Phone","Laptop","Tablet/iPad","Headphones/Earbuds","Charger/Cable","USB Drive","Calculator","Camera","Gaming Device"],
  },
  {
    label: "Academic",
    items: ["Textbook","Notebook","Planner/Binder","Folder","Writing Utensils"],
  },
  {
    label: "Other",
    items: ["Medication","Medical Device","Cosmetics/Makeup","Hair Accessories","Water Bottle","Sports Equipment","Musical Instrument","Umbrella","Other"],
  },
];


export default function SearchPage({ campus, campusName, onViewItem }: SearchPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedBuilding, setSelectedBuilding] = useState("All Buildings");

  const [buildings, setBuildings] = useState<string[]>(["All Buildings"]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  const [results, setResults] = useState<Item[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [recentItems, setRecentItems] = useState<Item[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

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

  // Load recently added items for idle state
  useEffect(() => {
    let cancelled = false;
    const loadRecent = async () => {
      try {
        const { data } = await supabase
          .from("items")
          .select("id, photo_url, description, category, building, date_found, status")
          .eq("campus_slug", campus)
          .eq("status", "available")
          .order("created_at", { ascending: false })
          .limit(6);
        if (!cancelled) setRecentItems((data ?? []) as Item[]);
      } catch { /* ignore */ }
    };
    loadRecent();
    return () => { cancelled = true; };
  }, [campus]);

  const runSearch = async (term: string, cat: string, bldg: string) => {
    if (!term.trim()) {
      setHasSearched(true);
      setResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      await supabase.from("searches").insert({ search_term: term.trim(), campus });
    } catch { /* ignore */ }

    try {
      let query = supabase
        .from("items")
        .select("id, photo_url, description, category, building, date_found")
        .eq("status", "available")
        .eq("campus_slug", campus);

      if (cat !== "All Categories") query = query.eq("category", cat);
      if (bldg !== "All Buildings") query = query.eq("building", bldg);

      if (term.trim()) {
        const keywords = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (keywords.length) {
          const escaped = keywords.map((k) =>
            k.replace(/%/g, "\\%").replace(/_/g, "\\_")
          );
          query = query.or(escaped.map((k) => `description.ilike.%${k}%`).join(","));
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

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runSearch(searchTerm, selectedCategory, selectedBuilding);
  };

  const handleQuickChip = (query: string) => {
    setSearchTerm(query);
    inputRef.current?.focus();
    runSearch(query, selectedCategory, selectedBuilding);
  };

  const clearFilters = () => {
    setSelectedCategory("All Categories");
    setSelectedBuilding("All Buildings");
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* ── Hero search section ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
          {campusName && (
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest text-center mb-2">
              {campusName}
            </p>
          )}
          <h1
            className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 text-center"
            style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
          >
            Lost something?
          </h1>
          <p className="text-sm text-slate-500 text-center mb-6">
            Search items found and turned in across campus
          </p>

          <form onSubmit={handleSearch} autoComplete="off">
            {/* Search row */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                {!searchTerm && (
                  <Search
                    className="absolute left-3.5 inset-y-0 my-auto text-slate-400 pointer-events-none"
                    style={{ width: "18px", height: "18px" }}
                  />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Describe your item — e.g. blue backpack"
                  className="ff-input"
                  style={{
                    paddingTop: "0.8125rem",
                    paddingBottom: "0.8125rem",
                    paddingLeft: searchTerm ? "1rem" : "2.75rem",
                    paddingRight: "1rem",
                  }}
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

            {/* Scope indicator + filter toggle */}
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors select-none"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 ml-0.5 transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
              </button>

              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" />
                <span>
                  {selectedBuilding === "All Buildings"
                    ? "Searching all buildings"
                    : `Searching: ${selectedBuilding}`}
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-1.5 flex items-center gap-0.5 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Result count — always visible after a search */}
            {hasSearched && !isSearching && (
              <p className="mt-2 text-xs text-slate-500">
                {results.length === 0
                  ? searchTerm.trim() === ""
                    ? "Enter a description to search"
                    : "No items matched your search"
                  : `${results.length} item${results.length !== 1 ? "s" : ""} found`}
              </p>
            )}

            {/* Filter panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category — grouped select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="ff-input text-sm appearance-none pr-8"
                      style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                    >
                      <option value="All Categories">All Categories</option>
                      {CATEGORY_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.items.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Building */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Building
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      disabled={buildingsLoading || buildings.length <= 1}
                      className="ff-input text-sm appearance-none pr-8 disabled:opacity-60"
                      style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                    >
                      {buildings.map((building) => (
                        <option key={building} value={building}>{building}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── Results / idle area ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">

        {/* Loading */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Searching…</p>
          </div>
        )}

        {/* No-results state */}
        {!isSearching && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
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
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700">No items found</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  No match for <span className="font-medium text-slate-600">"{searchTerm}"</span>. Try different keywords or broader terms.
                </p>
                <button
                  onClick={() => { setSearchTerm(""); setHasSearched(false); inputRef.current?.focus(); }}
                  className="mt-4 text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors"
                >
                  Clear search
                </button>
                <p className="text-xs text-slate-400 mt-4 max-w-xs">
                  Not seeing your item? New items are logged daily — check back soon or visit the lost &amp; found desk directly.
                </p>
              </>
            )}
          </div>
        )}

        {/* Results grid */}
        {!isSearching && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onViewItem(item as Item)}
                    className="text-left bg-white rounded-xl border border-slate-200 overflow-hidden group transition-all duration-150 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                  >
                    <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100 relative">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.description}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 gap-1.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                      )}
                      {item.category && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-700 border border-slate-200/80 backdrop-blur-sm leading-tight">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5">
                      <p className="text-[15px] font-medium text-slate-900 leading-snug line-clamp-2 mb-1.5">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 truncate">{item.building}</span>
                      </div>
                    </div>
                  </button>
              ))}
            </div>
            {/* Not seeing your item — shown when results are sparse or any search */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Not seeing your item?{" "}
                <span className="text-slate-500">New items are logged daily — check back soon or visit the lost &amp; found desk directly.</span>
              </p>
            </div>
          </>
        )}

        {/* ── Pre-search idle state ── */}
        {!isSearching && !hasSearched && (
          <div>
            {/* Recently found items */}
            {recentItems.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Recently found
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recentItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onViewItem(item as Item)}
                        className="text-left bg-white rounded-xl border border-slate-200 overflow-hidden group transition-all duration-150 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                      >
                        <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100 relative">
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                              </div>
                            </div>
                          )}
                          {item.category && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-700 border border-slate-200/80 leading-tight">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-[15px] font-medium text-slate-900 leading-snug line-clamp-2 mb-1">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 truncate">{item.building}</span>
                          </div>
                        </div>
                      </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick-launch chips */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Common items
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleQuickChip(chip.query)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-150"
                    style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}
                  >
                    <span role="img" aria-hidden="true" className="text-base leading-none">{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-white py-4 px-4 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 text-xs text-slate-400">
          <span>Powered by FoundFolio</span>
          <span>·</span>
          <a href="/about" className="hover:text-slate-600 transition-colors">About</a>
          <span>·</span>
          <a href="/about#universities" className="hover:text-slate-600 transition-colors">For universities</a>
        </div>
      </div>
    </div>
  );
}
