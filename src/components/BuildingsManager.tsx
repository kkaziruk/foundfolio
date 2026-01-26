import { useState, useEffect } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase";

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
}

function BuildingsManager({ campus, campusName, onBuildingsChange }: BuildingsManagerProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        .select("id,name,campus_slug,created_at,is_system")
        .eq("campus_slug", campus)
        .order("name");

      if (error) throw error;

      const rows = (data ?? []) as Building[];

      // Optional: keep system buildings visible but grouped last
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

    // Guard against recreating system buildings by name
    if (name.toLowerCase() === "ndpd") {
      setError("That building name is reserved.");
      return;
    }

    try {
      const { error } = await supabase.from("buildings").insert([{ name, campus_slug: campus }]);
      if (error) throw error;

      setSuccess("Building added successfully!");
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

    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase.from("buildings").delete().eq("id", id);
      if (error) throw error;

      setSuccess("Building deleted successfully!");
      await fetchBuildings();
      onBuildingsChange?.();

      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("Error deleting building:", err);
      setError("Failed to delete building");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manage Buildings</h2>
            <p className="text-slate-600">{campusName}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleAddBuilding} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={newBuildingName}
              onChange={(e) => setNewBuildingName(e.target.value)}
              placeholder="Enter building name"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
              aria-label="Add Building"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Current Buildings ({buildings.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading buildings...</div>
          ) : buildings.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              No buildings added yet. Add your first building above.
            </div>
          ) : (
            <div className="space-y-2">
              {buildings.map((building) => (
                <div
                  key={building.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{building.name}</span>
                      {building.is_system ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          System
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {building.is_system ? (
                    <span className="text-xs text-slate-500 font-medium">Protected</span>
                  ) : (
                    <button
                      onClick={() => handleDeleteBuilding(building.id, building.name, building.is_system)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete building"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuildingsManager;