import React, { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Package,
  CheckCircle,
  X,
  Download,
  Search,
  MoveRight,
} from "lucide-react";
import { BRAND } from "../lib/brand";
import { supabase, Item } from "../lib/supabase";
import { formatLoggedAt } from "../lib/dates";
import { getStaffIntent } from "../lib/authIntent";

interface ItemsListProps {
  refreshTrigger: number;
  campus: string; // campus_slug
  building: string; // "All Buildings" or a building name
}

type BuildingRow = { id: string; name: string };

const ITEMS_PER_PAGE = 50;

const intent = getStaffIntent();
const canExport = intent?.mode === "campus_admin" || intent?.mode === "ndpd";

// Helper to display friendly names for system buildings
function displayBuildingName(campus: string, building: string) {
  const c = (campus || "").toLowerCase();
  const b = (building || "").trim();
  if (c === "nd" && b === "NDPD") return "Hammes Mowbray Hall (NDPD)";
  return b;
}

export default function ItemsList({ refreshTrigger, campus, building }: ItemsListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Claim modal (kept)
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
  const [moveMode, setMoveMode] = useState<"ndpd" | "other">("ndpd");
  const [moveSelectedBuilding, setMoveSelectedBuilding] = useState<string>("");
  const [moveNewLocation, setMoveNewLocation] = useState<string>("");
  const [moveAppendNote, setMoveAppendNote] = useState<boolean>(true);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allVisibleIds = useMemo(() => items.map((it) => it.id), [items]);

  const allSelected = useMemo(() => {
    return allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  }, [allVisibleIds, selectedIds]);

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !allSelected;
      if (shouldSelectAll) allVisibleIds.forEach((id) => next.add(id));
      else allVisibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const set = selectedIds;
    return items.filter((it) => set.has(it.id));
  }, [items, selectedIds]);

  const moveItems = useMemo(() => {
    return selectedItems.length > 0 ? selectedItems : moveTargetItem ? [moveTargetItem] : [];
  }, [selectedItems, moveTargetItem]);

  const isBulkMove = selectedItems.length > 0;

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
      // Hide system buildings (NDPD) from the general select list
      const { data, error } = await supabase
        .from("buildings")
        .select("id,name")
        .eq("campus_slug", campus)
        .eq("is_system", false)
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
      clearSelection();
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
    if (!error) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = confirm(`Delete ${ids.length} item(s)? This cannot be undone.`);
    if (!ok) return;

    const { error } = await supabase.from("items").delete().in("id", ids);
    if (error) {
      console.error(error);
      alert("Failed to delete selected items.");
      return;
    }

    setItems((prev) => prev.filter((it) => !selectedIds.has(it.id)));
    clearSelection();
  };

  // ===== Claim flow (kept) =====
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
    if (!canExport) {
      alert("You do not have permission to export.");
      return;
    }
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
    // If there is an active selection and the clicked item is NOT in it,
    // treat this as a single-item move and clear selection (avoids ambiguity).
    if (selectedIds.size > 0 && !selectedIds.has(item.id)) {
      clearSelection();
    }

    setMoveTargetItem(item);
    setMoveMode("ndpd");

    const names = buildings.map((b) => b.name);
    const defaultName = names.includes(item.building) ? item.building : names[0] ?? "";
    setMoveSelectedBuilding(defaultName);

    setMoveNewLocation(""); // blank => don't overwrite in bulk; for single you can type
    setMoveAppendNote(true);
    setShowMoveModal(true);
  };

  const openBulkMoveModal = () => {
    if (selectedItems.length === 0) return;

    setMoveTargetItem(null);
    setMoveMode("ndpd");

    const names = buildings.map((b) => b.name);
    setMoveSelectedBuilding(names[0] ?? "");

    setMoveNewLocation(""); // blank means preserve per-item location
    setMoveAppendNote(true);
    setShowMoveModal(true);
  };

  const closeMoveModal = () => {
    setShowMoveModal(false);
    setMoveTargetItem(null);
    setMoveSubmitting(false);

    setMoveMode("ndpd");
    setMoveSelectedBuilding("");
    setMoveNewLocation("");
    setMoveAppendNote(true);
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targets = moveItems;
    if (targets.length === 0) return;

    const destinationBuilding = moveMode === "ndpd" ? "NDPD" : moveSelectedBuilding.trim();
    const newLocation = moveNewLocation.trim(); // if blank, keep existing per item

    if (moveMode === "other" && !destinationBuilding) {
      alert("Destination building is required.");
      return;
    }

    setMoveSubmitting(true);

    try {
      const stamp = new Date().toLocaleString();
      const friendlyDest = displayBuildingName(campus, destinationBuilding);

      const updates = targets.map((it) => {
        let nextNotes = it.additional_notes ?? "";

        if (moveAppendNote) {
          const locForNote = newLocation || it.specific_location || "";
          const noteLine = `Moved to ${friendlyDest}${locForNote ? ` (${locForNote})` : ""} on ${stamp}.`;
          nextNotes = nextNotes ? `${nextNotes}\n${noteLine}` : noteLine;
        }

        return {
          id: it.id,
          building: destinationBuilding,
          specific_location: newLocation ? newLocation : it.specific_location,
          additional_notes: nextNotes || null,
        };
      });

      const { error } = await supabase.from("items").upsert(updates, { onConflict: "id" });
      if (error) throw error;

      setItems((prev) =>
        prev.flatMap((it) => {
          const upd = updates.find((u) => u.id === it.id);
          if (!upd) return [it];

          if (building !== "All Buildings" && upd.building !== building) return [];

          return [
            {
              ...it,
              building: upd.building,
              specific_location: upd.specific_location,
              additional_notes: upd.additional_notes,
            },
          ];
        })
      );

      closeMoveModal();

      if (selectedIds.size > 0) clearSelection();

      await loadItems(true);
    } catch (err) {
      console.error(err);
      alert("Failed to move item(s).");
    } finally {
      setMoveSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: BRAND.ink }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header & Search */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All Items</h2>
            <p className="text-slate-600 mt-1">
              {items.length} loaded <span className="text-slate-400">·</span>{" "}
              <span className="text-slate-500">{campusDisplay}</span>
              {building !== "All Buildings" && (
                <>
                  {" "}
                  <span className="text-slate-400">·</span>{" "}
                  <span className="text-slate-500">{displayBuildingName(campus, building)}</span>
                </>
              )}
            </p>
          </div>
          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND.ink }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.inkHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.ink)}
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? "Exporting..." : "Export CSV"}</span>
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, category, building, location, notes..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {/* Select all + counter */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4"
            />
            Select all (loaded)
          </label>

          {selectedCount > 0 && (
            <div className="text-sm font-semibold text-slate-700">{selectedCount} selected</div>
          )}
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
              const isSensitive = (item as any).sensitive === true;
              const isChecked = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="relative px-6 py-5 hover:bg-slate-50 transition-colors"
                >
                  {/* checkbox */}
                  <label className="absolute left-4 top-4 z-10 inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(item.id)}
                      className="h-4 w-4"
                    />
                  </label>

                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
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
                          <h3 className="font-semibold text-lg text-slate-900 leading-snug break-words line-clamp-2 sm:line-clamp-1">
                            {item.description}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.status === "available" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
                                <Package className="w-3.5 h-3.5" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-[#374151] rounded-full text-sm font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Picked Up
                              </span>
                            )}

                            <span
                              className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
                              style={{
                                backgroundColor: BRAND.sky,
                                borderColor: BRAND.skyBorder,
                                color: BRAND.ink,
                              }}
                            >
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
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            title={selectedCount > 0 && selectedIds.has(item.id) ? "Move selected" : "Move item"}
                          >
                            <MoveRight className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            title="Delete item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Building:</span>{" "}
                          {displayBuildingName(campus, item.building)}
                        </div>

                        <div>
                          <span className="font-medium">Location:</span> {item.specific_location}
                        </div>

                        <div>
                          <span className="font-medium">Logged:</span>{" "}
                          {formatLoggedAt((item as any).logged_at)}
                        </div>
                      </div>

                      {item.status === "available" && (
                        <button
                          onClick={() => openClaimModal(item)}
                          className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                          style={{ backgroundColor: BRAND.ink }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = BRAND.inkHover)}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = BRAND.ink)}
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
                className="rounded-xl px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND.ink }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.inkHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.ink)}
              >
                {loadingMore ? "Loading..." : `Load More (${items.length} loaded)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Sticky bulk action bar */}
      {selectedCount > 0 && (
        <div className="sticky bottom-3 z-30 mx-4 mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-900">
              {selectedCount} selected
              <button
                type="button"
                onClick={clearSelection}
                className="ml-3 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openBulkMoveModal}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-800"
              >
                Move
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-xl px-4 py-2 text-sm font-extrabold text-white"
                style={{ backgroundColor: BRAND.ink }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.inkHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.ink)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (moveTargetItem || isBulkMove) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MoveRight style={{ color: BRAND.accent }} />
                Move Item
              </h3>
              <button onClick={closeMoveModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-1">Item:</p>

              {isBulkMove ? (
                <>
                  <p className="font-semibold text-slate-900">{selectedItems.length} items selected</p>
                  <p className="text-xs text-slate-600 mt-1">
                    You’ll update building (and optionally location) for all selected items.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-900">{moveTargetItem?.description}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Current:{" "}
                    {moveTargetItem
                      ? `${displayBuildingName(campus, moveTargetItem.building)} · ${moveTargetItem.specific_location}`
                      : ""}
                  </p>
                </>
              )}
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-4">
              {/* Tabs */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setMoveMode("ndpd")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-extrabold transition ${
                    moveMode === "ndpd"
                      ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {displayBuildingName(campus, "NDPD")}
                </button>

                <button
                  type="button"
                  onClick={() => setMoveMode("other")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-extrabold transition ${
                    moveMode === "other"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Other building
                </button>
              </div>

              {/* Destination */}
              {moveMode === "ndpd" ? (
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 mb-2">
                    Destination building
                  </label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-semibold">
                    {displayBuildingName(campus, "NDPD")}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Default route for items transferred to campus police storage.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 mb-2">
                    Destination building
                  </label>
                  <select
                    value={moveSelectedBuilding}
                    onChange={(e) => setMoveSelectedBuilding(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                    disabled={buildingsLoading}
                  >
                    {buildings.length === 0 ? (
                      <option value="">{buildingsLoading ? "Loading…" : "No buildings found"}</option>
                    ) : (
                      buildings.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                  {buildingsLoading && <p className="text-xs text-slate-500 mt-2">Loading buildings…</p>}
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Specific location (optional)
                </label>
                <input
                  type="text"
                  value={moveNewLocation}
                  onChange={(e) => setMoveNewLocation(e.target.value)}
                  placeholder={isBulkMove ? "Leave blank to keep each item’s location" : "e.g. Front desk drawer"}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  style={{ boxShadow: "none" }}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={moveAppendNote}
                  onChange={(e) => setMoveAppendNote(e.target.checked)}
                />
                Add automatic move note to history
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeMoveModal}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={moveSubmitting}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND.ink }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.inkHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.ink)}
                >
                  {moveSubmitting ? "Moving..." : "Confirm move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {canExport && showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Export Items to CSV</h3>
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
                {building === "All Buildings"
                  ? "items for all buildings."
                  : `items for ${displayBuildingName(campus, building)}.`}
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
                  className="flex-1 rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND.ink }}
                >
                  {exporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim modal UI not included here (you already had state + handlers). */}
      {showClaimModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Mark as Claimed</h3>
              <button
                onClick={closeClaimModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
              <div className="text-sm text-slate-600">
                Item: <span className="font-semibold text-slate-900">{selectedItem.description}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Owner name</label>
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Owner email</label>
                <input
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  type="email"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                  className="flex-1 rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND.ink }}
                >
                  {isClaiming ? "Saving..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}