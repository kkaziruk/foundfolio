import { FormEvent, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { FeedbackReportInsert, supabase } from '../lib/supabase';

interface FeedbackReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    route: string;
    role: "student" | "building_manager" | "campus_admin" | "unknown";
    itemId?: string | null;
  };
}

type FeedbackType = FeedbackReportInsert['type'];

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
];

const isFeedbackType = (value: string): value is FeedbackType =>
  TYPE_OPTIONS.some((option) => option.value === value);

export default function FeedbackReportModal({ isOpen, onClose, context }: FeedbackReportModalProps) {
  const [helpQuery, setHelpQuery] = useState('');
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => message.trim().length >= 8, [message]);
  const helpTopics = useMemo(
    () => [
      'How to search by building and category',
      'How to submit a claim request',
      'How staff review claim requests',
      'How to move items between buildings',
      'How to export building CSV reports',
    ],
    []
  );
  const filteredTopics = useMemo(() => {
    const q = helpQuery.trim().toLowerCase();
    if (!q) return helpTopics;
    return helpTopics.filter((topic) => topic.toLowerCase().includes(q));
  }, [helpQuery, helpTopics]);

  if (!isOpen) return null;

  const resetForm = () => {
    setType('bug');
    setMessage('');
    setEmail('');
    setSubmitting(false);
    setErrorMessage('');
    setSubmitted(false);
  };

  const closeModal = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setErrorMessage('');

    const payload: FeedbackReportInsert = {
      type,
      message: [
        message.trim(),
        context
          ? `\n---\nContext: route=${context.route}; role=${context.role}; item_id=${context.itemId ?? "n/a"}`
          : "",
      ].join(""),
      email: email.trim() ? email.trim() : null,
    };

    const { error } = await supabase.from('feedback_reports').insert(payload);

    if (error) {
      console.error('Feedback submission failed:', error);
      setErrorMessage('Unable to submit right now. Please try again shortly.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Report Issue</h2>
            <p className="text-sm text-slate-600">Share bugs or suggestions with the FoundFolio team.</p>
            {context && (
              <p className="mt-1 text-xs text-slate-500">
                Context attached: {context.role} · {context.route}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close report issue modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-8">
            <p className="text-slate-900 font-medium">Thanks, your report has been submitted.</p>
            <p className="mt-2 text-sm text-slate-600">We review these regularly and use them to improve the system.</p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-6 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label htmlFor="help-search" className="mb-2 block text-sm font-medium text-slate-700">
                Help Topics
              </label>
              <input
                id="help-search"
                value={helpQuery}
                onChange={(event) => setHelpQuery(event.target.value)}
                placeholder="Search help topics"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {filteredTopics.slice(0, 4).map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setMessage((prev) => (prev ? `${prev}\n` : '') + `Help topic: ${topic}`)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-type" className="mb-2 block text-sm font-medium text-slate-700">
                Type
              </label>
              <select
                id="feedback-type"
                value={type}
                onChange={(event) => {
                  if (isFeedbackType(event.target.value)) {
                    setType(event.target.value);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="feedback-message" className="mb-2 block text-sm font-medium text-slate-700">
                Message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                minLength={8}
                rows={5}
                placeholder="Tell us what happened or what you'd like to see improved."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>

            <div>
              <label htmlFor="feedback-email" className="mb-2 block text-sm font-medium text-slate-700">
                Email (optional)
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@school.edu"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>

            {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
