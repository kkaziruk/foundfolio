// src/components/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  Shield,
  Star,
  BarChart3,
  Tag,
  Building2,
  Inbox,
  AlertTriangle,
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
  count: number;
};

type PickupDetailRow = {
  created_at: string;
  item: Array<{
    building: string;
    date_found: string;
    campus_slug: string;
  }>;
};

type ClaimQueueRow = {
  id: string;
  status: "submitted" | "reviewing" | "ready_for_pickup" | "resolved";
  created_at: string;
  item: Array<{
    id: string;
    description: string;
    building: string;
    is_high_value: boolean;
    date_found: string;
    campus_slug: string;
  }>;
};

type RangeKey = "week" | "month" | "semester" | "year";

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "semester", label: "Semester", days: 120 },
  { key: "year", label: "Year", days: 365 },
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

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function getRangeBounds(rangeKey: RangeKey) {
  const now = new Date();
  const start = new Date(now);

  if (rangeKey === "week") start.setDate(now.getDate() - 7);
  if (rangeKey === "month") start.setDate(now.getDate() - 30);
  if (rangeKey === "semester") start.setDate(now.getDate() - 120);
  if (rangeKey === "year") start.setDate(now.getDate() - 365);

  return {
    startDateIso: start.toISOString(),
    endDateIso: now.toISOString(),
    days: Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  };
}

