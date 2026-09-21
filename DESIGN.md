# Sproutbound design bible

## Audience
Kids roughly 6–12, plus parents looking over a shoulder. Bright, readable, short sessions. No horror, no gore, no gambling, no chat, no real-money loot.

## Fantasy
A living meadow that feels bigger than the first screen. Pip is small and brave. Enemies are pests and tricksters, not monsters. Winning looks like the world getting prettier, not darker.

## Pillars
1. **Readable retro top-down.** 32px tiles, strong silhouettes, high contrast HUD.
2. **One-thumb mobile.** Joystick left, attack right, never cover the hero.
3. **Open meadow, not a hallway.** Always another grove, shrine, or sparkle in view.
4. **Dynamic but fair.** Enemies change pathing and drop tables; kids never get one-shot from full health at level 1.
5. **Grow in public.** Every increment is playable. Changelog is the source of truth.

## Tone
Warm, a little funny, never sarcastic at the player. Toasts like “Found Silkfluff!” not “Loot acquired.”

## Combat rules
- Telegraphed, short-range swipe.
- I-frames after a hit.
- Defeat returns Pip to the home shrine with full HP. No game-over screen.
- Enemy HP bars stay on. No jump-scare spawns on top of the player.

## Content rules
- Names stay invented and kid-safe (Pebblebug, Puffmoth, Shadowseed).
- Loot is physical and cute: seeds, pebbles, petals, caps.
- Music / SFX later: chiptune, no lyrics.
- No blood. Hits flash white. Drops sparkle.

## Technical constraints
- Keep `js/data.js` as the catalog of tiles, enemies, items, XP curve.
- Keep `js/game.js` as the loop. Split files only when a system is clearly isolated (quests, inventory UI, audio).
- No bundler unless ROADMAP explicitly starts a port.
- Preserve mobile touch controls in every UI change.

## Success for a session
A kid can wander, fight something, pick up a sparkle, and feel they found a secret in under two minutes.
