// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
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
  loading: boolean;
  profile: Profile | null;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }

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
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) console.error("getSession error:", error);

      const sess = data.session ?? null;
      setSession(sess);
      const u = sess?.user ?? null;
      setUser(u);

      await loadProfile(u);
      if (!mounted) return;

      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setLoading(true);  // ← ADDED THIS

      const u = newSession?.user ?? null;
      setSession(newSession);
      setUser(u);

      await loadProfile(u);

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, session, loading, profile }), [user, session, loading, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}