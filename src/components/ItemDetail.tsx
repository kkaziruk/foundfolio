import { ArrowLeft, MapPin, Tag, Calendar, CheckCircle, ArrowRight, Circle } from "lucide-react";
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
  const isClaimed = item.status === "claimed" || item.status === "picked_up";

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
        <div
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)" }}
        >
          {/* Image */}
          {item.photo_url ? (
            <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src={item.photo_url}
                alt={item.description}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center">
                <Tag className="w-8 h-8 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400 font-medium">No photo</span>
            </div>
          )}

          {/* Content */}
          <div className="p-5 sm:p-7">
            {/* Status badge + date */}
            <div className="flex items-center gap-2 mb-3">
              {isClaimed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-3 h-3" />
                  Claimed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Circle className="w-3 h-3" />
                  Available
                </span>
              )}
              {dateLabel && (
                <span className="text-xs font-medium text-slate-400">{dateLabel}</span>
              )}
            </div>

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
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Building</p>
                  <p className="text-sm font-semibold text-slate-800">{item.building}</p>
                </div>
              </div>

              {dateFormatted && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Date found</p>
                    <p className="text-sm font-semibold text-slate-800">{dateFormatted}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Where to go — claim CTA */}
            {!isClaimed && (
              <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-900 mb-0.5">
                      Where to go
                    </p>
                    <p className="text-sm font-semibold text-blue-800 mb-1">
                      {item.building} — Lost &amp; Found desk
                    </p>
                    <div className="space-y-1.5 mt-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700">Bring your student ID or NetID</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700">Be ready to describe the item in detail</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700">Items are held at the building's front desk</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isClaimed && (
              <div className="mt-6 rounded-xl bg-green-50 border border-green-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-900">This item has been claimed</p>
                    <p className="text-xs text-green-700 mt-0.5">The owner has already picked it up.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back link at bottom */}
        <div className="mt-4 text-center">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            ← Search for another item
          </button>
        </div>
      </div>

      {/* Additional Notes intentionally hidden from student view (sensitive). */}
    </div>
  );
}
