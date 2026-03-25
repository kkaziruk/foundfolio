import { useState, useEffect } from "react";
import { Plus, Trash2, Building2, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import BuildingSettings from "./BuildingSettings";

interface BuildingsManagerProps {
  campus: string;
  campusName: string;
  onBuildingsChange?: () => void;
}

interface Building {
  id: string;
  name: string;
  campus_slug: string;
  created_at: string;
  is_system?: boolean | null;
  claim_hours?: string | null;
}

function BuildingsManager({ campus, campusName, onBuildingsChange }: BuildingsManagerProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settingsBuilding, setSettingsBuilding] = useState<Building | null>(null);

  useEffect(() => {
    fetchBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus]);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("buildings")
        .select("id,name,campus_slug,created_at,is_system,claim_hours")
        .eq("campus_slug", campus)
        .order("name");

      if (error) throw error;

      const rows = (data ?? []) as Building[];
      const normal = rows.filter((b) => !b.is_system);
      const system = rows.filter((b) => b.is_system);
      setBuildings([...normal, ...system]);
    } catch (err) {
      console.error("Error fetching buildings:", err);
      setError("Failed to load buildings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const name = newBuildingName.trim();
    if (!name) {
      setError("Please enter a building name");
      return;
    }

    if (name.toLowerCase() === "ndpd") {
      setError("That building name is reserved.");
      return;
    }

    try {
      const { error } = await supabase.from("buildings").insert([{ name, campus_slug: campus }]);
      if (error) throw error;

      setSuccess("Building added.");
      setNewBuildingName("");
      await fetchBuildings();
      onBuildingsChange?.();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err: any) {
      console.error("Error adding building:", err);
      if (err?.code === "23505") setError("This building already exists");
      else setError("Failed to add building");
    }
  };

  const handleDeleteBuilding = async (id: string, name: string, isSystem?: boolean | null) => {
    if (isSystem) {
      setError("System buildings cannot be deleted.");
      setTimeout(() => setError(""), 2500);
      return;
    }

    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase.from("buildings").delete().eq("id", id);
      if (error) throw error;

      setSuccess("Building deleted.");
      await fetchBuildings();
      onBuildingsChange?.();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("Error deleting building:", err);
      setError("Failed to delete building");
    }
  };

  const hoursSet = buildings.filter((b) => b.claim_hours).length;
  const hoursUnset = buildings.filter((b) => !b.is_system && !b.claim_hours).length;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Manage buildings</p>
            <p className="text-xs text-slate-500">{campusName}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{buildings.filter(b => !b.is_system).length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Buildings</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-700">{hoursSet}</p>
            <p className="text-xs text-green-600 mt-0.5">Hours set</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${hoursUnset > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
            <p className={`text-lg font-bold ${hoursUnset > 0 ? "text-amber-700" : "text-slate-400"}`}>{hoursUnset}</p>
            <p className={`text-xs mt-0.5 ${hoursUnset > 0 ? "text-amber-600" : "text-slate-400"}`}>Missing hours</p>
          </div>
        </div>

        {/* Add building form */}
        <form onSubmit={handleAddBuilding} className="flex gap-2">
          <input
            type="text"
            value={newBuildingName}
            onChange={(e) => setNewBuildingName(e.target.value)}
            placeholder="New building name…"
            className="ff-input flex-1 text-sm"
          />
          <button
            type="submit"
            className="ff-btn-primary px-4 flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* Buildings list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}>
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400">Loading…</div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            No buildings yet. Add your first one above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                {/* Building icon */}
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>

                {/* Name + hours */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{building.name}</span>
                    {building.is_system && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                        System
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                    {building.claim_hours ? (
                      <span className="text-xs text-slate-500 truncate">{building.claim_hours}</span>
                    ) : (
                      <span className="text-xs text-amber-500">No hours set</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!building.is_system && (
                    <>
                      <button
                        onClick={() => setSettingsBuilding(building)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Set lost & found hours"
                        aria-label="Set hours"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBuilding(building.id, building.name, building.is_system)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete building"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {building.is_system && (
                    <span className="text-xs text-slate-400 pr-1">Protected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hours settings modal */}
      {settingsBuilding && (
        <BuildingSettings
          buildingId={settingsBuilding.id}
          buildingName={settingsBuilding.name}
          onClose={async () => {
            setSettingsBuilding(null);
            await fetchBuildings();
          }}
        />
      )}
    </div>
  );
}

export default BuildingsManager;
