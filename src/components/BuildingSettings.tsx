import React, { useEffect, useState } from "react";
import { X, Clock, CheckCircle, Loader2, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  buildingId: string;
  buildingName: string;
  onClose: () => void;
}

const MAX_CHARS = 160;
const PLACEHOLDER = "e.g. Mon–Fri 8am–5pm · Sat 10am–2pm";

export default function BuildingSettings({ buildingId, buildingName, onClose }: Props) {
  const [hours, setHours] = useState<string>("");
  const [original, setOriginal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("buildings")
        .select("claim_hours")
        .eq("id", buildingId)
        .single();
      const val = data?.claim_hours ?? "";
      setHours(val);
      setOriginal(val);
      setLoading(false);
    };
    fetch();
  }, [buildingId]);

  const isDirty = hours !== original;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const { error: err } = await supabase
      .from("buildings")
      .update({ claim_hours: hours.trim() || null })
      .eq("id", buildingId);

    setSaving(false);

    if (err) {
      setError("Failed to save. Please try again.");
      return;
    }

    setOriginal(hours.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const previewHours = hours.trim() || "Contact the building for current hours";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: "0 20px 60px -10px rgb(0 0 0 / 0.3)", maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-slate-900">Building settings</p>
            <p className="text-xs text-slate-500 mt-0.5">{buildingName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
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
              {/* Hours field */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <label className="text-sm font-semibold text-slate-800">
                    Lost &amp; Found hours
                  </label>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  When students can come to claim items. Shown on every item page for your building.
                </p>
                <textarea
                  value={hours}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) setHours(e.target.value);
                  }}
                  placeholder={PLACEHOLDER}
                  rows={3}
                  className="ff-input resize-none w-full text-sm"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {hours.length}/{MAX_CHARS}
                </p>
              </div>

              {/* Preview */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Preview — as seen by students
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">Where to claim</p>
                      <p className="text-sm font-semibold text-blue-900">{buildingName} — Lost &amp; Found desk</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <p className="text-xs text-blue-700">{previewHours}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
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
                "Save changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
