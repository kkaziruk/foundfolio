import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

type MsgType = "error" | "success" | "info";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

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
    (async () => {
      try {
        const url = window.location.href;
        const code = new URL(url).searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) {
            setHasSession(false);
            setMessage("error", `Reset link invalid or expired: ${error.message}`);
            setChecking(false);
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        const ok = !!data.session;

        setHasSession(ok);
        setMessage(
          ok ? "info" : "error",
          ok
            ? "Enter a new password to finish setup."
            : "No active reset session. Please use the latest link from your email."
        );
      } catch (e: any) {
        setHasSession(false);
        setMessage("error", e?.message ?? "Failed to verify reset session.");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) return setMessage("error", "Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("error", "Passwords do not match.");

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setMessage("error", error.message);

      setMessage("success", "Password set. Redirecting to login…");
      setTimeout(() => navigate("/login"), 800);
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
        <h1 className="text-xl font-semibold text-[#111827]">Set your password</h1>

        {checking ? (
          <div className="mt-6 text-sm text-slate-600">Checking link…</div>
        ) : (
          <>
            {msg && <div className={`mt-4 text-sm ${msgClass}`}>{msg}</div>}

            <form className="mt-6 space-y-3" onSubmit={onSubmit}>
              <input
                type="password"
                placeholder="New password"
                className="w-full border rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={!hasSession}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full border rounded-lg px-3 py-2"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={!hasSession}
              />

              <button
                type="submit"
                disabled={!hasSession || submitting}
                className="w-full rounded-lg px-4 py-2 font-medium bg-[#3B82F6] text-white disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Set password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
