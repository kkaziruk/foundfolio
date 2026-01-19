import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AddItemFormProps {
  onSuccess: () => void;
  campus: string; // campus_slug (e.g., "nd")
  building?: string; // optional lock: if passed and not "All Buildings", we lock to it
}

type BuildingRow = { id: string; name: string };
type CategoryRow = {
  id: string;
  name: string;
  is_high_value?: boolean | null;
  is_sensitive?: boolean | null;
};

type UploadResult = { publicUrl: string; path: string };

function todayISODate() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

/**
 * Upload photo to Supabase Storage and return both the public URL and the storage path.
 * Requires bucket: "item-photos" (PUBLIC read is easiest for AI to fetch images)
 */
async function uploadItemPhoto(file: File, campus_slug: string): Promise<UploadResult> {
  const bucket = "item-photos";

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const uuid = crypto.randomUUID();
  const safeOriginal = sanitizeFilename(file.name || "photo");
  const path = `${campus_slug}/items/${uuid}-${safeOriginal}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) throw new Error("Could not generate public URL for uploaded image.");

  return { publicUrl, path };
}

async function deleteItemPhoto(path: string) {
  const bucket = "item-photos";
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn("Failed to delete photo from storage:", error);
}

export default function AddItemForm({ onSuccess, campus, building }: AddItemFormProps) {
  const lockedBuilding = useMemo(() => !!building && building !== "All Buildings", [building]);

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Photo preview is a local Object URL (NOT stored in DB)
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    description: "",
    category: "", // category NAME (matches categories.name)
    building: lockedBuilding ? (building as string) : "",
    specific_location: "",
    additional_notes: "",
    photo_url: null as string | null,
    sensitive: false,
    is_high_value: false,
  });

  const findCategoryByName = (name: string) =>
    categories.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null;

  const categoryFlagsFromName = (name: string) => {
    const row = findCategoryByName(name);
    return {
      isSensitive: row?.is_sensitive === true,
      isHighValue: row?.is_high_value === true,
    };
  };

  // Load buildings + categories for this campus
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingOptions(true);

      try {
        const [{ data: bData, error: bErr }, { data: cData, error: cErr }] = await Promise.all([
          // A) FILTER OUT SYSTEM BUILDINGS
          supabase
            .from("buildings")
            .select("id,name")
            .eq("campus_slug", campus)
            .eq("is_system", false)
            .order("name"),
          supabase
            .from("categories")
            .select("id,name,is_high_value,is_sensitive")
            .eq("campus_slug", campus)
            .order("name"),
        ]);

        if (bErr) throw bErr;
        if (cErr) throw cErr;

        if (cancelled) return;

        const b = (bData ?? []) as BuildingRow[];
        const c = (cData ?? []) as CategoryRow[];

        setBuildings(b);
        setCategories(c);

        setFormData((prev) => {
          const nextBuilding = lockedBuilding
            ? (building as string)
            : prev.building || b[0]?.name || "";

          // Prefer "Other" if present; else first category
          const other = c.find((x) => x.name === "Other");
          const nextCategory = prev.category || other?.name || c[0]?.name || "";

          const flags = {
            is_high_value: (findCategoryByName(nextCategory)?.is_high_value === true) || false,
            sensitive: (findCategoryByName(nextCategory)?.is_sensitive === true) || false,
          };

          return {
            ...prev,
            building: nextBuilding,
            category: nextCategory,
            is_high_value: prev.is_high_value || flags.is_high_value,
            sensitive: prev.sensitive || flags.sensitive,
          };
        });
      } catch (e) {
        console.error("Failed to load buildings/categories:", e);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus, lockedBuilding, building]);

  // Keep locked building in sync
  useEffect(() => {
    if (!lockedBuilding) return;
    setFormData((prev) => ({ ...prev, building: building as string }));
  }, [lockedBuilding, building]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // If staff manually changes category, re-derive flags from categories table.
      if (name === "category") {
        const flags = categoryFlagsFromName(value);
        next.sensitive = flags.isSensitive;
        next.is_high_value = flags.isHighValue;

        // If they manually set a sensitive category, never store photo_url
        if (next.sensitive) next.photo_url = null;
      }

      return next;
    });
  };

  const handleClearPhoto = async () => {
    // Remove local preview
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");

    // If we uploaded a photo already, delete it
    if (uploadedPhotoPath) {
      await deleteItemPhoto(uploadedPhotoPath);
      setUploadedPhotoPath("");
    }

    // Clear form photo fields
    setFormData((prev) => ({
      ...prev,
      photo_url: null,
      // keep sensitive/is_high_value as-is; clearing photo shouldn't flip category logic
    }));

    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Replace previous preview
    if (photoPreview) URL.revokeObjectURL(photoPreview);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // If there was an older uploaded image, remove it
    if (uploadedPhotoPath) {
      await deleteItemPhoto(uploadedPhotoPath);
      setUploadedPhotoPath("");
    }

    setIsUploading(true);
    setIsAnalyzing(false);

    try {
      // 1) Upload to Storage
      const { publicUrl, path } = await uploadItemPhoto(file, campus);
      setUploadedPhotoPath(path);

      // Tentatively set URL (may be wiped if sensitive)
      setFormData((prev) => ({
        ...prev,
        photo_url: publicUrl,
      }));

      // 2) AI analysis (server-side decides category/sensitive/high_value)
      setIsAnalyzing(true);

      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: {
          imageUrl: publicUrl,
          campus_slug: campus,
        },
      });

      if (error) {
        console.error("AI invoke error:", error);
        return;
      }
      if (!data) return;

      const nextDescription = (data.description ?? "").toString();
      const nextCategory = (data.category ?? "").toString();

      // Primary source: AI booleans if present
      const aiSensitive = data.sensitive === true;
      const aiHighValue = data.is_high_value === true;

      // Fallback source: category table flags (in case AI function doesn’t return is_high_value)
      const catFlags = nextCategory
        ? categoryFlagsFromName(nextCategory)
        : { isSensitive: false, isHighValue: false };

      const sensitive = aiSensitive || catFlags.isSensitive;
      const is_high_value = aiHighValue || catFlags.isHighValue;

      // If sensitive: delete uploaded file and DO NOT store photo_url.
      // UX: keep local preview so staff can confirm the photo they took.
      if (sensitive) {
        await deleteItemPhoto(path);
        setUploadedPhotoPath("");
      }

      setFormData((prev) => ({
        ...prev,
        description: nextDescription || prev.description,
        category: nextCategory || prev.category,
        sensitive,
        is_high_value,
        photo_url: sensitive ? null : publicUrl,
      }));
    } catch (err) {
      console.error("Upload/AI error:", err);
      alert(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Hard validations
    if (!formData.description.trim()) return alert("Description is required.");
    if (!formData.category.trim()) return alert("Category is required.");
    if (!(lockedBuilding ? (building as string) : formData.building).trim()) return alert("Building is required.");
    if (!formData.specific_location.trim()) return alert("Specific location is required.");

    setIsSubmitting(true);

    try {
      const buildingName = lockedBuilding ? (building as string) : formData.building.trim();

      // Ensure building exists in public.buildings (only when not locked)
      if (!lockedBuilding) {
        // Check DB (not client state)
        const { data: existing, error: selOneErr } = await supabase
          .from("buildings")
          .select("id")
          .eq("campus_slug", campus)
          .eq("name", buildingName)
          .maybeSingle();
        if (selOneErr) throw selOneErr;

        // Insert only if missing
        if (!existing) {
          // C) explicitly set is_system false on upsert
          const { error: bErr } = await supabase.from("buildings").upsert(
            [{ name: buildingName, campus_slug: campus, is_system: false }],
            {
              onConflict: "campus_slug,name",
            }
          );
          if (bErr) throw bErr;
        }

        // B) Refresh list and keep filtering out system buildings
        const { data: updatedBuildings, error: selErr } = await supabase
          .from("buildings")
          .select("id,name")
          .eq("campus_slug", campus)
          .eq("is_system", false)
          .order("name");
        if (selErr) throw selErr;

        setBuildings((updatedBuildings ?? []) as BuildingRow[]);
      }

      // Insert the item
      const payload = {
        description: formData.description.trim(),
        category: formData.category.trim(),
        building: buildingName,
        specific_location: formData.specific_location.trim(),
        additional_notes: formData.additional_notes.trim() || null,
        date_found: todayISODate(),
        photo_url: formData.photo_url, // already null if sensitive
        sensitive: formData.sensitive,
        is_high_value: formData.is_high_value,
        campus_slug: campus,
        status: "available",
      };

      const { error } = await supabase.from("items").insert(payload);
      if (error) throw error;

      // Reset
      const defaultCategory =
        categories.find((c) => c.name === "Other / Unclassified")?.name || categories[0]?.name || "";

      const defaultFlags = defaultCategory
        ? categoryFlagsFromName(defaultCategory)
        : { isSensitive: false, isHighValue: false };

      setFormData({
        description: "",
        category: defaultCategory,
        // keep the last-used building (best UX)
        building: lockedBuilding ? (building as string) : buildingName,
        specific_location: "",
        additional_notes: "",
        photo_url: null,
        sensitive: defaultFlags.isSensitive,
        is_high_value: defaultFlags.isHighValue,
      });

      // Cleanup preview
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview("");
      setUploadedPhotoPath("");

      if (cameraInputRef.current) cameraInputRef.current.value = "";

      onSuccess();
    } catch (err) {
      console.error("Error adding item:", err);
      alert(err instanceof Error ? err.message : "Failed to add item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const analyzingBanner = (isUploading || isAnalyzing) && (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg">
      <Sparkles className="w-5 h-5 animate-pulse" />
      <span className="font-medium">{isUploading ? "Uploading photo..." : "Analyzing image..."}</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Add New Item</h2>

      {loadingOptions ? (
        <div className="text-slate-600">Loading buildings and categories…</div>
      ) : (
        <div className="space-y-6">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Photo</label>

            {photoPreview ? (
              <div className="space-y-3">
                <div className="relative">
                  <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {analyzingBanner}

                {formData.sensitive && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
                    Sensitive item detected — photo will not be stored.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#3B82F6] hover:bg-[#DBEAFE] transition-colors"
                >
                  <Camera className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-700">Take / Upload Photo</span>
                </button>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {analyzingBanner}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              placeholder="e.g., Black plastic water bottle"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>

          {/* Building */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Building *</label>

            {lockedBuilding ? (
              <input
                type="text"
                value={formData.building}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
              />
            ) : (
              <select
                name="building"
                value={formData.building}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {buildings.length === 0 && (
              <div className="text-xs text-amber-700 mt-2">
                No buildings found for this campus. Add buildings in the DB.
              </div>
            )}
          </div>

          {/* Specific location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Where exactly was it found? *
            </label>
            <input
              type="text"
              name="specific_location"
              value={formData.specific_location}
              onChange={handleInputChange}
              required
              placeholder="e.g., 2nd floor near water fountain, Room 234"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {categories.length === 0 && (
              <div className="text-xs text-amber-700 mt-2">
                No categories found for this campus. Add categories in the DB.
              </div>
            )}

            {(formData.is_high_value || formData.sensitive) && (
              <div className="mt-2 flex gap-2 text-xs">
                {formData.is_high_value && (
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    High value
                  </span>
                )}
                {formData.sensitive && (
                  <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Sensitive
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              name="additional_notes"
              value={formData.additional_notes}
              onChange={handleInputChange}
              placeholder="Any extra details staff should know…"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading || isAnalyzing}
            className="w-full px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding Item..." : "Add Item"}
          </button>
        </div>
      )}
    </form>
  );
}
