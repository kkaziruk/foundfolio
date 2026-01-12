/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const campus_slug = url.searchParams.get("campus_slug") ?? "";
  const building = url.searchParams.get("building"); // optional

  if (!campus_slug) {
    return new Response(JSON.stringify({ error: "campus_slug is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ITEMS_TABLE = "items"; // change if needed

  let q = supabase
    .from(ITEMS_TABLE)
    .select("*")
    .eq("campus_slug", campus_slug);

  // If building is provided and not a sentinel like "All Buildings", filter it.
  if (building && building.trim() && building !== "All Buildings") {
    q = q.eq("building", building);
  }

  const { data: items, error } = await q.order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cols = [
    "id",
    "created_at",
    "campus_slug",
    "building",
    "specific_location",
    "category",
    "description",
    "additional_notes",
    "photo_url",
    "sensitive",
    "is_high_value",
    "status",
    "claimed_by",
    "claimed_at",
  ];

  const header = cols.map(csvCell).join(",");
  const rows = (items ?? []).map((it: any) => cols.map((c) => csvCell(it?.[c])).join(","));
  const csv = [header, ...rows].join("\n");

  const filename = building && building.trim() && building !== "All Buildings"
    ? `foundfolio-${campus_slug}-${building}-items.csv`
    : `foundfolio-${campus_slug}-items.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
