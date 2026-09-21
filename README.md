# Sproutbound

Kid-friendly retro **top-down** open-world RPG for phones and the browser.

You play as **Pip the Sproutling**. Wander a seeded meadow, swat mischievous (not scary) critters, pick up sparkling loot, and grow stronger. Built as a no-build HTML5 game so it can run on a phone immediately and be upgraded incrementally by Grok Build / Grok Automations.

Play locally: open `index.html` in a browser (or serve the folder).

Repo: https://github.com/SporadicShade/sproutbound

## Why this stack

- Works on mobile without an app store build.
- Zero toolchain: Grok can edit files and you can refresh the page.
- Easy changelog + roadmap loop.
- Later ports (Godot / Unity / Capacitor wrapper) can reuse the design docs.

## Current build (v0.1.0)

- Seeded 56×56 open meadow with paths, water, trees, two shrines
- Touch joystick + attack button, keyboard WASD / arrows + Space or J
- Three enemy types with wander + aggro
- Dynamic loot drops, XP, levels, local save
- Minimap, HUD, pause / new adventure

## Project files Grok should always read first

1. `DESIGN.md` — tone, audience, constraints
2. `ROADMAP.md` — next increment only
3. `CHANGELOG.md` — what already shipped
4. `AGENTS.md` — how an automation / Grok Build session must work

## Controls

| Input | Action |
| --- | --- |
| Left stick / WASD / arrows | Move |
| A button / Space / J | Attack |
| II / Esc | Pause |
