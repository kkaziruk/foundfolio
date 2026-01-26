// src/components/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  Shield,
  Star,
  BarChart3,
  MapPin,
  Tag,
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface AdminDashboardProps {
  campus: string;
  building: string; // "All Buildings" or building name
}

type SummaryRow = {
  sort_rank: number;
  building_key: string;
  building_name: string;
  items_logged: number;
  items_available: number;
  items_picked_up: number;
  pickup_rate: number | null; // 0..1 (items > 48h)
  avg_hours_to_pickup: number | null; // picked only
  avg_hours_unpicked_age: number | null; // unpicked only (pain metric)
  oldest_unpicked_hours: number | null;
  oldest_unpicked_label: string | null;
  high_value_count: number;
  sensitive_count: number;
  high_value_unpicked_72h: number;
  sensitive_unpicked_72h: number;
};

type TimeseriesRow = {
  day: string; // date string
  logged_count: number;
  picked_up_count: number;
};

type BreakdownRow = {
  category?: string;
  specific_location?: string;
  count: number;
};

const RANGE_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: null },
];

function fmtPct01(x: number | null | undefined) {
  const v = typeof x === "number" ? x : 0;
  return `${(v * 100).toFixed(1)}%`;
}

function fmtHours(x: number | null | undefined) {
  if (x == null || Number.isNaN(x)) return "—";
  if (x < 1) return `${Math.round(x * 60)}m`;
  if (x < 48) return `${x.toFixed(1)}h`;
  return `${(x / 24).toFixed(1)}d`;
}

