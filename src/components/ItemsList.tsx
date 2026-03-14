import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Trash2,
  Package,
  CheckCircle,
  X,
  Download,
  Search,
  MoveRight,
  MoreHorizontal,
  ImageIcon,
  Eye,
  MapPin,
  Tag,
  Building2,
  User,
  Calendar,
  LayoutGrid,
  List,
  AlertTriangle,
} from "lucide-react";
import { BRAND } from "../lib/brand";
import { supabase, Item } from "../lib/supabase";
import { formatLoggedAt } from "../lib/dates";

interface ItemsListProps {
  refreshTrigger: number;
  campus: string; // campus_slug
  building: string; // "All Buildings" or a building name
}

type BuildingRow = { id: string; name: string };

const ITEMS_PER_PAGE = 50;

// Helper to display friendly names for system buildings
function displayBuildingName(campus: string, building: string) {
  const c = (campus || "").toLowerCase();
  const b = (building || "").trim();
  if (c === "nd" && b === "NDPD") return "Hammes Mowbray Hall (NDPD)";
  return b;
}

// Flag items older than 72h or marked high-value
function isAgingItem(item: Item): boolean {
  const ts = (item as any).created_at || (item as any).date_found;
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() > 72 * 60 * 60 * 1000;
}

function isHighValueItem(item: Item): boolean {
  return (item as any).is_high_value === true;
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

  const [canExport, setCanExport] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Overflow menu for each row
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Staff item detail panel
  const [detailItem, setDetailItem] = useState<Item | null>(null);

useEffect(() => {
  (async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, campus_slug")
      .eq("user_id", userId)
      .eq("campus_slug", campus)
      .maybeSingle();

    if (error) {
      console.error("EXPORT CHECK failed:", error);
      return;
    }

    console.log("EXPORT CHECK – profile:", profile);

    setCanExport(profile?.role === "campus_admin");
  })();
}, [campus]);

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

  // Close overflow menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

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

      const results = await Promise.all(
        updates.map((upd) =>
          supabase
            .from("items")
            .update({
              building: upd.building,
              specific_location: upd.specific_location,
              additional_notes: upd.additional_notes,
            })
            .eq("id", upd.id)
        )
      );

      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

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
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === "grid" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {canExport && (
              <button
                onClick={() => setShowExportModal(true)}
                disabled={exporting}
                className="ff-btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? "Exporting..." : "Export CSV"}</span>
              </button>
            )}
          </div>
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
          {/* ── Grid view ── */}
          {viewMode === "grid" && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((item) => {
                const isSensitive = (item as any).sensitive === true;
                const aging = isAgingItem(item);
                const highValue = isHighValueItem(item);
                const needsAttention = aging || highValue;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden group"
                    style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
                  >
                    {/* Photo */}
                    <button
                      onClick={() => setDetailItem(item)}
                      className="block w-full text-left"
                    >
                      <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100 relative">
                        {isSensitive ? (
                          <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                            <Package className="w-8 h-8 text-amber-400" />
                          </div>
                        ) : item.photo_url ? (
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
                        {/* Status badge */}
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${item.status === "available" ? "bg-blue-500 text-white" : "bg-green-500 text-white"}`}>
                          {item.status === "available" ? "Available" : "Claimed"}
                        </span>
                        {/* Amber flag */}
                        {needsAttention && item.status === "available" && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center" title={aging ? "72h+" : "High value"}>
                            <AlertTriangle className="w-3.5 h-3.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[15px] font-medium text-slate-900 leading-snug line-clamp-2 mb-1">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] text-slate-500 truncate">{displayBuildingName(campus, item.building)}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatLoggedAt((item as any).logged_at)}</p>
                      </div>
                    </button>
                    {/* Grid overflow menu */}
                    <div className="px-2.5 pb-2.5 flex justify-end" ref={openMenuId === item.id ? menuRef : undefined}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === item.id && (
                          <div className="absolute right-0 bottom-full mb-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44" style={{ boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.10)" }}>
                            <button onClick={() => { setOpenMenuId(null); setDetailItem(item); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                              <Eye className="w-4 h-4 text-slate-400" /> View details
                            </button>
                            <button onClick={() => { setOpenMenuId(null); openMoveModal(item); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                              <MoveRight className="w-4 h-4 text-slate-400" /> Transfer
                            </button>
                            {item.status === "available" && (
                              <button onClick={() => { setOpenMenuId(null); openClaimModal(item); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 text-left">
                                <CheckCircle className="w-4 h-4 text-green-500" /> Mark as Claimed
                              </button>
                            )}
                            <div className="my-1 border-t border-slate-100" />
                            <button onClick={() => { setOpenMenuId(null); handleDelete(item.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── List view ── */}
          {viewMode === "list" && (
          <div className="divide-y divide-slate-200">
            {items.map((item) => {
              const isSensitive = (item as any).sensitive === true;
              const isChecked = selectedIds.has(item.id);
              const aging = isAgingItem(item);
              const highValue = isHighValueItem(item);
              const needsAttention = aging || highValue;

              return (
                <div
                  key={item.id}
                  className={`relative px-6 py-5 hover:bg-slate-50 transition-colors ${needsAttention ? "border-l-4 border-l-amber-400" : ""}`}
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
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
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
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-semibold">
                                <CheckCircle className="w-3 h-3" />
                                Claimed
                              </span>
                            )}

                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                              {item.category}
                            </span>

                            {aging && item.status === "available" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                72h+
                              </span>
                            )}
                            {highValue && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                High value
                              </span>
                            )}
                            {isSensitive && (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                                Sensitive (photo hidden)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Overflow menu */}
                        <div className="relative flex-shrink-0" ref={openMenuId === item.id ? menuRef : undefined}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            title="More actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === item.id && (
                            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-48" style={{ boxShadow: "0 4px 16px 0 rgb(0 0 0 / 0.10)" }}>
                              <button
                                onClick={() => { setOpenMenuId(null); setDetailItem(item); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                              >
                                <Eye className="w-4 h-4 text-slate-400" />
                                View details
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); openMoveModal(item); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                              >
                                <MoveRight className="w-4 h-4 text-slate-400" />
                                Transfer
                              </button>
                              {item.status === "available" && (
                                <button
                                  onClick={() => { setOpenMenuId(null); openClaimModal(item); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors text-left"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  Mark as Claimed
                                </button>
                              )}
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                onClick={() => { setOpenMenuId(null); handleDelete(item.id); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
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
          )}

          {hasMore && (
            <div className="p-6 text-center border-t border-slate-200">
              <button
                onClick={() => loadItems(false)}
                disabled={loadingMore}
                className="ff-btn-primary px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="ff-btn-destructive px-4 py-2 text-sm"
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
                  className="ff-btn-primary flex-1 py-3 text-sm disabled:opacity-50"
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
              <h3 className="text-xl font-bold text-slate-900">Export Items as CSV</h3>
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
                  className="ff-btn-primary flex-1 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim modal UI not included here (you already had state + handlers). */}
      {/* Staff item detail modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${detailItem.status === "available" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                  {detailItem.status === "available" ? "Available" : "Claimed"}
                </span>
                <span className="text-sm font-medium text-slate-500">{detailItem.category}</span>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {detailItem.photo_url && (
              <div className="w-full aspect-video bg-slate-100 overflow-hidden">
                <img src={detailItem.photo_url} alt={detailItem.description} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">{detailItem.description}</h2>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-start gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span><span className="font-medium text-slate-700">Building:</span> {displayBuildingName(campus, detailItem.building)}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span><span className="font-medium text-slate-700">Location:</span> {detailItem.specific_location}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <Tag className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span><span className="font-medium text-slate-700">Category:</span> {detailItem.category}</span>
                </div>
                {(detailItem as any).logged_by_name && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span><span className="font-medium text-slate-700">Logged by:</span> {(detailItem as any).logged_by_name}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span><span className="font-medium text-slate-700">Date logged:</span> {formatLoggedAt((detailItem as any).logged_at)}</span>
                </div>
              </div>

              {detailItem.status === "available" && (
                <div className="pt-2">
                  <button
                    onClick={() => { setDetailItem(null); openClaimModal(detailItem); }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Claimed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  className="ff-btn-primary flex-1 py-2 text-sm disabled:opacity-50"
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