import React, { useEffect, useState } from "react";
import {
  X, Settings, Mail, Clock3, FileText, Loader2, CheckCircle,
  AlertCircle, Building2, ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  campus: string;
  campusName: string;
  onClose: () => void;
  onNavigateToBuildings: () => void;
}

interface CampusSettings {
  contact_email: string;
  hold_days: number;
  policy_note: string;
}

const DEFAULT: CampusSettings = {
  contact_email: "",
  hold_days: 90,
  policy_note: "",
};

export default function AdminSettings({
  campus,
  campusName,
  onClose,
  onNavigateToBuildings,
}: Props) {
  const [settings, setSettings] = useState<CampusSettings>(DEFAULT);
  const [original, setOriginal] = useState<CampusSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [buildingCount, setBuildingCount] = useState(0);
  const [buildingsWithHours, setBuildingsWithHours] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const [campusRes, buildingsRes] = await Promise.all([
        supabase
          .from("campuses")
          .select("contact_email,hold_days,policy_note")
          .eq("slug", campus)
          .maybeSingle(),
        supabase
          .from("buildings")
          .select("id,claim_hours,is_system")
          .eq("campus_slug", campus),
      ]);

      const loaded: CampusSettings = {
        contact_email: campusRes.data?.contact_email ?? "",
        hold_days: campusRes.data?.hold_days ?? 90,
        policy_note: campusRes.data?.policy_note ?? "",
      };
      setSettings(loaded);
      setOriginal(loaded);

      const allBuildings = (buildingsRes.data ?? []).filter((b: any) => !b.is_system);
      setBuildingCount(allBuildings.length);
      setBuildingsWithHours(allBuildings.filter((b: any) => b.claim_hours).length);

      setLoading(false);
    };
    fetch();
  }, [campus]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const { error: err } = await supabase
      .from("campuses")
      .update({
        contact_email: settings.contact_email.trim() || null,
        hold_days: settings.hold_days,
        policy_note: settings.policy_note.trim() || null,
      })
      .eq("slug", campus);

    setSaving(false);

    if (err) {
      setError("Failed to save settings. Please try again.");
      return;
    }

    setOriginal({ ...settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (key: keyof CampusSettings, value: string | number) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const buildingsMissing = buildingCount - buildingsWithHours;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: "0 20px 60px -10px rgb(0 0 0 / 0.3)", maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Campus Settings</p>
              <p className="text-xs text-slate-500 mt-0.5">{campusName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Student contact ── */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Student Contact Email</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Shown on item pages so students know who to contact with questions.
                </p>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  placeholder="lostandfound@university.edu"
                  className="ff-input w-full text-sm"
                />
              </div>

              {/* ── Item hold period ── */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock3 className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Item hold period</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  How many days items are held before being considered abandoned. Shown to staff as a guide.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.hold_days}
                    onChange={(e) => set("hold_days", Math.max(1, parseInt(e.target.value) || 90))}
                    className="ff-input w-28 text-sm text-center"
                  />
                  <span className="text-sm text-slate-500">days</span>
                  <div className="flex gap-1.5 ml-auto">
                    {[30, 60, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => set("hold_days", d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          settings.hold_days === d
                            ? "bg-slate-900 text-white border-slate-900"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Policy note ── */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Policy note</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Optional message shown to students on every item detail page — e.g. ID requirements or disposal policy.
                </p>
                <textarea
                  value={settings.policy_note}
                  onChange={(e) => {
                    if (e.target.value.length <= 280) set("policy_note", e.target.value);
                  }}
                  placeholder="e.g. Items not claimed within 90 days will be donated to charity."
                  rows={3}
                  className="ff-input w-full text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {settings.policy_note.length}/280
                </p>
              </div>

              {/* ── Buildings overview ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Buildings overview</p>
                </div>
                <button
                  onClick={() => { onClose(); onNavigateToBuildings(); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{buildingCount} buildings</p>
                    <p className={`text-xs mt-0.5 ${buildingsMissing > 0 ? "text-amber-500" : "text-green-600"}`}>
                      {buildingsMissing > 0
                        ? `${buildingsMissing} building${buildingsMissing > 1 ? "s" : ""} missing Lost & Found hours`
                        : "All buildings have hours set"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              {isDirty ? "Discard" : "Close"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="ff-btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : saved ? (
                <><CheckCircle className="w-4 h-4" /> Saved!</>
              ) : (
                "Save settings"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
