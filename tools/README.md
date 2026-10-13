# Ashward tools

These run on your local machine. They do not use AI tokens unless you explicitly opt in.

## Launcher (Minecraft-style)

```bash
cd tools/launcher
node launcher.js              # list releases and what is installed
node launcher.js play         # download latest (if needed) and open in browser
node launcher.js play v0.6.0  # play a specific older version
node launcher.js update       # just download the latest
```

Versions are stored in `~/.ashward/versions/`. Old versions stay forever. The launcher starts a tiny local server and opens your browser. Your colony save lives in the browser’s localStorage and is independent of which version folder you launched.

Requires Node 18+ and the `unzip` or `tar` command.

## Headless balance tester

```bash
cd tools/sim-tester
node tester.js                 # run until you stop it
node tester.js --hours 1000    # stop after 1000 simulated hours
node tester.js --quiet         # less log spam

# From another terminal, to halt:
touch HALT
# or just Ctrl+C in the tester terminal
```

The tester is pure Node. It mirrors the current game’s tick, rates, night check, and scavenger loot. It prints every event by default and ends with a numeric summary.

Optional narrative summary (uses tokens only if you set a key):

```bash
export GROK_API_KEY=your-key   # or XAI_API_KEY
node tester.js --hours 500
```

If no key is set, it skips the LLM call and prints only numbers.

Keep `tester.js` in sync with `js/game.js` when the simulation changes.
