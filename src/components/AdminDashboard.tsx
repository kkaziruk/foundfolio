// src/components/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "../lib/supabase";

interface AdminDashboardProps {
  campus: string;
  building: string;
}

type SummaryRow = {
  sort_rank: number;
  building_key: string;
  building_name: string;
  items_logged: number;
  items_available: number;
  items_picked_up: number;
  pickup_rate: number | null;
  avg_hours_to_pickup: number | null;
  avg_hours_unpicked_age: number | null;
  oldest_unpicked_hours: number | null;
  oldest_unpicked_label: string | null;
  high_value_count: number;
  sensitive_count: number;
  high_value_unpicked_72h: number;
  sensitive_unpicked_72h: number;
};

type TimeseriesRow = {
  day: string;
  logged_count: number;
  picked_up_count: number;
};

type BreakdownRow = {
  category?: string;
  specific_location?: string;
  count: number;
};

const RANGE_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: "Week", days: 7 },
  { label: "Month", days: 30 },
  { label: "Semester", days: 112 },
  { label: "All", days: null },
];

const CHART_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#06B6D4", "#F97316", "#84CC16",
  "#EC4899", "#6366F1",
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

function fmtDayLabel(day: string, rangeDays: number | null) {
  const d = new Date(day);
  if (rangeDays === 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  if (rangeDays === 30) return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard({ campus, building }: AdminDashboardProps) {
  const isAllBuildings = building === "All Buildings";

  const [rangeDays, setRangeDays] = useState<number | null>(30);

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<BreakdownRow[]>([]);
  const [locationRows, setLocationRows] = useState<BreakdownRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const campusRow = useMemo(
    () => summaryRows.find((r) => r.building_key === "__all__") ?? null,
    [summaryRows]
  );

  const buildingRow = useMemo(() => {
    if (isAllBuildings) return null;
    const key = building.trim().toLowerCase();
    return (
      summaryRows.find((r) => r.building_key === key) ??
      summaryRows.find((r) => r.building_name === building) ??
      null
    );
  }, [summaryRows, building, isAllBuildings]);

  const perBuildingRows = useMemo(
    () => summaryRows.filter((r) => r.building_key !== "__all__"),
    [summaryRows]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const buildingParam = isAllBuildings ? null : building;

      const [s, t, c, l] = await Promise.all([
        supabase.rpc("analytics_building_summary", { p_campus_slug: campus, p_days: rangeDays }),
        supabase.rpc("analytics_timeseries", { p_campus_slug: campus, p_building: buildingParam, p_days: rangeDays }),
        isAllBuildings
          ? Promise.resolve({ data: [], error: null } as any)
          : supabase.rpc("analytics_category_breakdown", { p_campus_slug: campus, p_building: building, p_days: rangeDays }),
        isAllBuildings
          ? Promise.resolve({ data: [], error: null } as any)
          : supabase.rpc("analytics_location_breakdown", { p_campus_slug: campus, p_building: building, p_days: rangeDays }),
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
      if (!cancelled) { setError("Failed to load analytics."); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [campus, building, rangeDays, isAllBuildings]);

  const headlineRow = isAllBuildings ? campusRow : buildingRow;

  const totalLogged = headlineRow?.items_logged ?? 0;
  const available = headlineRow?.items_available ?? 0;
  const pickedUp = headlineRow?.items_picked_up ?? 0;
  const pickupRate = headlineRow?.pickup_rate ?? 0;
  const avgHoursToPickup = headlineRow?.avg_hours_to_pickup ?? null;
  const avgHoursUnpicked = headlineRow?.avg_hours_unpicked_age ?? null;
  const highValueTotal = headlineRow?.high_value_count ?? 0;
  const sensitiveTotal = headlineRow?.sensitive_count ?? 0;
  const highValue72 = headlineRow?.high_value_unpicked_72h ?? 0;
  const sensitive72 = headlineRow?.sensitive_unpicked_72h ?? 0;

  const trendData = useMemo(() => {
    const data = series.slice(-30);
    return data.map((r) => ({
      day: fmtDayLabel(r.day, rangeDays),
      Logged: r.logged_count,
      Claimed: r.picked_up_count,
    }));
  }, [series, rangeDays]);

  const donutData = useMemo(() => [
    { name: "Claimed", value: pickedUp },
    { name: "Available", value: available },
  ], [pickedUp, available]);

  const catData = useMemo(() =>
    categoryRows.slice(0, 8).map((r) => ({
      name: r.category ?? "Other",
      count: r.count,
    })),
    [categoryRows]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
        <div className="text-red-700 font-semibold mb-1">Analytics error</div>
        <div className="text-slate-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-500 text-sm">
            {isAllBuildings ? "Campus overview" : `${building}`}
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setRangeDays(opt.days)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                rangeDays === opt.days
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Logged"
          value={totalLogged}
          icon={<Package className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          label="Claimed"
          value={pickedUp}
          sub={`Claim rate: ${fmtPct01(pickupRate)}`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          label="Still Available"
          value={available}
          sub={`Avg age: ${fmtHours(avgHoursUnpicked)}`}
          icon={<Clock className="w-5 h-5" />}
          color="text-slate-600"
          bgColor="bg-slate-100"
        />
        <StatCard
          label="Avg Time to Claim"
          value={avgHoursToPickup == null ? "No claims yet" : fmtHours(avgHoursToPickup)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-slate-600"
          bgColor="bg-slate-100"
        />
      </div>

      {/* Trend chart + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart — logged vs claimed */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Items Logged vs. Claimed</h3>
          <p className="text-xs text-slate-400 mb-4">
            {rangeDays === 7 ? "Past 7 days" : rangeDays === 30 ? "Past 30 days" : rangeDays === 112 ? "This semester" : "All time"} · daily
          </p>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400">No data in this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Logged" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Claimed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut — available vs claimed */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Claim Rate</h3>
          <p className="text-xs text-slate-400 mb-4">Available vs. Claimed</p>
          {totalLogged === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">No data</div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#3B82F6" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  Claimed ({pickedUp})
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  Available ({available})
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">{fmtPct01(pickupRate)}</p>
              <p className="text-xs text-slate-400">claim rate (items &gt; 48h)</p>
            </div>
          )}
        </div>
      </div>

      {/* Risk cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-400">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">High-Value Items</div>
              <div className="text-xs text-slate-400">Unpicked &gt; 72h · needs attention</div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-amber-500">{highValue72}</span>
            <span className="text-sm text-slate-400 mb-1">/ {highValueTotal} total</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-400">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Sensitive Items</div>
              <div className="text-xs text-slate-400">Unpicked &gt; 72h · needs attention</div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-amber-600">{sensitive72}</span>
            <span className="text-sm text-slate-400 mb-1">/ {sensitiveTotal} total</span>
          </div>
        </div>
      </div>

      {/* Buildings table or category/location charts */}
      {isAllBuildings ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Buildings Breakdown</h3>
          {perBuildingRows.length === 0 ? (
            <div className="text-slate-400">No buildings found.</div>
          ) : (
            <>
              {/* Visual bar comparison */}
              <ResponsiveContainer width="100%" height={Math.max(180, perBuildingRows.length * 44)}>
                <BarChart
                  layout="vertical"
                  data={perBuildingRows.map((r) => ({
                    name: r.building_name,
                    Available: r.items_available,
                    Claimed: r.items_picked_up,
                  }))}
                  margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
                  barGap={2}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Available" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Claimed" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Table */}
              <div className="overflow-x-auto mt-6">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
                      <th className="py-2 pr-4 font-semibold">Building</th>
                      <th className="py-2 pr-4 font-semibold">Logged</th>
                      <th className="py-2 pr-4 font-semibold">Available</th>
                      <th className="py-2 pr-4 font-semibold">Claimed</th>
                      <th className="py-2 pr-4 font-semibold">Claim Rate</th>
                      <th className="py-2 pr-4 font-semibold">Avg Claim Time</th>
                      <th className="py-2 pr-4 font-semibold">Avg Unclaimed Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perBuildingRows.map((r) => (
                      <tr key={r.building_key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-900">{r.building_name}</td>
                        <td className="py-3 pr-4 text-slate-600">{r.items_logged}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{r.items_available}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">{r.items_picked_up}</span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{fmtPct01(r.pickup_rate)}</td>
                        <td className="py-3 pr-4 text-slate-600">{fmtHours(r.avg_hours_to_pickup)}</td>
                        <td className="py-3 pr-4 text-slate-600">{fmtHours(r.avg_hours_unpicked_age)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category breakdown — colored pie */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Top Categories</h3>
            <p className="text-xs text-slate-400 mb-4">Most logged items</p>
            {catData.length === 0 ? (
              <div className="text-slate-400">No data in this range.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                      {catData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {catData.map((r, idx) => (
                    <div key={r.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        <span className="text-slate-700 truncate max-w-[180px]">{r.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{r.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Locations breakdown — horizontal bars */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Top Locations</h3>
            <p className="text-xs text-slate-400 mb-4">Most frequent spots</p>
            {locationRows.length === 0 ? (
              <div className="text-slate-400">No location data.</div>
            ) : (() => {
              const max = locationRows[0]?.count ?? 1;
              return (
                <div className="space-y-3">
                  {locationRows.slice(0, 10).map((r, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 truncate max-w-[75%]">{r.specific_location ?? "Unknown"}</span>
                        <span className="font-semibold text-slate-900">{r.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((r.count / max) * 100)}%`,
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
