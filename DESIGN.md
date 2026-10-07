# Ashward design bible

## Audience
Adults who want a slow colony log they can leave and come back to. Not a kids game. Not a canvas action game.

## Fantasy
Ashward is a walled yard in a dead city. Colonists keep a gate, a garden, and a scrap pile while the streets fill with infected. Winning is lasting another week and pushing the map one district further. There is no last level.

## Pillars
1. **Text first.** A phone shows a log, stocks, and buttons. No map canvas, no virtual stick.
2. **The yard keeps working offline.** Time is stored. Opening the page catches the colony up.
3. **Open city, not a hallway.** Scouting names a new district forever. The edge is never finished.
4. **Pressure, not spectacle.** Horde strength is a number. Hits are reported as injuries and missing people, not described wounds.
5. **One increment at a time.** Every push stays playable.

## Tone
Dry and practical. Log lines like "Ivo patched the east gate." Not horror prose.

## Survival rules
- Food, scrap, meds, ammo, and power are the stocks.
- Colonists have a job, hunger, and a condition: ready, tired, injured, missing.
- Buildings change the hourly tick. The gate slows the horde. The watch spends ammo. The garden makes food.
- A breach can injure or mark a colonist missing. A later search can bring them back. No permanent gore state.
- There is no game-over screen. A fallen yard starts a relief camp in the same save and keeps the map.

## Technical constraints
- Static HTML, CSS, and JS. No bundler.
- `localStorage` key `ashward-save-v1` stores world, stocks, people, and `lastTick`.
- Catch-up is capped per open so a phone does not freeze, and the log says if more time is still waiting.
