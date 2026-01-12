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

    // Supabase (service role)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch categories
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

    // FINAL prompt
    const systemPrompt = `
You are helping a university lost-and-found office.

Return ONLY raw JSON with keys:
{
  "description": string,             // 5–8 words, physical traits only (color, material, form)
  "category_name": string,           // MUST exactly match one of the allowed categories
  "high_value_detected": boolean,    // true for electronics, wallets, jewelry, watches, headphones, etc.
  "sensitive_detected": boolean      // true if item appears to contain personal identification
}

Rules:
1. Category Choice:
   - category_name MUST be chosen EXACTLY from the allowed categories list.
   - If none clearly apply, choose "Other / Unclassified".

2. Sensitive Detection:
   - If the item shows a person’s photo, name, barcode, QR code, magnetic stripe,
     or appears to be an ID card, license, passport, or access card,
     you MUST set sensitive_detected = true.

3. High-Value Detection:
   - Set high_value_detected = true for electronics, wallets, jewelry, watches,
     headphones, or similarly valuable personal items.

4. Privacy:
   - If sensitive_detected is true, the description MUST NOT include any names,
     numbers, IDs, or personal identifiers.

5. Output:
   - No markdown.
   - No backticks.
   - Raw JSON only.
`;

    const userText = `Allowed categories: ${names.join(", ")}`;

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
              { type: "text", text: userText },
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

    const categoryRow = categories.find(
      (c: CategoryRow) => c.name === proposedCategory
    );

    const finalCategory = categoryRow
      ? proposedCategory
      : names.includes(OTHER)
      ? OTHER
      : names[0];

    const finalRow = categories.find(
      (c: CategoryRow) => c.name === finalCategory
    )!;

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
