# Changelog

All notable changes to this repo. Keep newest first.

## [0.5.2] — 2026-10-07

### Fixed
- Job dropdown stays open. The page no longer rebuilds the select every second.

### Changed
- Food, scrap, and power come from a labor count: hours on shift, fatigue, and beds with diminishing return. Meals are a per-person need, higher if the person is hungry or working. The card shows both sides to one decimal.
- Own hours are chosen by a steward score: fatigue, hunger, gate pressure, thin scrap, someone injured. The log says why.

## [0.5.1] — 2026-10-07

### Fixed
- Food and scrap rates follow the job you assign. Two gardeners produce food even with one bed. A scrapper no longer shows 0.
- Each stock shows production and use separately, as +n / -n.
- The city map is a grid of places. People are named inside the yard, garden, scrap pile, gate, or clinic. Old saves with no coordinates still draw.

## [0.5.0] — 2026-10-07

### Added
- The clock advances by itself. An hour is 12 seconds while the page is open. No advance button.
- Each stock shows an hourly rate, green for gain and red for use.
- A small city map marks the yard, known streets, and where each person is.
- Main job is only the day shift, 07:00 to 15:00. After that people rest, scavenge, mend, or check the gate. Unassigned people pick odd jobs.

### Changed
- Night pressure happens when the clock reaches night, not from a button.

## [0.4.0] — 2026-10-07

### Added
- Adult colony depth: job assignment, buildings, night push, search for the missing.

## [0.3.0] — 2026-10-07

### Added
- Ashward text colony with offline catch-up.
### Changed
- Retired the top-down sprout RPG.
