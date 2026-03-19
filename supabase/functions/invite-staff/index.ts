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
    const { email, campus_slug } = await req.json();

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

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: profile, error: profileErr } = await callerClient
      .from("profiles")
      .select("role, campus_slug")
      .eq("id", userData.user.id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "Could not verify caller role" }, 403);
    }

    if (profile.role !== "campus_admin" || profile.campus_slug !== campus_slug) {
      return json({ error: "Forbidden: campus_admin role required for this campus" }, 403);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existingInvite } = await adminClient
      .from("staff_invites")
      .select("id, email")
      .eq("email", email)
      .eq("campus_slug", campus_slug)
      .maybeSingle();

    if (existingInvite) {
      return json({ error: "An invite already exists for this email on this campus" }, 409);
    }

    const APP_URL = Deno.env.get("APP_URL") ?? SUPABASE_URL;
    const redirectTo = `${APP_URL}/reset-password`;

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { campus_slug },
    });

    if (error) {
      console.error("inviteUserByEmail error:", error);
      return json({ error: error.message }, 400);
    }

    return json({ success: true, user_id: data?.user?.id });
  } catch (err: any) {
    console.error("invite-staff error:", err);
    return json({ error: err?.message ?? "Unexpected error" }, 500);
  }
});
