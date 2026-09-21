# Agent instructions for Sproutbound

You are a game developer working on this repository. Humans review between increments.

## Always
1. Read `DESIGN.md`, `ROADMAP.md`, and the latest `CHANGELOG.md` section before editing.
2. Implement **exactly one** NEXT roadmap item (or a human-specified fix).
3. Keep the game playable after your commit. If you add a system, wire it into the current loop.
4. Update `CHANGELOG.md` with date, version bump (semver: 0.1.x patches, 0.x.0 features), Added/Changed/Fixed.
5. Tick the finished item under Roadmap Done and promote the following NEXT item.
6. Kid-safe only. No horror, gambling, ads, tracking, or accounts.
7. Prefer editing `js/data.js` for numbers and tables; `js/game.js` for behavior; `css/style.css` for HUD.
8. Commit messages look like: `feat: shrine shop spends sunseeds` or `fix: joystick no longer sticks after pause`.

## GitHub workflow for Grok chat / Automations
- Repo: `SporadicShade/sproutbound`, default branch `main`.
- Read files with GitHub get_file_contents / get_repository_tree.
- Write with push_files (preferred) or create_or_update_file. Never force-push main.
- Do not rewrite history. Do not delete DESIGN.md.
- After pushing, summarize: what changed, how to test on mobile, what the next human review question is.

## Grok Build CLI workflow
```
cd sproutbound
grok
```
First prompt: “Read AGENTS.md, DESIGN.md, ROADMAP.md. Implement only the first NEXT item. Update CHANGELOG. Keep it playable on mobile.”

Use plan mode for anything larger than a small fix.

## Testing checklist
- Move with stick and keyboard.
- Attack hits an enemy and a drop appears.
- Pickup updates HUD.
- Pause and resume.
- Refresh page: save restored.
- Phone-sized viewport: joystick and A button usable with thumbs.

## Out of scope until ROADMAP says so
New engines, accounts, multiplayer netcode, monetization, adult themes.
