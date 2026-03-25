/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ReqBody = {
  imageUrl: string;
  campus_slug: string;
};

type CategoryRow = {
  name: string;
  is_high_value: boolean;
  is_sensitive: boolean;
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { imageUrl, campus_slug }: ReqBody = await req.json();

    if (!imageUrl || !campus_slug) {
      return new Response(
        JSON.stringify({ error: "imageUrl and campus_slug are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: categories, error } = await supabase
      .from("categories")
      .select("name,is_high_value,is_sensitive")
      .eq("campus_slug", campus_slug);

    if (error || !categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "No categories configured for this campus" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const names = categories.map((c: CategoryRow) => c.name);
    const OTHER = "Other / Unclassified";

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("OpenAI error:", err);
      throw new Error("AI request failed");
    }

    const rawData = await resp.json();
    const raw = rawData.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Invalid AI JSON:", raw);
      throw new Error("Invalid AI response");
    }

    const proposedCategory = (parsed.category_name ?? "").trim();
    const description = (parsed.description ?? "").trim();
    const highValueDetected = parsed.high_value_detected === true;
    const sensitiveDetected = parsed.sensitive_detected === true;

    const categoryRow = categories.find((c: CategoryRow) => c.name === proposedCategory);
    const finalCategory = categoryRow
      ? proposedCategory
      : names.includes(OTHER)
      ? OTHER
      : names[0];
    const finalRow = categories.find((c: CategoryRow) => c.name === finalCategory)!;

    return new Response(
      JSON.stringify({
        description,
        category: finalCategory,
        high_value: finalRow.is_high_value || highValueDetected,
        sensitive: finalRow.is_sensitive || sensitiveDetected,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-image error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
