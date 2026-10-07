# Changelog

All notable changes to Sproutbound. Keep newest first. Automations must append here in the same format whenever they push code.

## [0.2.1] — 2026-10-07

### Fixed
- On-screen joystick now follows a finger drag. The old handler ignored moves unless the browser reported a mouse button, so phone drags never set a direction.
- Stick drag is tracked on the window after the first touch, so lifting outside the circle still releases cleanly.
- A button uses pointerdown, so it can fire while the other thumb is holding the stick.

## [0.2.0] — 2026-10-07

### Added
- Pause bag lists finds with counts. Heart Petals can be used from the bag for +3 HP.
- Shrine shop, only while Pip stands by a yellow shrine: Heart Petal for 4 Sunseeds, stronger swipe in three ranks (6 / 10 / 16 Sunseeds).
- Stronger swipe adds damage and a slightly wider swing. Rank shows on the HUD.

### Changed
- Heart Petals no longer heal the moment they are picked up. They go into the bag so the shop and Use button share one loop.
- Pause panel scrolls on a phone and keeps the joystick and A button visible underneath.

## [0.1.0] — 2026-09-21

### Added
- Seeded 56×56 top-down meadow with grass, flowers, trees, water, path, rocks, bushes, sand, and two shrines.
- Pip the Sproutling with keyboard + on-screen joystick movement.
- Melee swipe combat (A button / Space / J) with cooldown flash.
- Three dynamic enemies: Pebblebug, Puffmoth, Shadowseed (wander + aggro).
- Loot table drops (Sunseed, Smooth Pebble, Silkfluff, Gloom Kernel, Heart Petal, rare Sprout Cap).
- HP, XP, levels, inventory counts, minimap, localStorage autosave.
- Pause menu and New Adventure reset.
- Project docs: DESIGN, ROADMAP, AGENTS, changelog process.

### Notes
- First playable building block. Art is geometric on purpose so later increments can swap in pixel sprites without rewriting systems.
