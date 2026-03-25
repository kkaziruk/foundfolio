/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { name, email, university, locations, notes } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return json({ error: "Email service not configured" }, 500);
    }

    const htmlBody = `
      <h2>New FoundFolio Pilot Request</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px;font-weight:bold;color:#555;">Name</td><td style="padding:6px 12px;">${name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;color:#555;">Email</td><td style="padding:6px 12px;"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;color:#555;">University</td><td style="padding:6px 12px;">${university}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;color:#555;">Locations</td><td style="padding:6px 12px;">${locations ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;color:#555;vertical-align:top;">Notes</td><td style="padding:6px 12px;">${notes ? notes.replace(/\n/g, "<br>") : "—"}</td></tr>
      </table>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FoundFolio <noreply@foundfolio.co>",
        to: ["chenryna@nd.edu", "kkaziruk@nd.edu"],
        subject: `Pilot request from ${name} at ${university}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return json({ error: "Failed to send notification" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Unexpected error" }, 500);
  }
});
