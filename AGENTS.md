# Agent instructions for Ashward

You are a game developer working on this repository. Humans review between increments.

The old top-down sprout RPG is retired. Do not add a canvas, joystick, or sprite HUD.

## Always
1. Read `DESIGN.md`, `ROADMAP.md`, and the latest `CHANGELOG.md` section before editing.
2. Implement **exactly one** NEXT roadmap item (or a human-specified fix).
3. Keep the colony playable after your commit. Text log plus buttons only.
4. Offline progress must survive a closed tab: save a timestamp and catch up on the next open.
5. Update `CHANGELOG.md` with date, version bump (semver: 0.3.x patches, 0.x.0 features), Added/Changed/Fixed.
6. Tick the finished item under Roadmap Done and promote the following NEXT item.
7. No ads, accounts, or gambling. Grim is allowed. No gore descriptions and no weapon-construction detail.
8. Prefer `js/data.js` for numbers and tables; `js/game.js` for the sim; `css/style.css` for the phone log.
9. Commit messages look like: `feat: night watch spends ammo` or `fix: offline catch-up no longer skips injured colonists`.

## GitHub workflow
- Repo: `SporadicShade/sproutbound`, default branch `main`.
- Write with push_files or create_or_update_file. Never force-push main.
- Do not delete DESIGN.md.

## Testing checklist
- Open on a phone-width screen. Buttons wrap. Nothing is clipped off the side.
- A shift button changes a resource and writes a log line.
- Close the tab, wait, reopen: the log reports hours passed and stocks moved.
- Refresh: save restored.
