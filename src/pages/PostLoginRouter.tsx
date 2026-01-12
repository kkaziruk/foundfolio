import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { clearStaffIntent, getStaffIntent, setAuthError } from "../lib/authIntent";

function getEmailDomain(email?: string | null) {
  if (!email) return null;
  const parts = email.toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : null;
}

async function resolveCampusByDomain(domain: string) {
  const { data, error } = await supabase
    .from("campuses")
    .select("slug,allowed_domains,status")
    .eq("status", "active")
    .contains("allowed_domains", [domain])
    .maybeSingle();

  if (error) throw error;
  return data?.slug ?? null;
}

export default function PostLoginRouter() {
  const navigate = useNavigate();
  const { user, loading, profile } = useAuth();
  const didNavigateRef = useRef(false);
  const [status, setStatus] = useState("Determining your campus...");

  useEffect(() => {
    if (loading) return;
    if (didNavigateRef.current) return;

    (async () => {
      if (!user) {
        didNavigateRef.current = true;
        navigate("/login", { replace: true });
        return;
      }

      const staffIntent = getStaffIntent();

      // =========================
      // Staff flow (intent-based)
      // =========================
      if (staffIntent) {
        setStatus("Checking staff access…");

        const existingRole = profile?.role;
        const existingCampus = profile?.campus_slug;
        const existingBuilding = profile?.building_id ?? null;

        const wantsAdmin = staffIntent.mode === "campus_admin";
        const wantsManager = staffIntent.mode === "building_manager";

        const roleMatches =
          (wantsAdmin && existingRole === "campus_admin") ||
          (wantsManager && existingRole === "building_manager");

        const campusMatches = existingCampus === staffIntent.campus;

        const buildingMatches = wantsAdmin
          ? true
          : existingBuilding === staffIntent.building_id;

        // If profile isn't already correct, check allowlist invites
        const email = user.email?.toLowerCase() ?? "";
        let inviteApproved = false;

        if (!roleMatches || !campusMatches || !buildingMatches) {
          const { data: invites, error: invErr } = await supabase
            .from("staff_invites")
            .select("role,campus_slug,building_id")
            .eq("campus_slug", staffIntent.campus)
            .eq("email", email);

          if (invErr) {
            console.error(invErr);
          } else {
            inviteApproved = (invites ?? []).some((inv: any) => {
              if (wantsAdmin) return inv.role === "campus_admin";
              return (
                inv.role === "building_manager" &&
                inv.building_id === staffIntent.building_id
              );
            });
          }
        }

        const allowed =
          (roleMatches && campusMatches && buildingMatches) || inviteApproved;

        if (!allowed) {
          clearStaffIntent();
          await supabase.auth.signOut();
          setAuthError("Staff access denied. Contact your campus admin for access.");
          didNavigateRef.current = true;
          navigate("/login", { replace: true });
          return;
        }

        // If they were approved via invite (or profile mismatched), upsert staff profile
        if (!roleMatches || !campusMatches || !buildingMatches) {
          setStatus("Setting up staff profile…");

          const upsertPayload = wantsAdmin
            ? {
                user_id: user.id,
                role: "campus_admin",
                campus_slug: staffIntent.campus,
                building_id: null,
              }
            : {
                user_id: user.id,
                role: "building_manager",
                campus_slug: staffIntent.campus,
                building_id: staffIntent.building_id,
              };

          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert(upsertPayload, { onConflict: "user_id" });

          if (upsertError) {
            console.error(upsertError);
            clearStaffIntent();
            await supabase.auth.signOut();
            setAuthError("Could not set up staff access. Contact your campus admin.");
            didNavigateRef.current = true;
            navigate("/login", { replace: true });
            return;
          }
        }

        clearStaffIntent();
        didNavigateRef.current = true;
        navigate(`/admin/${staffIntent.campus}`, { replace: true });
        return;
      }

      // ============================================
      // Staff already (but no intent): don't downgrade
      // ============================================
      if (profile?.role === "campus_admin" || profile?.role === "building_manager") {
        const staffCampus = profile.campus_slug;
        if (staffCampus) {
          didNavigateRef.current = true;
          navigate(`/admin/${staffCampus}`, { replace: true });
          return;
        }
      }

      // =========================
      // Student flow
      // =========================
      const domain = getEmailDomain(user.email);
      if (!domain) {
        didNavigateRef.current = true;
        navigate("/not-onboarded", { replace: true });
        return;
      }

      setStatus("Resolving campus…");
      let campusSlug: string | null = null;

      try {
        campusSlug = await resolveCampusByDomain(domain);
      } catch (e) {
        console.error(e);
      }

      if (!campusSlug) {
        didNavigateRef.current = true;
        navigate("/not-onboarded", { replace: true });
        return;
      }

      // Only create/repair student profile if it's missing or already student-but-incomplete.
      const needsStudentProfile =
        !profile?.role || (profile.role === "student" && !profile.campus_slug);

      if (needsStudentProfile) {
        setStatus("Setting up your account…");
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: user.id,
              role: "student",
              campus_slug: campusSlug,
              building_id: null,
            },
            { onConflict: "user_id" }
          );

        if (upsertError) {
          console.error(upsertError);
          didNavigateRef.current = true;
          navigate("/not-onboarded", { replace: true });
          return;
        }
      }

      didNavigateRef.current = true;
      navigate(`/${campusSlug}`, { replace: true });
    })();
  }, [loading, user, profile, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-600">{status}</div>
    </div>
  );
}
