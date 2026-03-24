// src/lib/dates.ts
export function formatLoggedAt(ts?: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
