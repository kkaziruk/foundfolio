// src/lib/display.ts
export function displayBuildingName(campus: string, building: string) {
  const c = (campus || "").toLowerCase();
  const b = (building || "").trim();

  if (c === "nd" && b === "NDPD") return "Hammes Mowbray Hall (NDPD)";
  return b;
}
