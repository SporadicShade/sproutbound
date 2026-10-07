/* Ashward catalog. Keep numbers here. */
window.ASH = {
  version: "0.4.0",
  hourMs: 20000,
  catchupCapHours: 96,
  jobs: [
    { id: "garden", label: "Garden", food: 2, scrap: 0, power: 0 },
    { id: "scrap", label: "Scrap", food: 0, scrap: 2, power: 1 },
    { id: "clinic", label: "Clinic", food: 0, scrap: 0, power: 0 },
    { id: "watch", label: "Watch", food: 0, scrap: 0, power: 0 },
    { id: "idle", label: "Rest", food: 0, scrap: 0, power: 0 }
  ],
  buildings: [
    { id: "garden", name: "Garden beds", cost: 8, max: 3, effect: "Each bed lets one gardener feed the yard." },
    { id: "clinic", name: "Clinic cot", cost: 10, max: 2, effect: "A clinic worker spends 1 med to clear an injury." },
    { id: "watch", name: "Watch post", cost: 12, max: 2, effect: "A watcher with ammo cuts the night push." },
    { id: "wall", name: "Gate timber", cost: 6, max: 8, effect: "Raises gate strength by 1." }
  ],
  traits: ["quiet", "stubborn", "careful", "hungry"],
  districts: ["Cinder Market", "Rail Cut", "Glass Orchard", "Pump Row", "South Silos", "Red Clinic", "Wire Yard", "Old School"],
  streets: ["Lane", "Cut", "Row", "Court", "Span", "Well"]
};
