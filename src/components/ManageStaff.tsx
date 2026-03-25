import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Trash2, UserPlus, Mail } from "lucide-react";

type Building = { id: string; name: string };
type Invite = {
  id: string;
  email: string;
  role: "building_manager" | "campus_admin";
  building_id: string | null;
  created_at: string;
};

export default function ManageStaff({ campus, buildings }: { campus: string; buildings: Building[] }) {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Invite["role"]>("building_manager");
  const [buildingId, setBuildingId] = useState<string>(buildings[0]?.id ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const buildingNameById = useMemo(() => {
    const m = new Map<string, string>();
    buildings.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [buildings]);

  const loadInvites = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("staff_invites")
        .select("id,email,role,building_id,created_at")
        .eq("campus_slug", campus)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvites((data ?? []) as Invite[]);
    } catch (e: any) {
      console.error(e);
      setError("Failed to load staff invites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [campus]);

  const addInvite = async () => {
    setError("");
    setSuccess("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    if (role === "building_manager" && !buildingId) {
      setError("Select a building for building managers.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        campus_slug: campus,
        email: cleanEmail,
        role,
        building_id: role === "building_manager" ? buildingId : null,
      };

      const { error: insertErr } = await supabase.from("staff_invites").insert(payload);
      if (insertErr) throw insertErr;

      let emailSent = false;
      try {
        const buildingName = role === "building_manager" && buildingId
          ? (buildingNameById.get(buildingId) ?? undefined)
          : undefined;

        const { error: fnErr } = await supabase.functions.invoke("invite-staff", {
          body: {
            email: cleanEmail,
            campus_slug: campus,
            campus_name: campus,
            building_name: buildingName,
            role,
          },
        });
        if (fnErr) {
          console.warn("Invite email failed (invite record still saved):", fnErr.message);
        } else {
          emailSent = true;
        }
      } catch (fnEx) {
        console.warn("Invite email error:", fnEx);
      }

      setEmail("");
      setSuccess(
        emailSent
          ? `Invite sent to ${cleanEmail}.`
          : `${cleanEmail} added. Email invite could not be sent — they can still sign in once approved.`
      );
      await loadInvites();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to add invite.");
    } finally {
      setSaving(false);
    }
  };

  const removeInvite = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      const { error } = await supabase.from("staff_invites").delete().eq("id", id);
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      console.error(e);
      setError("Failed to remove invite.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInvite();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6" style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)" }}>
      <div className="flex items-center gap-3 mb-1">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <UserPlus className="w-4 h-4 text-slate-700" />
        </span>
        <h2 className="text-lg font-extrabold text-slate-900">Manage Staff Access</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6 ml-12">
        Staff can only sign in if their email is pre-approved here. Adding an email sends them an invite link.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Mail className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] mb-6">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          type="email"
          placeholder="staff@nd.edu"
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Invite["role"])}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        >
          <option value="building_manager">Building Manager</option>
          <option value="campus_admin">Campus Admin</option>
        </select>

        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          disabled={role === "campus_admin"}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          onClick={addInvite}
          disabled={saving || !email.trim()}
          className="ff-btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Adding..." : "Add"}
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500">Loading invites...</div>
      ) : invites.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">No staff invites yet. Add one above.</div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-medium text-slate-900 text-sm">{inv.email}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {inv.role === "campus_admin"
                    ? "Campus Admin"
                    : `Building Manager · ${buildingNameById.get(inv.building_id ?? "") ?? "Unknown building"}`}
                </div>
              </div>

              <button
                onClick={() => removeInvite(inv.id)}
                className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label="Remove invite"
                title="Remove invite"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
