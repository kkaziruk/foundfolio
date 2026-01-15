// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Role = "student" | "building_manager" | "campus_admin";

type Profile = {
  user_id: string;
  role: Role;
  campus_slug: string;
  building_id: string | null;
};

type AuthState = {
  user: User | null;
  session: Session | null;

  // True only while we bootstrap the session on first load.
  loading: boolean;

  // Profile can be null if user is logged out OR if the user has no profile row.
  profile: Profile | null;

  // True only while we're fetching the profile for a logged-in user.
  profileLoading: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, role, campus_slug, building_id")
        .eq("user_id", u.id)
        .maybeSingle();

      if (error) {
        console.error("loadProfile error:", error);
        setProfile(null);
        return;
      }

      setProfile((data as Profile) ?? null);
    } catch (e) {
      console.error("loadProfile threw:", e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const setIfMounted = (fn: () => void) => {
      if (mounted) fn();
    };

    const applySession = (sess: Session | null) => {
      const u = sess?.user ?? null;

      setIfMounted(() => {
        setSession(sess);
        setUser(u);
      });

      // Load profile in parallel with UI (does not block `loading`).
      // Pages that need it should check `profileLoading`.
      loadProfile(u);
    };

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("getSession error:", error);

        applySession(data.session ?? null);
      } catch (e) {
        console.error("getSession threw:", e);
        setIfMounted(() => {
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        });
      } finally {
        setIfMounted(() => setLoading(false));
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Do NOT setLoading(true) here; Supabase fires events on token refresh too.
      applySession(newSession);
      setIfMounted(() => setLoading(false));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, profile, profileLoading }),
    [user, session, loading, profile, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}