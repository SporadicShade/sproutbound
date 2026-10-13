#!/usr/bin/env node
/**
 * Ashward headless balance tester.
 * Pure Node. No AI tokens for the simulation loop.
 * Runs indefinitely or until you create a file named HALT in this directory,
 * or press Ctrl+C.
 *
 * Verbose by default. At the end (or on halt) prints a numeric summary.
 * If you set GROK_API_KEY (or XAI_API_KEY) it will optionally ask an LLM
 * for a short narrative summary of the run. That is the only place tokens
 * can be used.
 *
 * Usage:
 *   node tester.js                  # run forever
 *   node tester.js --hours 500      # stop after 500 simulated hours
 *   node tester.js --quiet          # less verbose
 *   touch HALT                      # from another terminal to stop
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const args = process.argv.slice(2);
const maxHours = (() => {
  const i = args.indexOf('--hours');
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();
const quiet = args.includes('--quiet');
const HALT_FILE = path.join(__dirname, 'HALT');

// Minimal catalog mirrored from js/data.js (update when the game changes)
const A = {
  hourMs: 12000,
  catchupCapHours: 96,
  loot: [
    { name: 'sealed tin', stock: 'food', n: 2 },
    { name: 'coil of wire', stock: 'scrap', n: 3 },
    { name: 'clinic packet', stock: 'meds', n: 1 },
    { name: 'half box of rounds', stock: 'ammo', n: 1 },
    { name: 'dry battery', stock: 'power', n: 2 },
    { name: 'can of fuel', stock: 'power', n: 1 },
  ],
  districts: ['Cinder Market', 'Rail Cut', 'Glass Orchard', 'Pump Row'],
};

function blank() {
  return {
    hour: 8,
    day: 1,
    threat: 5,
    gate: 4,
    buildings: { garden: 1, clinic: 0, watch: 1, wall: 1 },
    stocks: { food: 28, scrap: 14, meds: 5, ammo: 8, power: 10 },
    people: [
      { name: 'Mara', job: 'garden', hunger: 1, fatigue: 1, cond: 'ready', trait: 'careful', doing: 'on shift' },
      { name: 'Ivo', job: 'scrap', hunger: 2, fatigue: 1, cond: 'ready', trait: 'stubborn', doing: 'on shift' },
      { name: 'Sera', job: 'watch', hunger: 1, fatigue: 0, cond: 'ready', trait: 'quiet', doing: 'on shift' },
      { name: 'Penn', job: 'unassigned', hunger: 1, fatigue: 0, cond: 'ready', trait: 'hungry', doing: 'looking for work' },
    ],
    districts: [{ name: 'Ashward Yard' }],
    log: [],
  };
}

const state = blank();
const stats = {
  hours: 0,
  nights: 0,
  nightHolds: 0,
  injuries: 0,
  lootEvents: 0,
  foodZeroHours: 0,
  scrapLowHours: 0,
  minFood: Infinity,
  minScrap: Infinity,
};

function clockHour() { return state.hour % 24; }
function onShiftHours() { const h = clockHour(); return h >= 7 && h < 15; }
function nightHours() { const h = clockHour(); return h >= 20 || h < 5; }
function usable(p) { return p.cond === 'ready' || p.cond === 'tired'; }

function log(line) {
  state.log.unshift(`D${state.day} ${String(clockHour()).padStart(2, '0')}h ${line}`);
  state.log = state.log.slice(0, 200);
  if (!quiet) console.log(state.log[0]);
}

function laborFactor(p) {
  if (!usable(p)) return 0;
  const tired = p.cond === 'tired' ? 0.6 : 1;
  const hours = onShiftHours() && p.job !== 'unassigned' ? 1 : 0.45;
  return hours * tired;
}

function mealNeed(p) {
  if (p.cond === 'missing') return 0;
  const base = p.trait === 'hungry' ? 0.22 : 0.16;
  const work = p.doing === 'on shift' ? 0.06 : 0.02;
  return base + work;
}

function rates() {
  const beds = Math.max(1, state.buildings.garden || 1);
  const bedYield = 1.2 * (1 - Math.exp(-beds / 2));
  let foodMake = 0, scrapMake = 0, powerMake = 0;
  state.people.forEach((p) => {
    const labor = laborFactor(p);
    if (p.job === 'garden') foodMake += labor * (2.2 + bedYield);
    if (p.job === 'scrap') {
      scrapMake += labor * 1.8;
      powerMake += labor * 0.4;
    }
    if (p.job === 'unassigned' && p.doing === 'picking up odd jobs') scrapMake += 0.4;
  });
  const foodUse = state.people.reduce((n, p) => n + mealNeed(p), 0);
  const medUse = state.people.some((p) => p.job === 'clinic' && usable(p)) && state.buildings.clinic && state.people.some((p) => p.cond === 'injured') ? 0.25 : 0;
  const ammoUse = nightHours() ? state.people.filter((p) => p.job === 'watch' && usable(p)).length * 0.15 : 0;
  return {
    food: { make: foodMake, use: foodUse },
    scrap: { make: scrapMake, use: 0 },
    meds: { make: 0, use: medUse },
    ammo: { make: 0, use: ammoUse },
    power: { make: powerMake, use: 0.35 },
  };
}

function markedStreets() {
  return state.districts.filter((d) => d.name !== 'Ashward Yard');
}

function steward(p) {
  const streets = markedStreets().length;
  const scores = [
    { task: 'resting', score: p.fatigue * 2 + (p.cond === 'tired' ? 3 : 0) },
    { task: 'looking for a meal', score: p.hunger * 1.4 },
    { task: 'checking the gate', score: Math.max(0, state.threat - state.gate) },
    { task: 'picking up odd jobs', score: state.stocks.scrap < 8 ? 2 : 0.4 },
    { task: 'sitting with the injured', score: state.people.some((q) => q.cond === 'injured') ? 2.5 : 0 },
    { task: 'scavenging a street', score: streets ? (state.stocks.scrap < 10 ? 2.2 : 1.3) : 0 },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

function tryLoot(p) {
  if (p.doing !== 'scavenging a street' || !p.street) return;
  if (Math.random() > 0.4) return;
  const find = A.loot[Math.floor(Math.random() * A.loot.length)];
  state.stocks[find.stock] = (state.stocks[find.stock] || 0) + find.n;
  stats.lootEvents += 1;
  log(`${p.name} brings back a ${find.name} from ${p.street}`);
}

function tickHour() {
  state.hour += 1;
  if (state.hour % 24 === 0) state.day += 1;
  stats.hours += 1;
  const shift = onShiftHours();

  state.people.forEach((p) => {
    if (p.cond === 'missing') { p.doing = 'missing'; return; }
    if (p.cond === 'injured') { p.doing = 'lying up'; return; }
    if (shift && p.job !== 'unassigned') {
      p.doing = 'on shift';
      p.street = null;
      p.fatigue = Math.min(8, p.fatigue + 0.4);
    } else {
      const choice = steward(p);
      p.doing = choice.task;
      if (choice.task === 'scavenging a street') {
        if (!p.street && markedStreets().length) {
          const list = markedStreets();
          p.street = list[Math.floor(Math.random() * list.length)].name;
        }
      } else {
        p.street = null;
      }
      p.fatigue = Math.max(0, p.fatigue - (choice.task === 'resting' ? 1 : 0.3));
      if (p.cond === 'tired' && p.fatigue < 2) p.cond = 'ready';
      tryLoot(p);
    }
  });

  const r = rates();
  state.stocks.food = Math.max(0, state.stocks.food + r.food.make - r.food.use);
  state.stocks.scrap += r.scrap.make;
  state.stocks.power = Math.max(0, state.stocks.power + r.power.make - r.power.use);
  state.stocks.ammo = Math.max(0, state.stocks.ammo - r.ammo.use);
  state.stocks.meds = Math.max(0, state.stocks.meds - r.meds.use);

  state.people.forEach((p) => {
    if (p.cond === 'missing') return;
    p.hunger = state.stocks.food > 0 ? Math.max(0, p.hunger - 0.4) : p.hunger + 1;
    if (p.hunger > 6) p.cond = 'tired';
  });

  if (state.stocks.food <= 0) stats.foodZeroHours += 1;
  if (state.stocks.scrap < 5) stats.scrapLowHours += 1;
  stats.minFood = Math.min(stats.minFood, state.stocks.food);
  stats.minScrap = Math.min(stats.minScrap, state.stocks.scrap);

  if (clockHour() === 21) {
    stats.nights += 1;
    const watch = state.people.filter((p) => p.job === 'watch' && usable(p)).length;
    if (state.threat > state.gate + watch) {
      const victim = state.people.find(usable);
      if (victim) {
        victim.cond = 'injured';
        victim.doing = 'lying up';
        stats.injuries += 1;
        log(`${victim.name} is brought in from the gate.`);
      }
    } else {
      stats.nightHolds += 1;
      log('Night noise. The gate number holds.');
    }
  }

  // Occasional scout for more interesting runs
  if (stats.hours % 48 === 0 && state.stocks.food > 6 && Math.random() < 0.4) {
    const n = state.districts.length;
    const base = A.districts[n % A.districts.length];
    const name = n < A.districts.length ? base : `${base} ${n}`;
    state.districts.push({ name });
    state.stocks.food -= 3;
    log(`Scouted ${name}.`);
  }
}

function shouldHalt() {
  if (fs.existsSync(HALT_FILE)) return true;
  if (stats.hours >= maxHours) return true;
  return false;
}

function printSummary() {
  const summary = {
    hours: stats.hours,
    days: Math.floor(stats.hours / 24),
    nights: stats.nights,
    nightHolds: stats.nightHolds,
    injuries: stats.injuries,
    lootEvents: stats.lootEvents,
    foodZeroHours: stats.foodZeroHours,
    scrapLowHours: stats.scrapLowHours,
    minFood: stats.minFood === Infinity ? null : Math.round(stats.minFood * 10) / 10,
    minScrap: stats.minScrap === Infinity ? null : Math.round(stats.minScrap * 10) / 10,
    finalStocks: { ...state.stocks },
    people: state.people.map((p) => ({ name: p.name, cond: p.cond, fatigue: Math.round(p.fatigue * 10) / 10, hunger: Math.round(p.hunger * 10) / 10 })),
  };
  console.log('\n=== NUMERIC SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

async function maybeLlmSummary(summary) {
  const key = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!key) {
    console.log('\n(No GROK_API_KEY / XAI_API_KEY set — skipping narrative summary. No tokens used.)');
    return;
  }
  console.log('\nRequesting short narrative summary from LLM...');
  const body = JSON.stringify({
    model: 'grok-3',
    messages: [
      { role: 'system', content: 'You are a terse colony analyst. Summarise the simulation numbers in 4-6 sentences. Focus on balance pressure, food/scrap sustainability, night outcomes, and any red flags. No gore.' },
      { role: 'user', content: JSON.stringify(summary) },
    ],
    max_tokens: 300,
  });
  const req = https.request({
    hostname: 'api.x.ai',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      try {
        const j = JSON.parse(data);
        const text = j.choices?.[0]?.message?.content || data;
        console.log('\n=== LLM SUMMARY ===');
        console.log(text);
      } catch {
        console.log('LLM response parse failed:', data.slice(0, 500));
      }
    });
  });
  req.on('error', (e) => console.error('LLM request failed:', e.message));
  req.write(body);
  req.end();
}

console.log('Ashward headless tester started.');
console.log(`Max hours: ${maxHours === Infinity ? 'unlimited' : maxHours}`);
console.log('Create a file named HALT in this folder or press Ctrl+C to stop.\n');

const interval = setInterval(() => {
  if (shouldHalt()) {
    clearInterval(interval);
    if (fs.existsSync(HALT_FILE)) fs.unlinkSync(HALT_FILE);
    const summary = printSummary();
    maybeLlmSummary(summary);
    process.exit(0);
  }
  tickHour();
}, 10); // fast tick for local testing; adjust if you want real-time pacing

process.on('SIGINT', () => {
  clearInterval(interval);
  const summary = printSummary();
  maybeLlmSummary(summary);
  process.exit(0);
});
