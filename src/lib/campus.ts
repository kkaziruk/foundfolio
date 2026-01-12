import { supabase } from "./supabase";

export type Campus = {
  slug: string;
  name: string;
  allowed_domains: string[];
  status: string;
};

export async function resolveCampusByEmail(email: string | null | undefined) {
  const domain = email?.split("@")[1]?.toLowerCase();
  if (!domain) return { campus: null as Campus | null, domain: null as string | null };

  const { data: campus, error } = await supabase
    .from("campuses")
    .select("slug,name,allowed_domains,status")
    .contains("allowed_domains", [domain])
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;

  return { campus: (campus as Campus) ?? null, domain };
}