export default function AdminDashboard({ campus, building }: AdminDashboardProps) {
  const isAllBuildings = building === "All Buildings";

  const [rangeDays, setRangeDays] = useState<number | null>(30);

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<BreakdownRow[]>([]);
  const [locationRows, setLocationRows] = useState<BreakdownRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const campusRow = useMemo(() => {
    return summaryRows.find((r) => r.building_key === "__all__") ?? null;
  }, [summaryRows]);

  const buildingRow = useMemo(() => {
    if (isAllBuildings) return null;
    const key = building.trim().toLowerCase();
    return (
      summaryRows.find((r) => r.building_key === key) ??
      summaryRows.find((r) => r.building_name === building) ??
      null
    );
  }, [summaryRows, building, isAllBuildings]);

  const perBuildingRows = useMemo(() => {
    return summaryRows.filter((r) => r.building_key !== "__all__");
  }, [summaryRows]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      const buildingParam = isAllBuildings ? null : building;

      const summaryCall = supabase.rpc("analytics_building_summary", {
        p_campus_slug: campus,
        p_days: rangeDays,
      });

      const seriesCall = supabase.rpc("analytics_timeseries", {
        p_campus_slug: campus,
        p_building: buildingParam,
        p_days: rangeDays,
      });

      const categoryCall = isAllBuildings
        ? Promise.resolve({ data: [], error: null } as any)
        : supabase.rpc("analytics_category_breakdown", {
            p_campus_slug: campus,
            p_building: building,
            p_days: rangeDays,
          });

      const locationCall = isAllBuildings
        ? Promise.resolve({ data: [], error: null } as any)
        : supabase.rpc("analytics_location_breakdown", {
            p_campus_slug: campus,
            p_building: building,
            p_days: rangeDays,
          });

      const [s, t, c, l] = await Promise.all([
        summaryCall,
        seriesCall,
        categoryCall,
        locationCall,
      ]);

      if (s.error) throw s.error;
      if (t.error) throw t.error;
      if (c.error) throw c.error;
      if (l.error) throw l.error;

      if (cancelled) return;

      setSummaryRows((s.data ?? []) as SummaryRow[]);
      setSeries((t.data ?? []) as TimeseriesRow[]);
      setCategoryRows((c.data ?? []) as BreakdownRow[]);
      setLocationRows((l.data ?? []) as BreakdownRow[]);
      setLoading(false);
    };

    load().catch((e) => {
      console.error(e);
      if (!cancelled) {
        setError("Failed to load analytics.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [campus, building, rangeDays, isAllBuildings]);

  const headlineRow = isAllBuildings ? campusRow : buildingRow;

  const totalLogged = headlineRow?.items_logged ?? 0;
  const available = headlineRow?.items_available ?? 0;
  const pickedUp = headlineRow?.items_picked_up ?? 0;

  const pickupRate = headlineRow?.pickup_rate ?? 0;

  const avgHoursToPickup = headlineRow?.avg_hours_to_pickup ?? null;
  const avgHoursUnpicked = headlineRow?.avg_hours_unpicked_age ?? null;

  const oldestUnpickedHours = headlineRow?.oldest_unpicked_hours ?? null;
  const oldestUnpickedLabel = headlineRow?.oldest_unpicked_label ?? null;

  const highValueTotal = headlineRow?.high_value_count ?? 0;
  const sensitiveTotal = headlineRow?.sensitive_count ?? 0;

  const highValue72 = headlineRow?.high_value_unpicked_72h ?? 0;
  const sensitive72 = headlineRow?.sensitive_unpicked_72h ?? 0;

  const maxY = useMemo(() => {
    let m = 0;
    for (const r of series) {
      m = Math.max(m, r.logged_count, r.picked_up_count);
    }
    return m || 1;
  }, [series]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-red-200">
        <div className="text-red-700 font-semibold mb-1">Analytics error</div>
        <div className="text-slate-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header + range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-600">
            {isAllBuildings ? "Campus overview" : `Building overview: ${building}`}
          </p>
        </div>

        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setRangeDays(opt.days)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                rangeDays === opt.days
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Available (Backlog)</h3>
          <p className="text-3xl font-bold text-slate-900">{available}</p>
          <p className="text-sm text-slate-500 mt-2">Logged: {totalLogged}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Picked Up</h3>
          <p className="text-3xl font-bold text-slate-900">{pickedUp}</p>
          <p className="text-sm text-slate-500 mt-2">
            Pickup rate (items &gt; 48h): {fmtPct01(pickupRate)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Avg age of unpicked</h3>
          <p className="text-3xl font-bold text-slate-900">{fmtHours(avgHoursUnpicked)}</p>
          <p className="text-sm text-slate-500 mt-2">Items still awaiting pickup</p>
        </div>
      </div>

      {/* Oldest outstanding */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-sm font-medium text-slate-600">Oldest unpicked item</div>
        <div className="text-xl font-semibold text-slate-900 mt-1">
          {fmtHours(oldestUnpickedHours)}
          {oldestUnpickedLabel ? (
            <span className="text-slate-600 font-medium"> · {oldestUnpickedLabel}</span>
          ) : null}
        </div>
        {/* Optional: keep this honest metric around as a footnote */}
        <div className="text-xs text-slate-500 mt-2">
          Avg time to pickup (picked items only): {fmtHours(avgHoursToPickup)}
        </div>
      </div>

      {/* Risk / special handling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-slate-700" />
            </div>
            <div className="text-lg font-semibold text-slate-900">High-value items</div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{highValue72}</div>
          <div className="text-sm text-slate-600 mt-2">
            Unpicked &gt; 72h · Total logged: {highValueTotal}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-700" />
            </div>
            <div className="text-lg font-semibold text-slate-900">Sensitive items</div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{sensitive72}</div>
          <div className="text-sm text-slate-600 mt-2">
            Unpicked &gt; 72h · Total logged: {sensitiveTotal}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">Trend</div>
              <div className="text-sm text-slate-600">Logged vs picked up</div>
            </div>
          </div>
        </div>

        {series.length === 0 ? (
          <div className="text-slate-600">No data in this range.</div>
        ) : (
          <div className="space-y-2">
            {series.slice(-14).map((r) => {
              const loggedW = Math.round((r.logged_count / maxY) * 100);
              const pickedW = Math.round((r.picked_up_count / maxY) * 100);
              return (
                <div key={r.day} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-500">{r.day}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded">
                      <div
                        className="h-2 bg-slate-400 rounded"
                        style={{ width: `${loggedW}%` }}
                        title={`Logged: ${r.logged_count}`}
                      />
                    </div>
                    <div className="h-2 bg-slate-100 rounded mt-1">
                      <div
                        className="h-2 bg-slate-900 rounded"
                        style={{ width: `${pickedW}%` }}
                        title={`Picked up: ${r.picked_up_count}`}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-xs text-slate-600 text-right">
                    {r.logged_count}/{r.picked_up_count}
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-slate-500 mt-3">
              Top bar = logged, bottom bar = picked up (last 14 days shown).
            </div>
          </div>
        )}
      </div>

      {/* Campus table OR building breakdown */}
      {isAllBuildings ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-lg font-semibold text-slate-900 mb-4">Buildings</div>

          {perBuildingRows.length === 0 ? (
            <div className="text-slate-600">No buildings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2 pr-4">Building</th>
                    <th className="py-2 pr-4">Logged</th>
                    <th className="py-2 pr-4">Available</th>
                    <th className="py-2 pr-4">Picked up</th>
                    <th className="py-2 pr-4">Pickup rate</th>
                    <th className="py-2 pr-4">Avg time (picked)</th>
                    <th className="py-2 pr-4">Avg age (unpicked)</th>
                  </tr>
                </thead>
                <tbody>
                  {perBuildingRows.map((r) => (
                    <tr key={r.building_key} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-slate-900">{r.building_name}</td>
                      <td className="py-3 pr-4 text-slate-700">{r.items_logged}</td>
                      <td className="py-3 pr-4 text-slate-700">{r.items_available}</td>
                      <td className="py-3 pr-4 text-slate-700">{r.items_picked_up}</td>
                      <td className="py-3 pr-4 text-slate-700">{fmtPct01(r.pickup_rate)}</td>
                      <td className="py-3 pr-4 text-slate-700">
                        {fmtHours(r.avg_hours_to_pickup)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {fmtHours(r.avg_hours_unpicked_age)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-slate-500 mt-3">
            Tip: switch the building dropdown above to drill into a building.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Top categories</div>
                <div className="text-sm text-slate-600">Most logged</div>
              </div>
            </div>

            {categoryRows.length === 0 ? (
              <div className="text-slate-600">No category data.</div>
            ) : (
              <div className="space-y-2">
                {categoryRows.slice(0, 10).map((r, idx) => (
                  <div
                    key={`${r.category ?? "cat"}-${idx}`}
                    className="flex items-center justify-between"
                  >
                    <div className="text-slate-900 font-medium truncate max-w-[75%]">
                      {r.category ?? "Uncategorized"}
                    </div>
                    <div className="text-slate-700">{r.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Top locations</div>
                <div className="text-sm text-slate-600">Most frequent spots</div>
              </div>
            </div>

            {locationRows.length === 0 ? (
              <div className="text-slate-600">No location data.</div>
            ) : (
              <div className="space-y-2">
                {locationRows.slice(0, 12).map((r, idx) => (
                  <div
                    key={`${r.specific_location ?? "loc"}-${idx}`}
                    className="flex items-center justify-between"
                  >
                    <div className="text-slate-900 font-medium truncate max-w-[75%]">
                      {r.specific_location ?? "Unknown"}
                    </div>
                    <div className="text-slate-700">{r.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
