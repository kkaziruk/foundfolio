import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Package,
  CheckCircle,
  X,
  Download,
  Search,
  MoveRight,
} from "lucide-react";
import { supabase, Item } from "../lib/supabase";

interface ItemsListProps {
  refreshTrigger: number;
  campus: string; // campus_slug
  building: string; // "All Buildings" or a building name
}

type BuildingRow = { id: string; name: string };

const ITEMS_PER_PAGE = 50;

export default function ItemsList({ refreshTrigger, campus, building }: ItemsListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  // Export modal
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Buildings (loaded from DB)
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // Move modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetItem, setMoveTargetItem] = useState<Item | null>(null);
  const [moveBuildingMode, setMoveBuildingMode] = useState<"select" | "custom">("select");
  const [moveSelectedBuilding, setMoveSelectedBuilding] = useState<string>("");
  const [moveCustomBuilding, setMoveCustomBuilding] = useState<string>("NDPD");
  const [moveNewLocation, setMoveNewLocation] = useState<string>("");
  const [moveAppendNote, setMoveAppendNote] = useState<boolean>(true);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, campus, building, debouncedSearchTerm]);

  useEffect(() => {
    loadBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus]);

  const campusDisplay = useMemo(() => {
    const labels: Record<string, string> = {
      nd: "Notre Dame",
      smc: "Saint Mary's",
      hc: "Holy Cross",
    };
    return labels[campus] || campus.toUpperCase();
  }, [campus]);

  const loadBuildings = async () => {
    if (!campus) return;
    setBuildingsLoading(true);
    try {
      const { data, error } = await supabase
        .from("buildings")
        .select("id,name")
        .eq("campus_slug", campus)
        .order("name");

      if (error) throw error;
      setBuildings((data ?? []) as BuildingRow[]);
    } catch (e) {
      console.error("Failed to load buildings:", e);
    } finally {
      setBuildingsLoading(false);
    }
  };

  const loadItems = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setItems([]);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const offset = reset ? 0 : items.length;

    let query = supabase
      .from("items")
      .select("*", { count: "exact" })
      .eq("campus_slug", campus);

    if (building !== "All Buildings") query = query.eq("building", building);

    if (debouncedSearchTerm) {
      // commas break Supabase .or filters sometimes; strip them
      const term = debouncedSearchTerm.replace(/,/g, " ");
      query = query.or(
        `description.ilike.%${term}%,category.ilike.%${term}%,building.ilike.%${term}%,specific_location.ilike.%${term}%,additional_notes.ilike.%${term}%`
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) console.error("Load items error:", error);
    const newItems = (data ?? []) as Item[];

    if (reset) setItems(newItems);
    else setItems((prev) => [...prev, ...newItems]);

    setHasMore(newItems.length === ITEMS_PER_PAGE && (count || 0) > offset + ITEMS_PER_PAGE);
    setLoading(false);
    setLoadingMore(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ===== Claim flow =====
  const openClaimModal = (item: Item) => {
    setSelectedItem(item);
    setOwnerName("");
    setOwnerEmail("");
    setShowClaimModal(true);
  };

  const closeClaimModal = () => {
    setShowClaimModal(false);
    setSelectedItem(null);
    setOwnerName("");
    setOwnerEmail("");
    setIsClaiming(false);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsClaiming(true);
    try {
      const { error: insErr } = await supabase.from("pickups").insert({
        item_id: selectedItem.id,
        owner_name: ownerName,
        owner_email: ownerEmail,
        campus_slug: selectedItem.campus_slug,
      });
      if (insErr) throw insErr;

      const { error: updErr } = await supabase
        .from("items")
        .update({ status: "picked_up" })
        .eq("id", selectedItem.id);
      if (updErr) throw updErr;

      setItems((prev) =>
        prev.map((it) => (it.id === selectedItem.id ? { ...it, status: "picked_up" } : it))
      );

      closeClaimModal();
      await loadItems(true);
    } catch (err) {
      console.error(err);
      alert("Failed to mark as claimed.");
    } finally {
      setIsClaiming(false);
    }
  };

  // ===== Export flow =====
  const handleExport = async () => {
  setExporting(true);
  setShowExportModal(false);

  try {
    const params = new URLSearchParams();
    params.set("campus_slug", campus);
    if (building !== "All Buildings") params.set("building", building);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-items?${params.toString()}`;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Not signed in");

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const j = await res.json();
        throw new Error(j.error || "Export failed");
      } else {
        const t = await res.text();
        throw new Error(t || "Export failed");
      }
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    const buildingSlug =
      building === "All Buildings" ? "all-buildings" : building.toLowerCase().replace(/\s+/g, "-");

    link.download = `lost-and-found-${campus}-${buildingSlug}-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert(`Failed to export: ${err instanceof Error ? err.message : "Try again."}`);
  } finally {
    setExporting(false);
  }
};

  // ===== Move flow =====
  const openMoveModal = (item: Item) => {
    setMoveTargetItem(item);

    const names = buildings.map((b) => b.name);
    const defaultName =
      names.includes(item.building) ? item.building : names[0] ?? item.building;

    setMoveBuildingMode("select");
    setMoveSelectedBuilding(defaultName);
    setMoveCustomBuilding("NDPD");
    setMoveNewLocation(item.specific_location || "");
    setMoveAppendNote(true);
    setShowMoveModal(true);
  };

  const closeMoveModal = () => {
    setShowMoveModal(false);
    setMoveTargetItem(null);
    setMoveSubmitting(false);
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTargetItem) return;

    const destinationBuilding =
      moveBuildingMode === "custom" ? moveCustomBuilding.trim() : moveSelectedBuilding.trim();
    const newLocation = moveNewLocation.trim();

    if (!destinationBuilding || !newLocation) {
      alert("Destination building and specific location are required.");
      return;
    }

    setMoveSubmitting(true);

    try {
      let nextNotes = moveTargetItem.additional_notes ?? "";
      if (moveAppendNote) {
        const stamp = new Date().toLocaleString();
        const noteLine = `Moved to ${destinationBuilding} (${newLocation}) on ${stamp}.`;
        nextNotes = nextNotes ? `${nextNotes}\n${noteLine}` : noteLine;
      }

      const { error } = await supabase
        .from("items")
        .update({
          building: destinationBuilding,
          specific_location: newLocation,
          additional_notes: nextNotes || null,
        })
        .eq("id", moveTargetItem.id);

      if (error) throw error;

      // Instant UI update + auto-remove if it no longer matches building filter
      setItems((prev) =>
        prev.flatMap((it) => {
          if (it.id !== moveTargetItem.id) return [it];
          if (building !== "All Buildings" && destinationBuilding !== building) return [];
          return [
            {
              ...it,
              building: destinationBuilding,
              specific_location: newLocation,
              additional_notes: nextNotes || null,
            },
          ];
        })
      );

      closeMoveModal();

      // Hard refresh from DB for full consistency (pagination/count/other staff updates)
      await loadItems(true);
    } catch (err) {
      console.error(err);
      alert("Failed to move item.");
    } finally {
      setMoveSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md">
      {/* Header & Search */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All Items</h2>
            <p className="text-slate-600 mt-1">
              {items.length} loaded{" "}
              <span className="text-slate-400">·</span>{" "}
              <span className="text-slate-500">{campusDisplay}</span>
              {building !== "All Buildings" && (
                <>
                  {" "}
                  <span className="text-slate-400">·</span>{" "}
                  <span className="text-slate-500">{building}</span>
                </>
              )}
            </p>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? "Exporting..." : "Export Excel"}</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, category, building, location, notes..."
            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Empty */}
      {items.length === 0 ? (
        <div className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm ? "No items match your search" : "No items found"}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            {searchTerm ? "Try different keywords." : "Add items to see them here."}
          </p>
        </div>
      ) : (
        <>
          {/* List */}
          <div className="divide-y divide-slate-200">
            {items.map((item) => {
              const isSensitive = (item as any).sensitive === true; // supports your new column even if TS type isn't updated yet
              return (
                <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {isSensitive ? (
                        <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                          <Package className="w-8 h-8 text-amber-400" />
                        </div>
                      ) : item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.description}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-lg text-slate-900 truncate">
                            {item.description}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.status === "available" ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#D1FAE5] text-[#10B981] rounded-full text-sm font-medium">
                                <Package className="w-3 h-3" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-[#374151] rounded-full text-sm font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Picked Up
                              </span>
                            )}

                            <span className="px-3 py-1 bg-[#DBEAFE] text-[#3B82F6] rounded-full text-sm font-medium">
                              {item.category}
                            </span>

                            {isSensitive && (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                                Sensitive (photo hidden)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => openMoveModal(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Move Item"
                          >
                            <MoveRight className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Building:</span> {item.building}
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium">Location:</span> {item.specific_location}
                        </div>
                        <div>
                          <span className="font-medium">Found:</span> {formatDate(item.date_found)}
                        </div>
                      </div>

                      {item.status === "available" && (
                        <button
                          onClick={() => openClaimModal(item)}
                          className="mt-4 text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                        >
                          Mark as Claimed
                        </button>
                      )}

                      {item.additional_notes && (
                        <p className="mt-3 text-sm text-slate-600 whitespace-pre-line italic">
                          “{item.additional_notes}”
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="p-6 text-center border-t border-slate-200">
              <button
                onClick={() => loadItems(false)}
                disabled={loadingMore}
                className="px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? "Loading..." : `Load More (${items.length} loaded)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Move Modal */}
      {showMoveModal && moveTargetItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MoveRight className="text-blue-600" /> Move Item
              </h3>
              <button onClick={closeMoveModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-1">Item:</p>
              <p className="font-semibold text-slate-900">{moveTargetItem.description}</p>
              <p className="text-xs text-slate-600 mt-1">
                Current: {moveTargetItem.building} · {moveTargetItem.specific_location}
              </p>
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMoveBuildingMode("select")}
                  className={`flex-1 py-2 text-sm rounded-lg border ${
                    moveBuildingMode === "select"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  Select Building
                </button>
                <button
                  type="button"
                  onClick={() => setMoveBuildingMode("custom")}
                  className={`flex-1 py-2 text-sm rounded-lg border ${
                    moveBuildingMode === "custom"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  Custom Building
                </button>
              </div>

              {moveBuildingMode === "select" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Destination building
                  </label>
                  <select
                    value={moveSelectedBuilding}
                    onChange={(e) => setMoveSelectedBuilding(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    disabled={buildingsLoading}
                  >
                    {buildings.length === 0 ? (
                      <option value={moveTargetItem.building}>
                        {moveTargetItem.building} (current)
                      </option>
                    ) : (
                      buildings.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                  {buildingsLoading && (
                    <p className="text-xs text-slate-500 mt-2">Loading buildings…</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Destination building
                  </label>
                  <input
                    type="text"
                    value={moveCustomBuilding}
                    onChange={(e) => setMoveCustomBuilding(e.target.value)}
                    placeholder="e.g. NDPD, Warehouse"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Specific location (required)
                </label>
                <input
                  type="text"
                  value={moveNewLocation}
                  onChange={(e) => setMoveNewLocation(e.target.value)}
                  placeholder="e.g. Front desk drawer"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={moveAppendNote}
                  onChange={(e) => setMoveAppendNote(e.target.checked)}
                />
                Add automatic move note to history
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeMoveModal}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={moveSubmitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {moveSubmitting ? "Moving..." : "Confirm Move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Mark Item as Claimed</h3>
              <button onClick={closeClaimModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-1">Item:</p>
                <p className="font-semibold text-slate-900">{selectedItem.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Owner Name *</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  placeholder="Enter owner's full name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Owner Email *</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                  placeholder="Enter owner's email"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeClaimModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaiming}
                  className="flex-1 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? "Processing..." : "Confirm Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Export Items to Excel</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-600 mb-4">
                This exports <span className="font-medium">{campusDisplay}</span>{" "}
                {building === "All Buildings" ? "items for all buildings." : `items for ${building}.`}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex-1 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
