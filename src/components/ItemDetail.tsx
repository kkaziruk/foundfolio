import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Tag, Calendar, CheckCircle, ArrowRight, Circle, X, Copy, Check } from "lucide-react";
import { Item, supabase } from "../lib/supabase";

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

export default function ItemDetail({ item, onBack }: ItemDetailProps) {
  const dateFormatted = formatDate(item.date_found as string | null | undefined);
  const isClaimed = item.status === "claimed" || item.status === "picked_up";

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimHours, setClaimHours] = useState<string | null>(null);
  const [policyNote, setPolicyNote] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);

  useEffect(() => {
    const building = item.building;
    const campus = item.campus_slug;
    if (!building || !campus) return;

    Promise.all([
      supabase
        .from("buildings")
        .select("claim_hours")
        .eq("campus_slug", campus)
        .eq("name", building)
        .maybeSingle(),
      supabase
        .from("campuses")
        .select("policy_note,contact_email")
        .eq("slug", campus)
        .maybeSingle(),
    ]).then(([buildingRes, campusRes]) => {
      setClaimHours(buildingRes.data?.claim_hours ?? null);
      setPolicyNote(campusRes.data?.policy_note ?? null);
      setContactEmail(campusRes.data?.contact_email ?? null);
    });
  }, [item.building, item.campus_slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hoursLine = claimHours ?? "Contact the building for current hours";

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
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-3">
              {isClaimed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <CheckCircle className="w-3 h-3" />
                  Claimed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Circle className="w-3 h-3" />
                  Available
                </span>
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

            {/* Where to claim */}
            {!isClaimed && (
              <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-900 mb-0.5">
                      Where to claim
                    </p>
                    <p className="text-sm font-semibold text-blue-800 mb-1">
                      {item.building} — Lost &amp; Found desk
                    </p>
                    <p className="text-xs text-blue-600 mb-3">{hoursLine}</p>
                    <div className="space-y-1.5">
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
                    {policyNote && (
                      <p className="text-xs text-blue-700 mt-3 pt-3 border-t border-blue-100 italic">{policyNote}</p>
                    )}
                    {contactEmail && (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="inline-block text-xs text-blue-600 underline mt-2 hover:text-blue-800"
                      >
                        Questions? Email {contactEmail}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            {!isClaimed && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="mt-4 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
              >
                This looks like mine →
              </button>
            )}

            {isClaimed && (
              <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">This item has been claimed</p>
                    <p className="text-xs text-amber-700 mt-0.5">The owner has already picked it up.</p>
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

      {/* "This looks like mine" modal */}
      {showClaimModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClaimModal(false); }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Ready to claim this?</h2>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm font-bold text-blue-900 mb-1">Head to the lost &amp; found desk</p>
                <p className="text-sm font-semibold text-blue-800">{item.building}</p>
                <p className="text-xs text-blue-600 mt-0.5">{hoursLine}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What to bring</p>
                <div className="space-y-1.5">
                  {[
                    "Student ID or NetID",
                    "A description of the item — color, brand, any unique marks",
                    "Any proof of ownership if available",
                  ].map((tip) => (
                    <div key={tip} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Link copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy link to this item
                  </>
                )}
              </button>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setShowClaimModal(false)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
              >
                Got it — I'll head over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
