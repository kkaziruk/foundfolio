// src/pages/SearchPage.tsx
import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { supabase, Item } from '../lib/supabase';

interface SearchPageProps {
  campus: string;
  onViewItem: (item: Item) => void;
}

const CATEGORIES = [
  'All Categories',
  'Water Bottle',
  'Jacket/Coat',
  'Sweatshirt/Hoodie',
  'Hat/Beanie',
  'Scarf/Gloves',
  'Shoes',
  'Backpack',
  'Purse/Handbag',
  'Wallet',
  'Keys',
  'ID Card/License',
  'Credit/Debit Card',
  'Phone',
  'Laptop',
  'Tablet/iPad',
  'Headphones/Earbuds',
  'Charger/Cable',
  'Calculator',
  'Watch',
  'Jewelry',
  'Sunglasses',
  'Glasses/Contacts',
  'Umbrella',
  'Textbook',
  'Notebook',
  'Planner/Binder',
  'Lunchbox/Tupperware',
  'Sports Equipment',
  'Musical Instrument',
  'USB Drive',
  'Medication',
  'Cosmetics/Makeup',
  'Hair Accessories',
  'Bike Lock',
  'Reusable Bag',
  'Other'
];

export default function SearchPage({ campus, onViewItem }: SearchPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedBuilding, setSelectedBuilding] = useState('All Buildings');

  const [buildings, setBuildings] = useState<string[]>(['All Buildings']);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  const [results, setResults] = useState<Item[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Load buildings from DB (no hardcoded list)
  useEffect(() => {
    let cancelled = false;

    const loadBuildings = async () => {
      setBuildingsLoading(true);
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('name')
          .eq('campus_slug', campus)
          .order('name');

        if (error) throw error;

        const names = (data ?? []).map((b: any) => b.name).filter(Boolean);

        if (!cancelled) {
          setBuildings(['All Buildings', ...names]);
          // keep selection if still valid; otherwise reset
          setSelectedBuilding((prev) => (prev === 'All Buildings' || names.includes(prev) ? prev : 'All Buildings'));
        }
      } catch (err) {
        console.error('Failed to load buildings:', err);
        if (!cancelled) setBuildings(['All Buildings']);
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

    // log searches (best-effort)
    if (searchTerm.trim()) {
      try {
        await supabase.from('searches').insert({
          search_term: searchTerm.trim(),
          campus: campus
        });
      } catch (err) {
        console.warn('searches insert failed (ignored):', err);
      }
    }

    try {
      let query = supabase
        .from('items')
        .select('*')
        .eq('status', 'available')
        .eq('campus_slug', campus);

      if (selectedCategory !== 'All Categories') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedBuilding !== 'All Buildings') {
        query = query.eq('building', selectedBuilding);
      }

      // ✅ FIX: Supabase .or() expects a single string like:
      // description.ilike.%foo%,description.ilike.%bar%
      if (searchTerm.trim()) {
        const keywords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

        if (keywords.length) {
          const escaped = keywords.map((k) => k.replace(/%/g, '\\%').replace(/_/g, '\\_'));
          const orConditions = escaped.map((k) => `description.ilike.%${k}%`).join(',');
          query = query.or(orConditions);
        }
      }

      const { data, error } = await query
        .order('date_found', { ascending: false })
        .limit(100);

      if (error) throw error;

      setResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
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
            {campus === 'nd' && 'ND Lost & Found'}
            {campus === 'smc' && 'SMC Lost & Found'}
            {campus === 'hc' && 'HC Lost & Found'}
          </h1>
          <p className="text-lg text-slate-600">Search campus for your lost item</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Describe your lost item"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-3 bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
                aria-label="Search"
              >
                {isSearching ? <span>Searching...</span> : <Search className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Advanced Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Category</label>
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
                  <label className="block text-sm font-medium text-[#374151] mb-2">Building</label>
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
                  {buildingsLoading && <p className="text-xs text-slate-500 mt-2">Loading buildings…</p>}
                </div>
              </div>
            )}
          </form>

          {isSearching && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 text-lg">Searching...</p>
            </div>
          )}

          {!isSearching && hasSearched && results.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-black mb-4">
                {results.length} {results.length === 1 ? 'item' : 'items'} found
              </h2>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onViewItem(item)}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                >
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.description} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-[#F9FAFB] to-slate-200 flex items-center justify-center">
                      <Search className="w-16 h-16 text-slate-400" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-black mb-2 line-clamp-2">{item.description}</h3>
                    <div className="space-y-1 text-sm text-[#374151]">
                      <p>
                        <span className="font-medium">Category:</span> {item.category}
                      </p>
                      <p>
                        <span className="font-medium">Building:</span> {item.building}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">Item not found in the database</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
