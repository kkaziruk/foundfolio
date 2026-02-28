import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  CalendarDays,
  Tag,
  X,
  Sparkles,
  Clock3,
  BookmarkPlus,
} from 'lucide-react';
import { supabase, StudentSafeItem } from '../lib/supabase';
import { trackSearchExecuted } from '../lib/analytics';

interface SearchPageProps {
  campus: string;
  onViewItem: (item: StudentSafeItem) => void;
}

type BuildingNameRow = { name: string };

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
  'Other',
];

const COLORS = [
  'All Colors',
  'Black',
  'White',
  'Gray',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Orange',
  'Pink',
  'Purple',
  'Brown',
  'Beige',
  'Gold',
  'Silver',
  'Multicolor',
];

const STUDENT_ITEM_SELECT =
  'id,description,category,color,building,specific_location,date_found,photo_url,status,campus_slug';

const WORD_CHARS = /[^a-z0-9\s]/g;

const normalize = (value: string) => value.toLowerCase().replace(WORD_CHARS, ' ').replace(/\s+/g, ' ').trim();

const hasKeyword = (source: string, keyword: string) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withBoundaries = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
  return withBoundaries.test(source);
};

const formatFoundDate = (dateValue: string) => {
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return dateValue;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dt);
};

function ResultCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-4/5 rounded bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-9 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function SearchPage({ campus, onViewItem }: SearchPageProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchInput, setDebouncedSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedColor, setSelectedColor] = useState('All Colors');
  const [selectedBuilding, setSelectedBuilding] = useState('All Buildings');

  const [buildings, setBuildings] = useState<string[]>(['All Buildings']);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  const [results, setResults] = useState<StudentSafeItem[]>([]);
  const [hasSearched, setHasSearched] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<
    Array<{ name: string; category: string; color: string; building: string }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const campusTitle = useMemo(() => {
    if (campus === 'nd') return 'ND Lost & Found';
    if (campus === 'smc') return 'SMC Lost & Found';
    if (campus === 'hc') return 'HC Lost & Found';
    return 'Campus Lost & Found';
  }, [campus]);

  const canFilterByBuilding = buildings.length > 1;
  const storagePrefix = `ff_search_${campus}`;

  useEffect(() => {
    try {
      const rawRecent = localStorage.getItem(`${storagePrefix}_recent`);
      const rawFilters = localStorage.getItem(`${storagePrefix}_saved_filters`);
      if (rawRecent) setRecentSearches(JSON.parse(rawRecent) as string[]);
      if (rawFilters) {
        setSavedFilters(
          JSON.parse(rawFilters) as Array<{ name: string; category: string; color: string; building: string }>
        );
      }
    } catch (err) {
      console.error('Failed to read search preferences:', err);
    }
  }, [storagePrefix]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchInput(searchInput), 220);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

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

        const rows = (data ?? []) as BuildingNameRow[];
        const names = rows.map((row) => row.name).filter((name): name is string => Boolean(name));

        if (!cancelled) {
          setBuildings(['All Buildings', ...names]);
          setSelectedBuilding((prev) => {
            if (prev === 'All Buildings') return prev;
            return names.includes(prev) ? prev : 'All Buildings';
          });
        }
      } catch (err) {
        console.error('Failed to load buildings:', err);
        if (!cancelled) {
          setBuildings(['All Buildings']);
          setErrorMessage('Building filters are temporarily unavailable.');
        }
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };

    loadBuildings();
    return () => {
      cancelled = true;
    };
  }, [campus]);

  const runSearch = async (trackSubmission: boolean) => {
    const trimmedInput = debouncedSearchInput.trim();
    const keywords = normalize(trimmedInput).split(' ').filter(Boolean);

    setIsSearching(true);
    setErrorMessage('');

    if (trackSubmission) {
      if (trimmedInput) {
        const { error } = await supabase.from('searches').insert({
          search_term: trimmedInput,
          campus_slug: campus,
        });

        if (error) {
          console.error('Failed to persist search log:', error);
        }

        const nextRecent = [trimmedInput, ...recentSearches.filter((entry) => entry !== trimmedInput)].slice(0, 6);
        setRecentSearches(nextRecent);
        localStorage.setItem(`${storagePrefix}_recent`, JSON.stringify(nextRecent));
      }
    }

    try {
      let query = supabase
        .from('items')
        .select(STUDENT_ITEM_SELECT)
        .eq('status', 'available')
        .eq('campus_slug', campus);

      if (selectedCategory !== 'All Categories') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedColor !== 'All Colors') {
        query = query.or(`color.ilike.${selectedColor},description.ilike.%${selectedColor}%`);
      }

      if (selectedBuilding !== 'All Buildings') {
        query = query.eq('building', selectedBuilding);
      }

      const { data, error } = await query.order('date_found', { ascending: false }).limit(200);
      if (error) throw error;

      const safeItems = (data ?? []) as StudentSafeItem[];

      if (!keywords.length) {
        setResults(safeItems);
        return;
      }

      const filtered = safeItems.filter((item) => {
        const source = normalize(
          [item.description, item.category, item.color ?? '', item.specific_location].join(' ')
        );
        return keywords.every((keyword) => hasKeyword(source, keyword) || source.includes(keyword));
      });

      setResults(filtered);
      if (trackSubmission) {
        trackSearchExecuted({
          campus,
          query: trimmedInput,
          category: selectedCategory,
          color: selectedColor,
          building: selectedBuilding,
          results_count: filtered.length,
        });
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setErrorMessage('Search is temporarily unavailable. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    localStorage.setItem(`${storagePrefix}_has_searched`, "1");
    await runSearch(true);
  };

  useEffect(() => {
    if (!hasSearched) return;
    runSearch(false).catch((err) => {
      console.error('Search refresh failed:', err);
    });
  }, [hasSearched, debouncedSearchInput, selectedCategory, selectedColor, selectedBuilding]);

  const activeFilters = [
    selectedCategory !== 'All Categories' ? selectedCategory : null,
    selectedColor !== 'All Colors' ? selectedColor : null,
    selectedBuilding !== 'All Buildings' ? selectedBuilding : null,
  ].filter((value): value is string => Boolean(value));

  const clearFilters = () => {
    setSelectedCategory('All Categories');
    setSelectedColor('All Colors');
    setSelectedBuilding('All Buildings');
  };

  const suggestionOptions = useMemo(() => {
    const normalizedInput = normalize(searchInput);
    if (!normalizedInput) return [];

    const recentMatches = recentSearches.filter((entry) => normalize(entry).includes(normalizedInput));
    const categoryMatches = CATEGORIES.filter(
      (entry) => entry !== 'All Categories' && normalize(entry).includes(normalizedInput)
    ).map((entry) => `Category: ${entry}`);
    const buildingMatches = buildings
      .filter((entry) => entry !== 'All Buildings' && normalize(entry).includes(normalizedInput))
      .map((entry) => `Building: ${entry}`);

    return [...recentMatches, ...categoryMatches, ...buildingMatches].slice(0, 6);
  }, [searchInput, recentSearches, buildings]);

  const applySuggestion = (value: string) => {
    if (value.startsWith('Category: ')) {
      setSelectedCategory(value.replace('Category: ', ''));
      setShowFilters(true);
      setShowSuggestions(false);
      return;
    }
    if (value.startsWith('Building: ')) {
      setSelectedBuilding(value.replace('Building: ', ''));
      setShowFilters(true);
      setShowSuggestions(false);
      return;
    }
    setSearchInput(value);
    setShowSuggestions(false);
    setHasSearched(true);
  };

  const saveCurrentFilter = () => {
    const active = {
      name: `Set ${savedFilters.length + 1}`,
      category: selectedCategory,
      color: selectedColor,
      building: selectedBuilding,
    };
    const next = [active, ...savedFilters].slice(0, 5);
    setSavedFilters(next);
    localStorage.setItem(`${storagePrefix}_saved_filters`, JSON.stringify(next));
  };

  const applySavedFilter = (index: number) => {
    const filter = savedFilters[index];
    if (!filter) return;
    setSelectedCategory(filter.category);
    setSelectedColor(filter.color);
    setSelectedBuilding(filter.building);
    setHasSearched(true);
  };

  const showNoResults = !isSearching && hasSearched && results.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{campusTitle}</h1>
          <p className="text-base md:text-lg text-slate-600">Find your lost item quickly across campus.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchInput}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="Search by item name, details, or location"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                />
                {showSuggestions && suggestionOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-xl border border-slate-200 bg-white shadow-lg">
                    {suggestionOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={() => applySuggestion(option)}
                        className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-3 bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] transition-colors font-semibold disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {selectedCategory !== 'All Categories' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All Categories')}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                >
                  Category: {selectedCategory}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {selectedColor !== 'All Colors' && (
                <button
                  type="button"
                  onClick={() => setSelectedColor('All Colors')}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                >
                  Color: {selectedColor}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {selectedBuilding !== 'All Buildings' && (
                <button
                  type="button"
                  onClick={() => setSelectedBuilding('All Buildings')}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                >
                  Building: {selectedBuilding}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  Clear all
                </button>
              )}

              <button
                type="button"
                onClick={saveCurrentFilter}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Save filters
              </button>
            </div>

            {savedFilters.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Saved</span>
                {savedFilters.map((filter, index) => (
                  <button
                    key={`${filter.name}-${index}`}
                    type="button"
                    onClick={() => applySavedFilter(index)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {filter.category === 'All Categories' ? 'Any category' : filter.category}
                    {' · '}
                    {filter.color === 'All Colors' ? 'Any color' : filter.color}
                  </button>
                ))}
              </div>
            )}

            {recentSearches.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Recent
                </span>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchInput(term);
                      setHasSearched(true);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}

            {showFilters && (
              <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Color</label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  >
                    {COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>

                {canFilterByBuilding && (
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">Building</label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      disabled={buildingsLoading}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:opacity-70"
                    >
                      {buildings.map((buildingName) => (
                        <option key={buildingName} value={buildingName}>
                          {buildingName}
                        </option>
                      ))}
                    </select>
                    {buildingsLoading && <p className="text-xs text-slate-500 mt-2">Loading buildings…</p>}
                  </div>
                )}
              </div>
            )}
          </form>

          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
          )}

          {!isSearching && hasSearched && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg md:text-xl font-semibold text-black">
                {results.length} {results.length === 1 ? 'item' : 'items'} found
              </h2>
              <p className="text-sm text-slate-600">
                {activeFilters.length > 0
                  ? `Active filters: ${activeFilters.join(' · ')}`
                  : 'No filters applied'}
              </p>
            </div>
          )}

          {isSearching && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResultCardSkeleton />
              <ResultCardSkeleton />
              <ResultCardSkeleton />
              <ResultCardSkeleton />
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

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-black leading-6 line-clamp-2">{item.description}</h3>
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Available
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <Tag className="w-3.5 h-3.5" />
                        {item.category}
                      </span>
                      {item.color && (
                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                          {item.color}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-[#374151]">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="font-medium">{item.building}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-500" />
                        <span>Logged {formatFoundDate(item.date_found)}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onViewItem(item);
                      }}
                      className="w-full rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors"
                    >
                      View Details to Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNoResults && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-700 text-lg">No matching items found</p>
              <p className="text-slate-500 text-sm mt-2 px-6">
                Try removing one filter, searching with broader words, or checking a nearby building.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 px-4">
                {buildings
                  .filter((entry) => entry !== 'All Buildings' && entry !== selectedBuilding)
                  .slice(0, 3)
                  .map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setSelectedBuilding(entry)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Try {entry}
                    </button>
                  ))}
                {CATEGORIES.filter((entry) => entry !== 'All Categories' && entry !== selectedCategory)
                  .slice(0, 2)
                  .map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setSelectedCategory(entry)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Category: {entry}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
