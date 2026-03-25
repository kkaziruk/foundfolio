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

const SYSTEM_PROMPT = `You are helping a university lost-and-found office catalog found items.

Return ONLY raw JSON — no markdown, no backticks:
{
  "description": string,
  "category_name": string,
  "high_value_detected": boolean,
  "sensitive_detected": boolean
}

DESCRIPTION
- 5–10 words describing physical appearance: color, material, shape, brand if clearly visible.
- Never include names, ID numbers, or personal identifiers even if visible in the photo.
- Example: "Blue hard-shell laptop case with stickers"

CATEGORY
- category_name MUST match one of the allowed categories exactly.
- If none clearly apply, use "Other / Unclassified".

SENSITIVE — set sensitive_detected = true ONLY if the item itself IS one of:
- A government-issued ID: driver's license, passport, or state ID card
- A university or employee ID card
- A financial card: credit card or debit card
- A building access badge or key card
- A Social Security card or similar official personal document
Do NOT flag as sensitive:
- Items that merely have a barcode, QR code, or product label (water bottles, books, food containers)
- Items with a name written or printed on them (e.g. a labeled bottle or personalized item)
- Loyalty cards, gift cards, library cards, or transit passes
- Bags, wallets, or cases that may contain cards inside — only flag if an ID or financial card is visibly exposed

HIGH VALUE — set high_value_detected = true for:
- Electronics: phones, laptops, tablets, earbuds, headphones, cameras
- Wallets and purses
- Jewelry and watches
- Car keys or key fobs
- Any item clearly worth $50 or more

OUTPUT: Raw JSON only. No markdown. No explanation.`;

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
        { role: "system", content: SYSTEM_PROMPT },
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

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const { data: building, error: buildingErr } = await adminClient
      .from("buildings")
      .select("id, name, campus_slug")
      .eq("id", building_id)
      .eq("campus_slug", campus_slug)
      .single();

    if (buildingErr || !building) {
      return json({ error: "Invalid building for this campus" }, 400);
    }

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
