import React, { useCallback, useEffect, useState } from "react";
import {
  Inbox, X, CheckCircle, XCircle, ChevronRight, Loader2,
  AlertTriangle, ImageIcon, MapPin, Calendar, RefreshCw, Sparkles
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface FoundReport {
  id: string;
  campus_slug: string;
  building_id: string;
  reported_by_user_id: string;
  photo_url: string;
  note: string | null;
  status: "pending_review" | "converted" | "dismissed";
  ai_description: string | null;
  ai_category: string | null;
  ai_high_value: boolean;
  ai_sensitive: boolean;
  accepted_item_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  buildings: { name: string; campus_slug: string } | null;
}

interface CategoryRow { id: string; name: string }

interface Props {
  campus: string;
  buildingId: string | null;
}

type Filter = "pending_review" | "converted" | "dismissed" | "all";

const STATUS_LABEL: Record<FoundReport["status"], string> = {
  pending_review: "Pending",
  converted: "Converted",
  dismissed: "Dismissed",
};

const STATUS_COLOR: Record<FoundReport["status"], string> = {
  pending_review: "bg-amber-100 text-amber-800",
  converted: "bg-green-100 text-green-800",
  dismissed: "bg-slate-100 text-slate-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function FoundReportsQueue({ campus, buildingId }: Props) {
  const [reports, setReports] = useState<FoundReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending_review");

  const [selected, setSelected] = useState<FoundReport | null>(null);
  const [convertMode, setConvertMode] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [convertForm, setConvertForm] = useState({
    description: "",
    category: "",
    specific_location: "",
    is_high_value: false,
    sensitive: false,
  });

  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string>("");
  const [partialFail, setPartialFail] = useState<{ itemId: string } | null>(null);

  const [dismissing, setDismissing] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("found_item_reports")
        .select("*, buildings(name, campus_slug)")
        .eq("campus_slug", campus)
        .order("created_at", { ascending: false });

      if (buildingId) query = query.eq("building_id", buildingId);

      const { data, error } = await query;
      if (error) { console.error(error); return; }
      setReports((data ?? []) as FoundReport[]);
    } finally {
      setLoading(false);
    }
  }, [campus, buildingId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    if (!convertMode) return;
    const load = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("campus_slug", campus)
        .order("name");
      setCategories((data ?? []) as CategoryRow[]);
    };
    load();
  }, [convertMode, campus]);

  useEffect(() => {
    if (selected && convertMode) {
      setConvertForm({
        description: selected.ai_description ?? "",
        category: selected.ai_category ?? "",
        specific_location: "",
        is_high_value: selected.ai_high_value,
        sensitive: selected.ai_sensitive,
      });
      setConvertError("");
      setPartialFail(null);
    }
  }, [selected, convertMode]);

  const visible = filter === "all"
    ? reports
    : reports.filter((r) => r.status === filter);

  const pendingCount = reports.filter((r) => r.status === "pending_review").length;

  const handleDismiss = async (report: FoundReport) => {
    setDismissing(true);
    try {
      const { error } = await supabase
        .from("found_item_reports")
        .update({
          status: "dismissed",
          reviewed_by_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (error) { alert(`Failed to dismiss: ${error.message}`); return; }

      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: "dismissed", reviewed_at: new Date().toISOString() }
            : r
        )
      );
      if (selected?.id === report.id) setSelected(null);
    } finally {
      setDismissing(false);
    }
  };

  const handleConvert = async () => {
    if (!selected) return;
    if (!convertForm.description.trim()) {
      setConvertError("Description is required.");
      return;
    }
    if (!convertForm.category) {
      setConvertError("Category is required.");
      return;
    }

    setConverting(true);
    setConvertError("");
    setPartialFail(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      // Step 1: Insert into items
      const { data: newItem, error: itemErr } = await supabase
        .from("items")
        .insert({
          campus_slug: selected.campus_slug,
          building: selected.buildings?.name ?? "",
          description: convertForm.description.trim(),
          category: convertForm.category,
          specific_location: convertForm.specific_location.trim() || "Unknown",
          is_high_value: convertForm.is_high_value,
          sensitive: convertForm.sensitive,
          photo_url: convertForm.sensitive ? null : selected.photo_url,
          status: "available",
          date_found: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (itemErr || !newItem) {
        setConvertError(`Failed to create item: ${itemErr?.message ?? "Unknown error"}. No changes were made.`);
        return;
      }

      const newItemId = newItem.id;

      // Step 2: Mark report as converted
      const { error: reportErr } = await supabase
        .from("found_item_reports")
        .update({
          status: "converted",
          accepted_item_id: newItemId,
          reviewed_by_user_id: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (reportErr) {
        // Item was created but report status failed — surface clearly
        setPartialFail({ itemId: newItemId });
        return;
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? { ...r, status: "converted", accepted_item_id: newItemId }
            : r
        )
      );
      setSelected(null);
      setConvertMode(false);
    } finally {
      setConverting(false);
    }
  };

  const retryReportUpdate = async () => {
    if (!selected || !partialFail) return;
    setConverting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("found_item_reports")
        .update({
          status: "converted",
          accepted_item_id: partialFail.itemId,
          reviewed_by_user_id: userData.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) {
        setConvertError(`Retry failed: ${error.message}`);
        return;
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? { ...r, status: "converted", accepted_item_id: partialFail.itemId }
            : r
        )
      );
      setPartialFail(null);
      setSelected(null);
      setConvertMode(false);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex gap-4" style={{ minHeight: "500px" }}>
      {/* ── Left panel: report list ── */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>

        {/* Header + filter */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800 text-sm">Student Reports</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={fetchReports} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-slate-100 px-2 pt-1">
          {(["pending_review", "all", "converted", "dismissed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                filter === f
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f === "pending_review" ? "Pending" : f === "all" ? "All" : f === "converted" ? "Converted" : "Dismissed"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">
              {filter === "pending_review" ? "No pending reports" : "No reports"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((report) => (
              <button
                key={report.id}
                onClick={() => { setSelected(report); setConvertMode(false); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                  selected?.id === report.id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                  {report.photo_url ? (
                    <img src={report.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {report.ai_description ?? "Awaiting analysis…"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{report.buildings?.name ?? report.building_id}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[report.status]}`}>
                    {STATUS_LABEL[report.status]}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: detail / convert ── */}
      {selected && (
        <div className="w-full sm:w-96 flex-shrink-0 bg-white rounded-xl border border-slate-200 overflow-y-auto"
          style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)", maxHeight: "80vh" }}>

          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">
              {convertMode ? "Convert to item" : "Report detail"}
            </p>
            <button
              onClick={() => { setSelected(null); setConvertMode(false); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Photo */}
            {!convertMode && (
              <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200" style={{ aspectRatio: "4/3" }}>
                {selected.photo_url ? (
                  <img src={selected.photo_url} alt="Found item" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  </div>
                )}
              </div>
            )}

            {/* Meta info */}
            {!convertMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                  {selected.ai_high_value && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                      High value
                    </span>
                  )}
                  {selected.ai_sensitive && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      Sensitive
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Building</p>
                      <p className="text-slate-800">{selected.buildings?.name ?? selected.building_id}</p>
                    </div>
                  </div>
                  {selected.note && (
                    <div className="flex gap-2">
                      <div className="w-4 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Student note</p>
                        <p className="text-slate-800">{selected.note}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Reported</p>
                      <p className="text-slate-800">{formatDate(selected.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* AI suggestions */}
                {(selected.ai_description || selected.ai_category) && (
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs font-semibold text-blue-700">AI suggestions</p>
                    </div>
                    {selected.ai_description && (
                      <div>
                        <p className="text-xs text-blue-500 font-medium">Description</p>
                        <p className="text-sm text-slate-800">{selected.ai_description}</p>
                      </div>
                    )}
                    {selected.ai_category && (
                      <div>
                        <p className="text-xs text-blue-500 font-medium">Category</p>
                        <p className="text-sm text-slate-800">{selected.ai_category}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Convert form ── */}
            {convertMode && (
              <div className="space-y-3">
                {/* Small photo */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-200 p-2.5">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                    {selected.photo_url && !selected.ai_sensitive && (
                      <img src={selected.photo_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{selected.buildings?.name}</p>
                    {selected.note && <p className="text-xs text-slate-400 truncate">{selected.note}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={convertForm.description}
                    onChange={(e) => setConvertForm((p) => ({ ...p, description: e.target.value }))}
                    className="ff-input text-sm"
                    placeholder="e.g. Black North Face backpack"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={convertForm.category}
                    onChange={(e) => setConvertForm((p) => ({ ...p, category: e.target.value }))}
                    className="ff-input text-sm"
                  >
                    <option value="">Select a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific location <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={convertForm.specific_location}
                    onChange={(e) => setConvertForm((p) => ({ ...p, specific_location: e.target.value }))}
                    className="ff-input text-sm"
                    placeholder="e.g. Front desk, Room 201"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={convertForm.is_high_value}
                      onChange={(e) => setConvertForm((p) => ({ ...p, is_high_value: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs text-slate-700">High value</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={convertForm.sensitive}
                      onChange={(e) => setConvertForm((p) => ({ ...p, sensitive: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs text-slate-700">Sensitive / ID</span>
                  </label>
                </div>

                {convertError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {convertError}
                  </div>
                )}

                {partialFail && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold">Item created but report status failed to update.</p>
                        <p className="text-xs mt-0.5">Item ID: <code className="font-mono text-xs">{partialFail.itemId}</code></p>
                        <p className="text-xs mt-0.5">The item is live. You can retry the status update or dismiss this report manually.</p>
                      </div>
                    </div>
                    <button
                      onClick={retryReportUpdate}
                      disabled={converting}
                      className="w-full py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {converting ? "Retrying…" : "Retry status update"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action footer */}
          {selected.status === "pending_review" && (
            <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
              {!convertMode && !partialFail && (
                <>
                  <button
                    onClick={() => setConvertMode(true)}
                    className="ff-btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Convert to item
                  </button>
                  <button
                    onClick={() => handleDismiss(selected)}
                    disabled={dismissing}
                    className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {dismissing ? "Dismissing…" : "Dismiss"}
                  </button>
                </>
              )}
              {convertMode && !partialFail && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConvertMode(false)}
                    disabled={converting}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvert}
                    disabled={converting || !convertForm.description.trim() || !convertForm.category}
                    className="ff-btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {converting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Create item</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
