/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type CategoryRow = { name: string; is_high_value: boolean; is_sensitive: boolean };

async function enrichWithAI(
  reportId: string,
  campusSlug: string,
  photoUrl: string,
  adminClient: ReturnType<typeof createClient>
): Promise<void> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    console.warn("OPENAI_API_KEY not set — skipping AI enrichment");
    return;
  }

  const { data: categories } = await adminClient
    .from("categories")
    .select("name, is_high_value, is_sensitive")
    .eq("campus_slug", campusSlug);

  if (!categories || categories.length === 0) {
    console.warn("No categories found for campus — skipping AI enrichment");
    return;
  }

  const names = (categories as CategoryRow[]).map((c) => c.name);
  const OTHER = "Other / Unclassified";

  const systemPrompt = `You are helping a university lost-and-found office.
Return ONLY raw JSON with keys:
{
  "description": string,
  "category_name": string,
  "high_value_detected": boolean,
  "sensitive_detected": boolean
}
Rules:
1. category_name MUST be chosen exactly from the allowed categories list. If none apply, choose "Other / Unclassified".
2. Set sensitive_detected = true if the item shows an ID, card, license, passport, barcode, or personal identifier.
3. Set high_value_detected = true for electronics, wallets, jewelry, watches, headphones, or similarly valuable items.
4. If sensitive_detected is true, the description must NOT include any names, numbers, or personal identifiers.
5. No markdown. No backticks. Raw JSON only.`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Allowed categories: ${names.join(", ")}` },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    console.error("OpenAI error:", await resp.text());
    return;
  }

  const rawData = await resp.json();
  const raw = rawData.choices?.[0]?.message?.content ?? "{}";

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Invalid AI JSON:", raw);
    return;
  }

  const proposedCategory = (parsed.category_name ?? "").trim();
  const categoryRow = (categories as CategoryRow[]).find((c) => c.name === proposedCategory);
  const finalCategory = categoryRow
    ? proposedCategory
    : names.includes(OTHER)
    ? OTHER
    : names[0];
  const finalRow = (categories as CategoryRow[]).find((c) => c.name === finalCategory);

  await adminClient
    .from("found_item_reports")
    .update({
      ai_description: (parsed.description ?? "").trim() || null,
      ai_category: finalCategory || null,
      ai_high_value: (finalRow?.is_high_value || parsed.high_value_detected) === true,
      ai_sensitive: (finalRow?.is_sensitive || parsed.sensitive_detected) === true,
    })
    .eq("id", reportId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { campus_slug, building_id, photo_url, note } = await req.json();

    if (!campus_slug || !building_id || !photo_url) {
      return json({ error: "campus_slug, building_id, and photo_url are required" }, 400);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Step 1: Authenticate caller
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 2: Rate limit check
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();

    const { count: hourCount } = await adminClient
      .from("found_item_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_by_user_id", userId)
      .gte("created_at", oneHourAgo);

    if ((hourCount ?? 0) >= 3) {
      return json({ error: "Too many submissions. Please try again in an hour." }, 429);
    }

    const { count: dayCount } = await adminClient
      .from("found_item_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_by_user_id", userId)
      .gte("created_at", oneDayAgo);

    if ((dayCount ?? 0) >= 10) {
      return json({ error: "Daily submission limit reached. Try again tomorrow." }, 429);
    }

    // Step 3: Validate building exists and belongs to this campus
    const { data: building, error: buildingErr } = await adminClient
      .from("buildings")
      .select("id, name, campus")
      .eq("id", building_id)
      .eq("campus", campus_slug)
      .single();

    if (buildingErr || !building) {
      return json({ error: "Invalid building for this campus" }, 400);
    }

    // Step 4: Insert report — this must succeed before AI runs
    const { data: report, error: insertErr } = await adminClient
      .from("found_item_reports")
      .insert({
        campus_slug,
        building_id,
        reported_by_user_id: userId,
        photo_url,
        note: note ?? null,
        status: "pending_review",
      })
      .select("id")
      .single();

    if (insertErr || !report) {
      console.error("Report insert error:", insertErr);
      return json({ error: "Failed to create report" }, 500);
    }

    const reportId = report.id;

    // Step 5: AI enrichment — awaited but non-blocking in the sense that
    // failure here does NOT affect the response. Report is already in DB.
    try {
      await enrichWithAI(reportId, campus_slug, photo_url, adminClient);
    } catch (aiErr) {
      console.error("AI enrichment failed — report preserved with null AI fields:", aiErr);
    }

    return json({ success: true, report_id: reportId });
  } catch (err: any) {
    console.error("submit-found-report error:", err);
    return json({ error: err?.message ?? "Unexpected error" }, 500);
  }
});
