/* Ashward catalog. Keep numbers here. */
window.ASH = {
  version: "0.5.1",
  hourMs: 12000,
  catchupCapHours: 96,
  jobs: [
    { id: "garden", label: "Garden" },
    { id: "scrap", label: "Scrap" },
    { id: "clinic", label: "Clinic" },
    { id: "watch", label: "Watch" },
    { id: "unassigned", label: "Unassigned" }
  ],
  interests: ["rest", "scavenge", "sit with someone", "mend clothes", "check the gate"],
  buildings: [
    { id: "garden", name: "Garden beds", cost: 8, max: 3, effect: "A gardener on shift feeds the yard." },
    { id: "clinic", name: "Clinic cot", cost: 10, max: 2, effect: "Clinic shift spends a med on an injury." },
    { id: "watch", name: "Watch post", cost: 12, max: 2, effect: "Watch shift spends ammo after dusk." },
    { id: "wall", name: "Gate timber", cost: 6, max: 8, effect: "Raises gate strength by 1." }
  ],
  districts: ["Cinder Market", "Rail Cut", "Glass Orchard", "Pump Row", "South Silos", "Red Clinic", "Wire Yard", "Old School"],
  streets: ["Lane", "Cut", "Row", "Court", "Span", "Well"]
};
