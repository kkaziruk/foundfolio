// src/pages/SearchPage.tsx
import React, { useEffect, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { supabase, Item } from "../lib/supabase";

interface SearchPageProps {
  campus: string;
  onViewItem: (item: Item) => void;
}

const CATEGORIES = [
  "All Categories",

  // Clothing & Wearables
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

  // Bags & Carried Items
  "Backpack",
  "Purse/Handbag",
  "Reusable Bag",
  "Lunchbox/Tupperware",

  // Wallet & Personal Essentials
  "Wallet",
  "Keys",
  "ID Card/License",
  "Credit/Debit Card",
  "Passport",
  "Bike Lock",

  // Electronics
  "Phone",
  "Laptop",
  "Tablet/iPad",
  "Headphones/Earbuds",
  "Charger/Cable",
  "USB Drive",
  "Calculator",
  "Camera",
  "Gaming Device",

  // Academic Items
  "Textbook",
  "Notebook",
  "Planner/Binder",
  "Folder",
  "Writing Utensils",

  // Health & Personal Care
  "Medication",
  "Medical Device",
  "Cosmetics/Makeup",
  "Hair Accessories",
  "Water Bottle",

  // Sports & Activities
  "Sports Equipment",
  "Musical Instrument",
  "Umbrella",

  // Misc
  "Other",
];

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

        const names = (data ?? [])
          .map((b: any) => b.name)
          .filter(Boolean);

        if (!cancelled) {
          setBuildings(["All Buildings", ...names]);
          setSelectedBuilding((prev) =>
            prev === "All Buildings" || names.includes(prev)
              ? prev
              : "All Buildings"
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
    return () => {
      cancelled = true;
    };
  }, [campus]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSearching(true);
    setHasSearched(true);

    if (searchTerm.trim()) {
      try {
        await supabase.from("searches").insert({
          search_term: searchTerm.trim(),
          campus: campus,
        });
      } catch {
        // Ignore logging failures
      }
    }

    try {
      // 🔐 Student-safe query (no additional_notes returned)
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
        const keywords = searchTerm
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);

        if (keywords.length) {
          const escaped = keywords.map((k) =>
            k.replace(/%/g, "\\%").replace(/_/g, "\\_")
          );
          const orConditions = escaped
            .map((k) => `description.ilike.%${k}%`)
            .join(",");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            {campus === "nd" && "ND Lost & Found"}
            {campus === "smc" && "SMC Lost & Found"}
            {campus === "hc" && "HC Lost & Found"}
          </h1>
          <p className="text-lg text-slate-600">
            Search campus for your lost item
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Describe your lost item"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-3 bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] transition-colors font-medium disabled:opacity-50"
              >
                {isSearching ? "Searching..." : <Search className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Advanced Filters</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>

            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Building
                  </label>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => setSelectedBuilding(e.target.value)}
                    disabled={buildingsLoading || buildings.length <= 1}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:opacity-70"
                  >
                    {buildings.map((building) => (
                      <option key={building} value={building}>
                        {building}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
