import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

type MsgType = "error" | "success" | "info";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isInvite, setIsInvite] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<MsgType>("info");
  const [submitting, setSubmitting] = useState(false);

  const setMessage = (type: MsgType, text: string) => {
    setMsgType(type);
    setMsg(text);
  };

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (type === "invite") setIsInvite(true);

    // Listen for auth state changes — handles hash-based tokens automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (session) {
          setHasSession(true);
          setMessage("info", "Create a password to finish setting up your account.");
          setChecking(false);
        }
      }
    });

    (async () => {
      try {
        if (tokenHash && type) {
          // Email OTP / invite link flow (token_hash + type params)
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) {
            setHasSession(false);
            setMessage("error", `Link invalid or expired: ${error.message}`);
            setChecking(false);
            return;
          }
        } else if (code) {
          // PKCE flow (?code= param)
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setHasSession(false);
            setMessage("error", `Reset link invalid or expired: ${error.message}`);
            setChecking(false);
            return;
          }
        }

        // Check for an existing session (covers cases where link already exchanged)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setHasSession(true);
          setMessage("info", "Create a password to finish setting up your account.");
          setChecking(false);
        } else if (!tokenHash && !code) {
          // No link params and no session — nothing to work with
          setHasSession(false);
          setMessage("error", "No active session. Please use the latest link from your email.");
          setChecking(false);
        }
        // If we had a code/tokenHash, wait for onAuthStateChange to fire
      } catch (e: any) {
        setHasSession(false);
        setMessage("error", e?.message ?? "Failed to verify session.");
        setChecking(false);
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) return setMessage("error", "Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("error", "Passwords do not match.");

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setMessage("error", error.message);

      setMessage("success", "Password set! Taking you to the app…");
      setTimeout(() => navigate("/app", { replace: true }), 800);
    } finally {
      setSubmitting(false);
    }
  }

  const msgClass =
    msgType === "error"
      ? "text-red-600"
      : msgType === "success"
      ? "text-green-600"
      : "text-slate-600";

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <img src="/found_folio_(6).png" alt="FoundFolio" className="h-10 w-auto mb-4" />
        <h1 className="text-xl font-semibold text-[#111827]">
          {isInvite ? "Welcome to FoundFolio" : "Set your password"}
        </h1>
        {isInvite && (
          <p className="mt-1 text-sm text-slate-500">
            You've been invited to manage lost &amp; found for your building. Create a password to get started.
          </p>
        )}

        {checking ? (
          <div className="mt-6 text-sm text-slate-600">Verifying link…</div>
        ) : (
          <>
            {msg && <div className={`mt-4 text-sm ${msgClass}`}>{msg}</div>}

            <form className="mt-6 space-y-3" onSubmit={onSubmit}>
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={!hasSession}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={!hasSession}
              />

              <button
                type="submit"
                disabled={!hasSession || submitting}
                className="w-full rounded-lg px-4 py-2 font-medium bg-[#3B82F6] text-white disabled:opacity-60 text-sm"
              >
                {submitting ? "Saving…" : isInvite ? "Create password & enter app" : "Set password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
