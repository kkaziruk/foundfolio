import React, { useEffect, useRef, useState } from "react";
import { X, Camera, ChevronRight, CheckCircle, AlertCircle, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "../lib/supabase";


interface BuildingOption {
  id: string;
  name: string;
}

interface Props {
  campus: string;
  onClose: () => void;
}

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const BUCKET = "item-photos";

async function uploadFoundPhoto(file: File, campusSlug: string): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `found-reports/${campusSlug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Could not get public URL for photo");
  return { url: data.publicUrl, path };
}

type Step = "photo" | "details" | "submitting" | "done" | "error";

export default function ReportFoundItem({ campus, onClose }: Props) {
  const [step, setStep] = useState<Step>("photo");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<{ url: string; path: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [buildingId, setBuildingId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [submitError, setSubmitError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("buildings")
        .select("id, name")
        .eq("campus", campus)
        .order("name");
      setBuildings((data ?? []) as BuildingOption[]);
    };
    load();
  }, [campus]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setUploadError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setUploadedPhoto(null);

    setUploading(true);
    try {
      const result = await uploadFoundPhoto(file, campus);
      setUploadedPhoto(result);
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to upload photo. Please try again.");
      setPhotoFile(null);
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedPhoto || !buildingId) return;
    setStep("submitting");
    setSubmitError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("You must be signed in to submit a report.");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-found-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          },
          body: JSON.stringify({
            campus_slug: campus,
            building_id: buildingId,
            photo_url: uploadedPhoto.url,
            note: note.trim() || undefined,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Submission failed. Please try again.");
      }

      setStep("done");
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: "0 20px 60px -10px rgb(0 0 0 / 0.3)", maxHeight: "92dvh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-slate-900">Report a found item</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === "photo" && "Step 1 of 2 — Add a photo"}
              {step === "details" && "Step 2 of 2 — Where did you find it?"}
              {(step === "submitting" || step === "done" || step === "error") && "Submitting your report"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Step 1: Photo ── */}
          {step === "photo" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Take a photo of the item so staff can identify it quickly.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                  style={{ aspectRatio: "4/3" }}>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!uploading && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 bg-white text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow hover:bg-slate-50 transition-colors"
                    >
                      Change photo
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-3 py-10 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Take or upload a photo</p>
                    <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP — max {MAX_FILE_SIZE_MB}MB</p>
                  </div>
                </button>
              )}

              {uploadError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {uploadError}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Building + note ── */}
          {step === "details" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Where did you find it? <span className="text-red-500">*</span>
                </label>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="ff-input"
                  required
                >
                  <option value="">Select a building…</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Any details? <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. On a table near the front entrance"
                  maxLength={200}
                  rows={3}
                  className="ff-input resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{note.length}/200</p>
              </div>

              {/* Photo thumbnail reminder */}
              {uploadedPhoto && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                    <img src={photoPreview ?? ""} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{photoFile?.name}</p>
                    <p className="text-xs text-green-600 mt-0.5">Photo uploaded</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Submitting ── */}
          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-700">Submitting your report…</p>
              <p className="text-xs text-slate-400 text-center">This usually takes a few seconds</p>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Report submitted</p>
                <p className="text-sm text-slate-500 mt-1">
                  Staff have been notified and will follow up. Thank you for helping!
                </p>
              </div>
              <button
                onClick={onClose}
                className="ff-btn-primary px-6 py-2.5 text-sm mt-2"
              >
                Done
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Submission failed</p>
                <p className="text-sm text-red-600 mt-1">{submitError}</p>
              </div>
              <button
                onClick={() => setStep("details")}
                className="ff-btn-primary px-6 py-2.5 text-sm mt-2"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "photo" || step === "details") && (
          <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
            {step === "photo" && (
              <button
                onClick={() => setStep("details")}
                disabled={!uploadedPhoto || uploading}
                className="ff-btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === "details" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("photo")}
                  className="px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!buildingId}
                  className="ff-btn-primary flex-1 py-3 disabled:opacity-50"
                >
                  Submit report
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