export default function AdminDashboard({ campus, building }: AdminDashboardProps) {
  const isAllBuildings = building === "All Buildings";

  const [rangeKey, setRangeKey] = useState<RangeKey>("month");

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<BreakdownRow[]>([]);
  const [pickupRows, setPickupRows] = useState<PickupDetailRow[]>([]);
  const [claimsQueue, setClaimsQueue] = useState<ClaimQueueRow[]>([]);
  const [searchesCount, setSearchesCount] = useState(0);
  const [claimsSubmittedCount, setClaimsSubmittedCount] = useState(0);
  const [itemsLoggedCount, setItemsLoggedCount] = useState(0);
  const [currentBacklogCount, setCurrentBacklogCount] = useState(0);
  const [overdueCurrentCount, setOverdueCurrentCount] = useState(0);

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
      const { startDateIso, endDateIso, days } = getRangeBounds(rangeKey);
      const rangeLabel = `${rangeKey}:${startDateIso}..${endDateIso}`;

      const logQueryError = (label: string, queryError: unknown) => {
        console.error(`[Analytics] ${label} failed`, {
          campus,
          building,
          range: rangeLabel,
          error: queryError,
        });
      };

      // Preflight: verify user is running under staff role/campus context.
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        logQueryError("auth.getUser", authErr);
      }
      const userId = authData.user?.id;
      if (!userId) {
        if (!cancelled) {
          setError("Analytics requires an authenticated staff session.");
          setLoading(false);
        }
        return;
      }

      const { data: roleProfile, error: roleErr } = await supabase
        .from("profiles")
        .select("role,campus_slug")
        .eq("user_id", userId)
        .eq("campus_slug", campus)
        .maybeSingle();
      if (roleErr) {
        logQueryError("profiles role preflight", roleErr);
      }
      const role = roleProfile?.role;
      const isStaffRole = role === "campus_admin" || role === "building_manager";
      if (!isStaffRole) {
        if (!cancelled) {
          setError("Analytics requires campus staff permissions.");
          setLoading(false);
        }
        return;
      }

      const summaryCall = supabase.rpc("analytics_building_summary", {
        p_campus_slug: campus,
        p_days: days,
      });

      const seriesCall = supabase.rpc("analytics_timeseries", {
        p_campus_slug: campus,
        p_building: buildingParam,
        p_days: days,
      });

      const categoryCall = isAllBuildings
        ? Promise.resolve({
            data: [] as BreakdownRow[],
            error: null as null,
          })
        : supabase.rpc("analytics_category_breakdown", {
            p_campus_slug: campus,
            p_building: building,
            p_days: days,
          });

      let searchesQuery = supabase
        .from("searches")
        .select("id", { count: "exact", head: true })
        .eq("campus_slug", campus)
        .gte("created_at", startDateIso)
        .lte("created_at", endDateIso);

      let itemsLoggedQuery = supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("campus_slug", campus)
        .gte("created_at", startDateIso)
        .lte("created_at", endDateIso);

      let currentBacklogQuery = supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("campus_slug", campus)
        .eq("status", "available");

      let overdueCurrentQuery = supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("campus_slug", campus)
        .eq("status", "available")
        .lte("date_found", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

      let pickupsQuery = supabase
        .from("pickups")
        .select("created_at,item:items!inner(building,date_found,campus_slug)")
        .eq("item.campus_slug", campus)
        .gte("created_at", startDateIso)
        .lte("created_at", endDateIso);

      let claimsSubmittedQuery = supabase
        .from("claim_requests")
        .select("id,item:items!inner(campus_slug,building)", { count: "exact", head: true })
        .eq("item.campus_slug", campus)
        .gte("created_at", startDateIso)
        .lte("created_at", endDateIso);

      let claimsQueueQuery = supabase
        .from("claim_requests")
        .select("id,status,created_at,item:items!inner(id,description,building,is_high_value,date_found,campus_slug)")
        .eq("item.campus_slug", campus)
        .in("status", ["submitted", "reviewing", "ready_for_pickup"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (!isAllBuildings) {
        pickupsQuery = pickupsQuery.eq("item.building", building);
        itemsLoggedQuery = itemsLoggedQuery.eq("building", building);
        currentBacklogQuery = currentBacklogQuery.eq("building", building);
        overdueCurrentQuery = overdueCurrentQuery.eq("building", building);
        claimsSubmittedQuery = claimsSubmittedQuery.eq("item.building", building);
        claimsQueueQuery = claimsQueueQuery.eq("item.building", building);
      }

      const [s, t, c, p, sc, cc, il, cb, oc, cq] = await Promise.allSettled([
        summaryCall,
        seriesCall,
        categoryCall,
        pickupsQuery,
        searchesQuery,
        claimsSubmittedQuery,
        itemsLoggedQuery,
        currentBacklogQuery,
        overdueCurrentQuery,
        claimsQueueQuery,
      ]);

      if (cancelled) return;

      if (s.status === "fulfilled" && !s.value.error) setSummaryRows((s.value.data ?? []) as SummaryRow[]);
      else {
        logQueryError("analytics_building_summary", s.status === "fulfilled" ? s.value.error : s.reason);
        setSummaryRows([]);
      }

      if (t.status === "fulfilled" && !t.value.error) setSeries((t.value.data ?? []) as TimeseriesRow[]);
      else {
        logQueryError("analytics_timeseries", t.status === "fulfilled" ? t.value.error : t.reason);
        setSeries([]);
      }

      if (c.status === "fulfilled" && !c.value.error) setCategoryRows((c.value.data ?? []) as BreakdownRow[]);
      else {
        logQueryError("analytics_category_breakdown", c.status === "fulfilled" ? c.value.error : c.reason);
        setCategoryRows([]);
      }

      if (p.status === "fulfilled" && !p.value.error) setPickupRows((p.value.data ?? []) as PickupDetailRow[]);
      else {
        logQueryError("pickups", p.status === "fulfilled" ? p.value.error : p.reason);
        setPickupRows([]);
      }

      if (sc.status === "fulfilled" && !sc.value.error) setSearchesCount(sc.value.count ?? 0);
      else {
        logQueryError("searches_count", sc.status === "fulfilled" ? sc.value.error : sc.reason);
        setSearchesCount(0);
      }

      if (cc.status === "fulfilled" && !cc.value.error) setClaimsSubmittedCount(cc.value.count ?? 0);
      else {
        logQueryError("claims_submitted_count", cc.status === "fulfilled" ? cc.value.error : cc.reason);
        setClaimsSubmittedCount(0);
      }

      if (il.status === "fulfilled" && !il.value.error) setItemsLoggedCount(il.value.count ?? 0);
      else {
        logQueryError("items_logged_count", il.status === "fulfilled" ? il.value.error : il.reason);
        setItemsLoggedCount(0);
      }

      if (cb.status === "fulfilled" && !cb.value.error) setCurrentBacklogCount(cb.value.count ?? 0);
      else {
        logQueryError("current_backlog_count", cb.status === "fulfilled" ? cb.value.error : cb.reason);
        setCurrentBacklogCount(0);
      }

      if (oc.status === "fulfilled" && !oc.value.error) setOverdueCurrentCount(oc.value.count ?? 0);
      else {
        logQueryError("overdue_current_count", oc.status === "fulfilled" ? oc.value.error : oc.reason);
        setOverdueCurrentCount(0);
      }

      if (cq.status === "fulfilled" && !cq.value.error) setClaimsQueue((cq.value.data ?? []) as ClaimQueueRow[]);
      else {
        logQueryError("claims_queue", cq.status === "fulfilled" ? cq.value.error : cq.reason);
        setClaimsQueue([]);
      }

      setError("");
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
  }, [campus, building, rangeKey, isAllBuildings]);

  const headlineRow = isAllBuildings ? campusRow : buildingRow;

  const pickupRate = headlineRow?.pickup_rate ?? 0;
  const searchToClaimRate = searchesCount > 0 ? claimsSubmittedCount / searchesCount : 0;

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

  const pickupDurationsHours = useMemo(() => {
    return pickupRows
      .map((row) => {
        const itemRow = row.item[0];
        if (!itemRow?.date_found) return null;
        const foundAt = new Date(itemRow.date_found);
        const pickedUpAt = new Date(row.created_at);
        if (Number.isNaN(foundAt.getTime()) || Number.isNaN(pickedUpAt.getTime())) return null;
        const hours = (pickedUpAt.getTime() - foundAt.getTime()) / (1000 * 60 * 60);
        return hours >= 0 ? hours : null;
      })
      .filter((hours): hours is number => hours != null);
  }, [pickupRows]);

  const medianHoursToPickup = useMemo(() => median(pickupDurationsHours), [pickupDurationsHours]);

  const pickupRateByBuildingRows = useMemo(() => {
    return perBuildingRows
      .filter((row) => row.items_logged > 0)
      .map((row) => ({
        building: row.building_name,
        pickupRate: row.pickup_rate ?? 0,
        logged: row.items_logged,
      }))
      .sort((a, b) => b.pickupRate - a.pickupRate)
      .slice(0, 8);
  }, [perBuildingRows]);

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
              onClick={() => setRangeKey(opt.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                rangeKey === opt.key
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Current backlog</h3>
          <p className="text-3xl font-bold text-slate-900">{currentBacklogCount}</p>
          <p className="text-sm text-slate-500 mt-2">Live state · overdue {overdueCurrentCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Claims submitted</h3>
          <p className="text-3xl font-bold text-slate-900">{claimsSubmittedCount}</p>
          <p className="text-sm text-slate-500 mt-2">
            Range-bound · pickup rate {fmtPct01(pickupRate)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Median time to pickup</h3>
          <p className="text-3xl font-bold text-slate-900">{fmtHours(medianHoursToPickup)}</p>
          <p className="text-sm text-slate-500 mt-2">Based on claimed items in range</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-slate-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-700" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Search-to-claim rate</h3>
          <p className="text-3xl font-bold text-slate-900">{fmtPct01(searchToClaimRate)}</p>
          <p className="text-sm text-slate-500 mt-2">
            Searches: {searchesCount} · Items logged: {itemsLoggedCount}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">Operations Queue</div>
            <div className="text-sm text-slate-600">Needs review, high-value, and overdue work</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Needs Review</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {claimsQueue.filter((entry) => entry.status === "submitted").length}
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs uppercase tracking-wide text-amber-700">High Value (Current)</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{highValue72}</div>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs uppercase tracking-wide text-rose-700">Overdue &gt; 7d (Current)</div>
            <div className="mt-1 text-2xl font-bold text-rose-900">{overdueCurrentCount}</div>
          </div>
        </div>

        {claimsQueue.length === 0 ? (
          <p className="text-sm text-slate-600">No active claims in this scope.</p>
        ) : (
          <div className="space-y-2">
            {claimsQueue.slice(0, 6).map((entry) => {
              const item = entry.item[0];
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item?.description ?? "Unknown item"}</p>
                    <p className="text-xs text-slate-500">
                      {item?.building ?? "Unknown building"} · {entry.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  {item?.is_high_value && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      High value
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
              <div className="text-sm text-slate-600">Logged vs claimed</div>
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
                        title={`Claimed: ${r.picked_up_count}`}
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
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Pickup Rate by Building</div>
                <div className="text-sm text-slate-600">Highest-performing buildings in this range</div>
              </div>
            </div>

            {pickupRateByBuildingRows.length === 0 ? (
              <div className="text-slate-600">No pickup-rate data in this range.</div>
            ) : (
              <div className="space-y-3">
                {pickupRateByBuildingRows.map((row) => (
                  <div key={row.building}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">{row.building}</span>
                      <span className="text-slate-700">{fmtPct01(row.pickupRate)}</span>
                    </div>
                    <div className="h-2 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-slate-900"
                        style={{ width: `${Math.max(2, Math.round(row.pickupRate * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                      <th className="py-2 pr-4">Claim rate</th>
                      <th className="py-2 pr-4">Avg time (claimed)</th>
                      <th className="py-2 pr-4">Avg age (unclaimed)</th>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
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
        </div>
      )}
    </div>
  );
}
