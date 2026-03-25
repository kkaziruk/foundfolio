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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, campus_slug, campus_name, building_name, role } = await req.json();

    if (!email || !campus_slug) {
      return json({ error: "email and campus_slug are required" }, 400);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller using their session token
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify caller is a campus_admin for this campus
    const { data: profile, error: profileErr } = await callerClient
      .from("profiles")
      .select("role, campus_slug")
      .eq("user_id", userData.user.id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "Could not verify caller role" }, 403);
    }

    if (profile.role !== "campus_admin" || profile.campus_slug !== campus_slug) {
      return json({ error: "Forbidden: campus_admin role required for this campus" }, 403);
    }

    // Use service role to send the invite email
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const APP_URL = Deno.env.get("APP_URL") ?? SUPABASE_URL;
    const redirectTo = `${APP_URL}/reset-password?type=invite`;

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { campus_slug },
    });

    if (error) {
      console.error("inviteUserByEmail error:", error);
      return json({ error: error.message }, 400);
    }

    // Send a context-rich welcome email via Resend if configured
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const roleLabel = role === "campus_admin" ? "Campus Admin" : "Building Manager";
      const locationLine = building_name
        ? `<p style="margin:0 0 8px;">📍 <strong>Building:</strong> ${building_name}</p>`
        : "";
      const campusLine = campus_name
        ? `<p style="margin:0 0 8px;">🏫 <strong>Campus:</strong> ${campus_name}</p>`
        : "";

      const html = `
        <div style="font-family:sans-serif;max-width:520px;color:#1e293b;">
          <img src="${APP_URL}/found_folio_(6).png" alt="FoundFolio" style="height:40px;margin-bottom:24px;" />
          <h2 style="margin:0 0 8px;font-size:20px;">You've been invited to FoundFolio</h2>
          <p style="margin:0 0 20px;color:#475569;">You're set up as a <strong>${roleLabel}</strong> on FoundFolio — the campus lost &amp; found platform.</p>
          ${campusLine}
          ${locationLine}
          <p style="margin:0 0 20px;color:#475569;">Click the button below to create your password and get started. The link expires in 24 hours.</p>
          <p style="margin:0 0 32px;">
            <a href="${APP_URL}/reset-password?type=invite" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
              Set up my account →
            </a>
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">If you weren't expecting this, you can safely ignore it.</p>
        </div>
      `;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FoundFolio <noreply@foundfolio.co>",
            to: [email],
            subject: `You've been invited to manage ${building_name ?? campus_name ?? "lost & found"} on FoundFolio`,
            html,
          }),
        });
      } catch (emailErr) {
        console.warn("Resend email failed (invite still sent):", emailErr);
      }
    }

    return json({ success: true, user_id: data?.user?.id });
  } catch (err: any) {
    console.error("invite-staff error:", err);
    return json({ error: err?.message ?? "Unexpected error" }, 500);
  }
});
