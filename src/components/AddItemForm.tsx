// src/components/AddItemForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  Camera,
  X,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Building2,
  MapPin,
  Tag,
  StickyNote,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { BRAND } from "../lib/brand";
import { toTitleCase } from "../lib/format";

interface AddItemFormProps {
  onSuccess: () => void;
  campus: string;
  building?: string; // "All Buildings" or a building name
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
  return new Date().toISOString().split("T")[0];
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

async function uploadItemPhoto(file: File, campus_slug: string): Promise<UploadResult> {
  const bucket = "item-photos";

  const rawName = file.name || "photo.jpg";
  const ext = (rawName.split(".").pop() || "jpg").toLowerCase();
  const base = sanitizeFilename(rawName.replace(/\.[^/.]+$/, ""));

  const uuid = crypto.randomUUID();
  const path = `${campus_slug}/items/${uuid}-${base}.${ext}`;

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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * SnapPager (Option A)
 * - No horizontal scrolling. We move pages with translateX.
 * - Pointer capture keeps the gesture from being stolen by children.
 * - touchAction: pan-y so vertical scroll inside pages still works.
 * - overflow-hidden ensures nothing can "spill" outside the viewport.
 */
function SnapPager({
  step,
  setStep,
  children,
}: {
  step: number;
  setStep: (n: number) => void;
  children: React.ReactNode[];
}) {
  const pages = children.length;
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);
  const dragXRef = useRef(0);
  const dragging = useRef(false);
  const axis = useRef<"none" | "h" | "v">("none");

  const [dragX, setDragX] = useState(0);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e as any).button != null && (e as any).button !== 0) return;

    dragging.current = true;
    axis.current = "none";
    startX.current = e.clientX;
    startY.current = e.clientY;
    dragXRef.current = 0;
    setDragX(0);

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (axis.current === "none") {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 6 && ady < 6) return;
      axis.current = adx > ady ? "h" : "v";
    }

    if (axis.current === "v") return;

    const wrap = wrapRef.current;
    const width = wrap?.clientWidth || 1;

    let next = dx;
    if (step === 0 && dx > 0) next = dx * 0.25;
    if (step === pages - 1 && dx < 0) next = dx * 0.25;

    next = clamp(next, -width, width);

    dragXRef.current = next;
    setDragX(next);
  };

  const finishDrag = () => {
    const wrap = wrapRef.current;
    const width = wrap?.clientWidth || 1;

    const dx = dragXRef.current;
    const thresholdPx = Math.max(60, width * 0.18);

    let nextStep = step;
    if (dx <= -thresholdPx) nextStep = step + 1;
    else if (dx >= thresholdPx) nextStep = step - 1;

    nextStep = clamp(nextStep, 0, pages - 1);

    dragging.current = false;
    axis.current = "none";
    dragXRef.current = 0;
    setDragX(0);

    if (nextStep !== step) setStep(nextStep);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    finishDrag();
  };

  const onPointerCancel = () => {
    if (!dragging.current) return;
    finishDrag();
  };

  const isDragging = dragging.current && axis.current === "h";

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden"
      style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        className={`flex w-full ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{
          transform: `translateX(calc(${-step * 100}% + ${dragX}px))`,
          willChange: "transform",
        }}
      >
        {children.map((child, i) => (
          <div key={i} className="w-full shrink-0 min-w-0 max-w-full">
            <div className="px-5 py-5 min-w-0 max-w-full box-border">{child}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldLabel({
  icon: Icon,
  text,
  required,
  ai,
}: {
  icon: React.ElementType;
  text: string;
  required?: boolean;
  ai?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-slate-800 truncate">
          {text} {required ? <span className="text-slate-500">*</span> : null}
        </span>
      </div>

      {ai ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
          Auto-filled
        </span>
      ) : null}
    </div>
  );
}

export default function AddItemForm({ onSuccess, campus, building }: AddItemFormProps) {
  const lockedBuilding = useMemo(() => !!building && building !== "All Buildings", [building]);

  const isMobileSwipe = useMediaQuery("(pointer: coarse) and (max-width: 768px)");
  const [step, setStep] = useState(0);

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    logged_by_name: "",
    description: "",
    category: "",
    building: lockedBuilding ? (building as string) : "",
    specific_location: "",
    additional_notes: "",
    photo_url: null as string | null,
    sensitive: false,
    is_high_value: false,
  });

  const [aiFilled, setAiFilled] = useState({
    description: false,
    category: false,
    specific_location: false,
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingOptions(true);
      try {
        const [{ data: bData, error: bErr }, { data: cData, error: cErr }] = await Promise.all([
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
          const nextBuilding = lockedBuilding ? (building as string) : prev.building || b[0]?.name || "";

          const other =
            c.find((x) => x.name === "Other / Unclassified") ?? c.find((x) => x.name === "Other");
          const nextCategory = prev.category || other?.name || c[0]?.name || "";

          const flags = nextCategory
            ? categoryFlagsFromName(nextCategory)
            : { isSensitive: false, isHighValue: false };

          return {
            ...prev,
            building: nextBuilding,
            category: nextCategory,
            is_high_value: prev.is_high_value || flags.isHighValue,
            sensitive: prev.sensitive || flags.isSensitive,
            photo_url: prev.sensitive || flags.isSensitive ? null : prev.photo_url,
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

  useEffect(() => {
    if (!lockedBuilding) return;
    setFormData((prev) => ({ ...prev, building: building as string }));
  }, [lockedBuilding, building]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!isMobileSwipe) return;
    if ((formData.photo_url || photoPreview) && step === 0) setStep(1);
  }, [isMobileSwipe, formData.photo_url, photoPreview, step]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "description" || name === "category" || name === "specific_location") {
      setAiFilled((prev) => ({ ...prev, [name]: false }));
    }

    if (name === "category" && isMobileSwipe && step === 1 && value.trim()) {
      setStep(2);
    }

    setFormData((prev) => {
      const next: any = { ...prev, [name]: value };

      if (name === "category") {
        const flags = categoryFlagsFromName(value);
        next.sensitive = flags.isSensitive;
        next.is_high_value = flags.isHighValue;
        if (next.sensitive) next.photo_url = null;
      }

      return next;
    });
  };

  const handleClearPhoto = async () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");

    if (uploadedPhotoPath) {
      await deleteItemPhoto(uploadedPhotoPath);
      setUploadedPhotoPath("");
    }

    setFormData((prev) => {
      const flags = prev.category
        ? categoryFlagsFromName(prev.category)
        : { isSensitive: false, isHighValue: false };
      return {
        ...prev,
        photo_url: null,
        sensitive: flags.isSensitive,
        is_high_value: flags.isHighValue,
      };
    });

    setAiFilled({ description: false, category: false, specific_location: false });

    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (isMobileSwipe) setStep(0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    if (uploadedPhotoPath) {
      await deleteItemPhoto(uploadedPhotoPath);
      setUploadedPhotoPath("");
    }

    setIsUploading(true);
    setIsAnalyzing(false);

    try {
      const { publicUrl, path } = await uploadItemPhoto(file, campus);
      setUploadedPhotoPath(path);

      setFormData((prev) => ({ ...prev, photo_url: publicUrl }));
      setIsUploading(false);
      setIsAnalyzing(true);

      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: { imageUrl: publicUrl, campus_slug: campus },
      });

      if (error) {
        console.error("AI invoke error:", error);
        return;
      }
      if (!data) return;

      const nextDescriptionRaw = (data.description ?? "").toString();
      const nextDescription = toTitleCase(nextDescriptionRaw);

      const nextCategory = toTitleCase((data.category ?? "").toString());
      const nextLocation = toTitleCase((data.specific_location ?? data.location ?? "").toString());

      const aiSensitive = data.sensitive === true;
      const aiHighValue = data.is_high_value === true;

      const catFlags = nextCategory
        ? categoryFlagsFromName(nextCategory)
        : { isSensitive: false, isHighValue: false };

      const sensitive = aiSensitive || catFlags.isSensitive;
      const is_high_value = aiHighValue || catFlags.isHighValue;

      if (sensitive) {
        await deleteItemPhoto(path);
        setUploadedPhotoPath("");
      }

      setFormData((prev) => ({
        ...prev,
        description: nextDescription || prev.description,
        category: nextCategory || prev.category,
        specific_location: nextLocation || prev.specific_location,
        sensitive,
        is_high_value,
        photo_url: sensitive ? null : publicUrl,
      }));

      setAiFilled({
        description: !!nextDescription,
        category: !!nextCategory,
        specific_location: !!nextLocation,
      });
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

    if (!formData.logged_by_name.trim()) return alert("Staff name is required.");
    if (!formData.description.trim()) return alert("Description is required.");
    if (!formData.category.trim()) return alert("Category is required.");
    if (!(lockedBuilding ? (building as string) : formData.building).trim())
      return alert("Building is required.");
    if (!formData.specific_location.trim()) return alert("Specific location is required.");

    setIsSubmitting(true);

    try {
      const buildingName = lockedBuilding ? (building as string) : formData.building.trim();

      if (!lockedBuilding) {
        const { data: existing, error: selOneErr } = await supabase
          .from("buildings")
          .select("id")
          .eq("campus_slug", campus)
          .eq("name", buildingName)
          .maybeSingle();
        if (selOneErr) throw selOneErr;

        if (!existing) {
          const { error: bErr } = await supabase.from("buildings").upsert(
            [{ name: buildingName, campus_slug: campus, is_system: false }],
            { onConflict: "campus_slug,name" }
          );
          if (bErr) throw bErr;
        }

        const { data: updatedBuildings, error: selErr } = await supabase
          .from("buildings")
          .select("id,name")
          .eq("campus_slug", campus)
          .eq("is_system", false)
          .order("name");
        if (selErr) throw selErr;

        setBuildings((updatedBuildings ?? []) as BuildingRow[]);
      }

      const payload = {
        logged_by_name: formData.logged_by_name.trim(),
        description: toTitleCase(formData.description.trim()),
        category: formData.category.trim(),
        building: buildingName,
        specific_location: formData.specific_location.trim(),
        additional_notes: formData.additional_notes.trim() || null,
        date_found: todayISODate(),
        photo_url: formData.photo_url,
        sensitive: formData.sensitive,
        is_high_value: formData.is_high_value,
        campus_slug: campus,
        status: "available",
      };

      const { error } = await supabase.from("items").insert(payload);
      if (error) throw error;

      const defaultCategory =
        categories.find((c) => c.name === "Other / Unclassified")?.name || categories[0]?.name || "";

      const defaultFlags = defaultCategory
        ? categoryFlagsFromName(defaultCategory)
        : { isSensitive: false, isHighValue: false };

      setFormData((prev) => ({
        ...prev,
        description: "",
        category: defaultCategory,
        building: lockedBuilding ? (building as string) : buildingName,
        specific_location: "",
        additional_notes: "",
        photo_url: null,
        sensitive: defaultFlags.isSensitive,
        is_high_value: defaultFlags.isHighValue,
        // keep logged_by_name so they don’t retype every time:
        logged_by_name: prev.logged_by_name,
      }));

      setAiFilled({ description: false, category: false, specific_location: false });

      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview("");
      setUploadedPhotoPath("");

      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (isMobileSwipe) setStep(0);

      onSuccess();
    } catch (err) {
      console.error("Error adding item:", err);
      alert(err instanceof Error ? err.message : "Failed to add item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isUploading || isAnalyzing;

  const analyzingBanner = busy ? (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="h-5 w-5 animate-pulse" style={{ color: BRAND.accent }} />
        <span className="text-sm font-semibold text-slate-900">
          {isUploading ? "Uploading photo..." : "Analyzing image..."}
        </span>
        <span className="text-sm text-slate-500">Auto-fill is editable.</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full w-1/3 rounded-full"
          style={{
            backgroundColor: BRAND.accent,
            animation: "ffLoading 1.1s infinite linear",
          }}
        />
      </div>
    </div>
  ) : null;

  const aiFieldStyle = (on: boolean) =>
    on ? { backgroundColor: BRAND.sky, borderColor: BRAND.skyBorder } : { backgroundColor: "white" };

  // Desktop UI (full)
  const DesktopUI = (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Review &amp; Log Item</h2>
          <p className="mt-1 text-sm text-slate-600">We’ll auto-detect the item, category, and location.</p>
        </div>
      </div>

      {loadingOptions ? (
        <div className="px-6 py-6 text-slate-600">Loading buildings and categories…</div>
      ) : (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT: Photo */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 min-w-0">
              <div className="flex items-center justify-between min-w-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shrink-0">
                    <ImageIcon className="h-5 w-5 text-slate-700" />
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 truncate">Photo</div>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shrink-0">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: BRAND.accent }} />
                  Auto-detects details
                </span>
              </div>

              <div className="mt-5">
                {photoPreview ? (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-72 w-full object-cover select-none"
                        style={{ WebkitUserDrag: "none" }}
                        draggable={false}
                      />

                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-2 text-white"
                        style={{ backgroundColor: BRAND.ink }}
                        title="Remove photo"
                      >
                        <X className="h-5 w-5" />
                      </button>

                      {formData.sensitive ? (
                        <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                          Sensitive item detected — photo will not be stored.
                        </div>
                      ) : null}
                    </div>

                    {analyzingBanner}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-slate-300"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shrink-0"
                          style={{ backgroundColor: BRAND.ink }}
                        >
                          <Camera className="h-7 w-7" />
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="text-base font-extrabold text-slate-900 truncate">Take / Upload Photo</div>
                          <div className="mt-1 text-sm text-slate-600">Tap once. We’ll fill in the details.</div>
                        </div>
                      </div>

                      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Tip: include the item and any labels in frame for best results. Try not to include brand names.
                      </div>
                    </button>

                    {analyzingBanner}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Fields */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 min-w-0">
              <div className="mb-5">
                <FieldLabel icon={User} text="Logged by" required />
                <input
                  type="text"
                  name="logged_by_name"
                  value={formData.logged_by_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Your name"
                  className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                />
              </div>

              <div className="mb-5">
                <FieldLabel icon={FileText} text="Description" required ai={aiFilled.description} />
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Black plastic water bottle"
                  className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  style={{ ...aiFieldStyle(aiFilled.description), boxShadow: "none" }}
                />
              </div>

              <div className="mb-5">
                <FieldLabel icon={Building2} text="Building" required />
                {lockedBuilding ? (
                  <input
                    type="text"
                    value={formData.building}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800"
                  />
                ) : (
                  <select
                    name="building"
                    value={formData.building}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mb-5">
                <FieldLabel
                  icon={MapPin}
                  text="Where exactly was it found?"
                  required
                  ai={aiFilled.specific_location}
                />
                <input
                  type="text"
                  name="specific_location"
                  value={formData.specific_location}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 2nd floor near water fountain, Room 234"
                  className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  style={{ ...aiFieldStyle(aiFilled.specific_location), boxShadow: "none" }}
                />
              </div>

              <div className="mb-5">
                <FieldLabel icon={Tag} text="Category" required ai={aiFilled.category} />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border px-4 py-3 text-slate-900 focus:outline-none focus:ring-2"
                  style={{ ...aiFieldStyle(aiFilled.category) }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {(formData.is_high_value || formData.sensitive) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {formData.is_high_value && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-800">
                        High value
                      </span>
                    )}
                    {formData.sensitive && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-900">
                        Sensitive
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <FieldLabel icon={StickyNote} text="Additional Notes" />
                <textarea
                  name="additional_notes"
                  value={formData.additional_notes}
                  onChange={handleInputChange}
                  placeholder="Any extra details staff should know…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || busy}
                className="w-full rounded-2xl px-6 py-4 text-base font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: BRAND.ink }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND.inkHover;
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND.ink;
                }}
              >
                {isSubmitting ? "Logging..." : "Log Item"}
              </button>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: BRAND.accent }} />
                  Auto-fill is editable
                </span>
              </div>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="mt-4 text-xs text-amber-700">No categories found for this campus. Add categories in the DB.</div>
          ) : null}
        </div>
      )}
    </>
  );

  // Mobile UI (3 pages)
  const MobileUI = (
    <>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900">Log Item</h2>
            <p className="mt-1 text-sm text-slate-600">Swipe to move through steps.</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 shrink-0">
            <Clock className="h-4 w-4" />
            <span className="font-medium">~10 sec</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-10 rounded-full transition-all"
              style={{ backgroundColor: i === step ? BRAND.ink : "#e5e7eb" }}
            />
          ))}
        </div>
      </div>

      {busy && <div className="px-5 pt-3">{analyzingBanner}</div>}

      {loadingOptions ? (
        <div className="px-5 py-6 text-slate-600">Loading…</div>
      ) : (
        <SnapPager step={step} setStep={setStep}>
          {/* Step 0: Photo */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0">
            <div className="flex items-center justify-between min-w-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shrink-0">
                  <ImageIcon className="h-5 w-5 text-slate-700" />
                </span>
                <div className="text-sm font-extrabold text-slate-900 truncate">Photo</div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shrink-0">
                <Sparkles className="h-3.5 w-3.5" style={{ color: BRAND.accent }} />
                Auto-detects
              </span>
            </div>

            <div className="mt-4">
              {photoPreview ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-72 w-full object-cover"
                      draggable={false}
                      style={{ WebkitUserDrag: "none", userSelect: "none", pointerEvents: "none" }}
                    />

                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-2 text-white"
                      style={{ backgroundColor: BRAND.ink }}
                      title="Remove photo"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    {formData.sensitive ? (
                      <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                        Sensitive item detected — photo will not be stored.
                      </div>
                    ) : null}
                  </div>

                  {analyzingBanner}
                  <div className="text-xs text-slate-500">Swipe left to continue.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left active:border-slate-300"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shrink-0"
                        style={{ backgroundColor: BRAND.ink }}
                      >
                        <Camera className="h-7 w-7" />
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-base font-extrabold text-slate-900 truncate">Take / Upload</div>
                        <div className="mt-1 text-sm text-slate-600">One tap. We’ll fill in the details.</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Keep labels in frame. Avoid brand names.
                    </div>
                  </button>

                  {analyzingBanner}
                  <div className="text-xs text-slate-500">Swipe left after adding a photo.</div>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Identify */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 min-w-0">
            <div className="mb-4 text-sm font-extrabold text-slate-900">Identify</div>

            <div className="mb-5">
              <FieldLabel icon={FileText} text="Description" required ai={aiFilled.description} />
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="e.g., Black plastic water bottle"
                className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                style={{ ...aiFieldStyle(aiFilled.description), boxShadow: "none" }}
              />
            </div>

            <div className="mb-5">
              <FieldLabel icon={Tag} text="Category" required ai={aiFilled.category} />
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl border px-4 py-3 text-slate-900 focus:outline-none focus:ring-2"
                style={{ ...aiFieldStyle(aiFilled.category) }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {(formData.is_high_value || formData.sensitive) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {formData.is_high_value && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-800">
                      High value
                    </span>
                  )}
                  {formData.sensitive && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-900">
                      Sensitive
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mb-2">
              <FieldLabel icon={Building2} text="Building" required />
              {lockedBuilding ? (
                <input
                  type="text"
                  value={formData.building}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800"
                />
              ) : (
                <select
                  name="building"
                  value={formData.building}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-4 text-xs text-slate-500">Swipe left to continue.</div>
          </div>

          {/* Step 2: Context + Submit */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 min-w-0">
            <div className="mb-4 text-sm font-extrabold text-slate-900">Context</div>

            <div className="mb-5">
              <FieldLabel icon={User} text="Logged by" required />
              <input
                type="text"
                name="logged_by_name"
                value={formData.logged_by_name}
                onChange={handleInputChange}
                required
                placeholder="Your name"
                className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
              />
            </div>

            <div className="mb-5">
              <FieldLabel icon={MapPin} text="Where exactly was it found?" required ai={aiFilled.specific_location} />
              <input
                type="text"
                name="specific_location"
                value={formData.specific_location}
                onChange={handleInputChange}
                required
                placeholder="e.g., 2nd floor near water fountain, Room 234"
                className="w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                style={{ ...aiFieldStyle(aiFilled.specific_location), boxShadow: "none" }}
              />
            </div>

            <div className="mb-5">
              <FieldLabel icon={StickyNote} text="Additional Notes" />
              <textarea
                name="additional_notes"
                value={formData.additional_notes}
                onChange={handleInputChange}
                placeholder="Any extra details staff should know…"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || busy}
              className="w-full rounded-2xl px-6 py-4 text-base font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: BRAND.ink }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND.inkHover;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND.ink;
              }}
            >
              {isSubmitting ? "Logging..." : "Log Item"}
            </button>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" style={{ color: BRAND.accent }} />
                Auto-fill is editable
              </span>
              <span>You can edit this later</span>
            </div>
          </div>
        </SnapPager>
      )}
    </>
  );

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {isMobileSwipe ? MobileUI : DesktopUI}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={isMobileSwipe ? "environment" : undefined}
        onChange={handleFileSelect}
        className="hidden"
      />
    </form>
  );
}
