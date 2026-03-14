import { ArrowLeft, MapPin, Tag, Calendar } from "lucide-react";
import { Item } from "../lib/supabase";

interface ItemDetailProps {
  item: Item;
  onBack: () => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Found today";
  if (diff === 1) return "Found yesterday";
  if (diff < 30) return `Found ${diff} days ago`;
  return `Found ${formatDate(dateStr)}`;
}

export default function ItemDetail({ item, onBack }: ItemDetailProps) {
  const dateLabel = daysAgo(item.date_found as string | null | undefined);
  const dateFormatted = formatDate(item.date_found as string | null | undefined);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)" }}>

          {/* Image */}
          {item.photo_url ? (
            <div className="w-full aspect-[4/3] sm:aspect-[16/7] overflow-hidden bg-slate-100">
              <img
                src={item.photo_url}
                alt={item.description}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] sm:aspect-[16/7] bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2">
              <Tag className="w-12 h-12 text-slate-300" />
              <span className="text-xs text-slate-400 font-medium">No photo</span>
            </div>
          )}

          {/* Content */}
          <div className="p-5 sm:p-7">
            {/* Date label */}
            {dateLabel && (
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                {dateLabel}
              </p>
            )}

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug mb-5">
              {item.description}
            </h1>

            {/* Metadata rows */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Category</p>
                  <p className="text-sm font-semibold text-slate-800">{item.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Location</p>
                  <p className="text-sm font-semibold text-slate-800">{item.building}</p>
                </div>
              </div>

              {dateFormatted && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Date found</p>
                    <p className="text-sm font-semibold text-slate-800">{dateFormatted}</p>
                  </div>
                </div>
              )}
            </div>

            {/* CTA note */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-sm text-slate-500 leading-relaxed">
                If this looks like your item, visit <span className="font-semibold text-slate-700">{item.building}</span> to claim it. Bring your student ID.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes intentionally hidden from student view (sensitive). */}
    </div>
  );
}
