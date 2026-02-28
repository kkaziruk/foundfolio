declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function pushEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...payload });
}

export function trackPageView(path: string) {
  pushEvent('page_view', {
    page_path: path,
  });
}

export function trackAuthCompleted(params: { role: string; campus: string }) {
  pushEvent('auth_completed', {
    role: params.role,
    campus: params.campus,
  });
}

export function trackSearchExecuted(params: {
  campus: string;
  query: string;
  category: string;
  color: string;
  building: string;
  results_count: number;
}) {
  pushEvent('search_executed', params);
}

export function trackItemViewed(params: { item_id: string; campus: string }) {
  pushEvent('item_viewed', params);
}

export function trackClaimSubmitted(params: { item_id: string; campus: string }) {
  pushEvent('claim_submitted', params);
}

export function trackClaimResolved(params: {
  item_id: string;
  campus: string;
  status: string;
}) {
  pushEvent('claim_resolved', params);
}
