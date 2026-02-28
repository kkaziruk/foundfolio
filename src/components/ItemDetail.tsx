import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Tag, CalendarDays, ShieldCheck, Hand } from 'lucide-react';
import { ClaimRequest, ClaimStatus, StudentSafeItem, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { trackClaimSubmitted } from '../lib/analytics';

interface ItemDetailProps {
  item: StudentSafeItem;
  onBack: () => void;
}

const CLAIM_STEPS: Array<{ key: ClaimStatus; label: string }> = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
];

const formatFoundDate = (dateValue: string) => {
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return dateValue;
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(dt);
};

export default function ItemDetail({ item, onBack }: ItemDetailProps) {
  const { user } = useAuth();

  const [claimOpen, setClaimOpen] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimMessage, setClaimMessage] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [claimStatusLoading, setClaimStatusLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setClaimStatus(null);
      return;
    }

    let cancelled = false;
    const loadClaimStatus = async () => {
      setClaimStatusLoading(true);
      const { data, error } = await supabase
        .from('claim_requests')
        .select('id,status,created_at')
        .eq('item_id', item.id)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load claim status:', error);
      }

      if (!cancelled) {
        setClaimStatus(((data as Pick<ClaimRequest, 'status'> | null)?.status ?? null) as ClaimStatus | null);
        setClaimStatusLoading(false);
      }
    };

    loadClaimStatus().catch((err) => {
      console.error('Claim status load failed:', err);
      if (!cancelled) setClaimStatusLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [item.id, user]);

  const closeClaimModal = () => {
    if (submittingClaim) return;
    setClaimOpen(false);
    setClaimError('');
    setClaimSubmitted(false);
    setClaimName('');
    setClaimEmail('');
    setClaimMessage('');
  };

  const submitClaimRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingClaim || !user) return;

    setSubmittingClaim(true);
    setClaimError('');

    const payload = {
      item_id: item.id,
      requester_user_id: user.id,
      claimant_name: claimName.trim() ? claimName.trim() : null,
      claimant_email: claimEmail.trim() ? claimEmail.trim() : null,
      claimant_note: claimMessage.trim(),
      status: 'submitted' as ClaimStatus,
    };

    const { error } = await supabase.from('claim_requests').insert(payload);

    if (error) {
      console.error('Claim request failed:', error);
      if (error.code === '23505') {
        setClaimError('A claim is already active for this item. Staff will follow up with the current claimant first.');
      } else {
        setClaimError('Unable to submit claim request right now. Please try again shortly.');
      }
      setSubmittingClaim(false);
      return;
    }

    trackClaimSubmitted({ item_id: item.id, campus: item.campus_slug });
    setClaimSubmitted(true);
    setClaimStatus('submitted');
    setSubmittingClaim(false);
  };

  const activeStepIndex = useMemo(() => {
    if (!claimStatus) return -1;
    return CLAIM_STEPS.findIndex((step) => step.key === claimStatus);
  }, [claimStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Search</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.description} className="w-full h-[22rem] object-cover" />
          ) : (
            <div className="w-full h-[22rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Tag className="w-24 h-24 text-slate-400" />
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{item.description}</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">
                <ShieldCheck className="h-4 w-4" />
                Available
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {item.category}
              </span>
              {item.color && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  {item.color}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#D1FAE5] rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm text-[#374151] font-medium">Building</p>
                  <p className="text-lg text-black">{item.building}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#DBEAFE] rounded-lg flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-sm text-[#374151] font-medium">Date Logged</p>
                  <p className="text-lg text-black">{formatFoundDate(item.date_found)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900 font-semibold">Think this is yours?</p>
              <p className="mt-1 text-sm text-blue-800">
                Submit a claim request so campus staff can verify ownership and contact you.
              </p>
              <button
                type="button"
                onClick={() => setClaimOpen(true)}
                disabled={claimStatus === 'submitted' || claimStatus === 'reviewing' || claimStatus === 'ready_for_pickup'}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] md:w-auto disabled:opacity-50"
              >
                <Hand className="h-4 w-4" />
                {claimStatus ? 'Claim Already Submitted' : 'This is My Item'}
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Claim status</p>
                {claimStatusLoading ? (
                  <span className="text-xs text-slate-500">Loading...</span>
                ) : claimStatus ? (
                  <span className="text-xs font-semibold text-blue-700">{claimStatus.replace(/_/g, ' ')}</span>
                ) : (
                  <span className="text-xs text-slate-500">Not submitted</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CLAIM_STEPS.map((step, index) => {
                  const active = activeStepIndex >= index;
                  return (
                    <div
                      key={step.key}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Claim Request</h2>
                <p className="text-sm text-slate-600">Item: {item.description}</p>
              </div>
              <button
                type="button"
                onClick={closeClaimModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close claim request modal"
              >
                ✕
              </button>
            </div>

            {claimSubmitted ? (
              <div className="px-6 py-8">
                <p className="text-slate-900 font-medium">Claim request submitted.</p>
                <p className="mt-2 text-sm text-slate-600">
                  Staff will review your request and follow up if more details are needed.
                </p>
                <button
                  type="button"
                  onClick={closeClaimModal}
                  className="mt-6 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitClaimRequest} className="space-y-4 px-6 py-6">
                <div>
                  <label htmlFor="claim-name" className="mb-2 block text-sm font-medium text-slate-700">
                    Name (optional)
                  </label>
                  <input
                    id="claim-name"
                    value={claimName}
                    onChange={(event) => setClaimName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                <div>
                  <label htmlFor="claim-email" className="mb-2 block text-sm font-medium text-slate-700">
                    Email (optional)
                  </label>
                  <input
                    id="claim-email"
                    type="email"
                    value={claimEmail}
                    onChange={(event) => setClaimEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                <div>
                  <label htmlFor="claim-message" className="mb-2 block text-sm font-medium text-slate-700">
                    Why this is yours
                  </label>
                  <textarea
                    id="claim-message"
                    required
                    minLength={8}
                    rows={4}
                    value={claimMessage}
                    onChange={(event) => setClaimMessage(event.target.value)}
                    placeholder="Share identifying details staff can verify."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                {claimError && <p className="text-sm text-red-700">{claimError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeClaimModal}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
