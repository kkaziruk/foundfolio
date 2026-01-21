import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Trash2 } from "lucide-react";

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
  const [buildingId, setBuildingId] = useState<string | "">(buildings[0]?.id ?? "");
  const [error, setError] = useState("");
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
        .eq("campus_slug", campus_slug)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus]);

  const addInvite = async () => {
  setError("");
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

    // 1️⃣ Insert into staff_invites
    const { error: insertErr } = await supabase.from("staff_invites").insert(payload);
    if (insertErr) throw insertErr;

    // 2️⃣ Send Auth invite email (Edge Function)
const { data, error: fnErr } = await supabase.functions.invoke(
  "invite-staff",
  {
    body: { email: cleanEmail, campus_slug: campus },
  }
);

if (fnErr) {
  console.error("Invite staff function error:", fnErr);
  throw new Error(fnErr.message);
}

console.log("Invite staff success:", data);

    setEmail("");
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
    try {
      const { error } = await supabase.from("staff_invites").delete().eq("id", id);
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      console.error(e);
      setError("Failed to remove invite.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Manage Staff Access</h2>
      <p className="text-sm text-slate-600 mb-6">
        Staff can only sign in if their email is pre-approved here.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@nd.edu"
          className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Invite["role"])}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="building_manager">Building Manager</option>
          <option value="campus_admin">Campus Admin</option>
        </select>

        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          disabled={role === "campus_admin"}
          className="px-3 py-2 border border-slate-300 rounded-lg disabled:opacity-60"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          onClick={addInvite}
          disabled={saving}
          className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] font-medium disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>

      {loading ? (
        <div className="text-slate-600">Loading invites…</div>
      ) : invites.length === 0 ? (
        <div className="text-slate-600">No staff invites yet.</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {invites.map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{inv.email}</div>
                <div className="text-sm text-slate-600">
                  {inv.role === "campus_admin"
                    ? "Campus Admin"
                    : `Building Manager • ${buildingNameById.get(inv.building_id ?? "") ?? "Unknown building"}`}
                </div>
              </div>

              <button
                onClick={() => removeInvite(inv.id)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Remove invite"
                title="Remove invite"
              >
                <Trash2 className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
