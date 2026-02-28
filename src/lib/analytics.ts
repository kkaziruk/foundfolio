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

export function trackStudentSearchSubmission(params: {
  campus: string;
  hasText: boolean;
  category: string;
  color: string;
  building: string;
}) {
  pushEvent('student_search_submitted', {
    campus: params.campus,
    has_text_query: params.hasText,
    category: params.category,
    color: params.color,
    building: params.building,
  });
}
