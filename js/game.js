(() => {
  const A = window.ASH;
  const SAVE_KEY = "ashward-save-v1";
  const stocksEl = document.getElementById("stocks");
  const peopleEl = document.getElementById("people");
  const mapEl = document.getElementById("map");
  const buildsEl = document.getElementById("builds");
  const cityEl = document.getElementById("city-map");
  const logEl = document.getElementById("log");
  const clockEl = document.getElementById("clock");
  const state = blank();
  let nextAt = Date.now() + A.hourMs;
  let built = false;

  function blank() {
    return {
      hour: 8,
      day: 1,
      lastTick: Date.now(),
      threat: 5,
      gate: 4,
      buildings: { garden: 1, clinic: 0, watch: 1, wall: 1 },
      stocks: { food: 28, scrap: 14, meds: 5, ammo: 8, power: 10 },
      people: [
        { name: "Mara", job: "garden", hunger: 1, fatigue: 1, cond: "ready", trait: "careful", doing: "on shift" },
        { name: "Ivo", job: "scrap", hunger: 2, fatigue: 1, cond: "ready", trait: "stubborn", doing: "on shift" },
        { name: "Sera", job: "watch", hunger: 1, fatigue: 0, cond: "ready", trait: "quiet", doing: "on shift" },
        { name: "Penn", job: "unassigned", hunger: 1, fatigue: 0, cond: "ready", trait: "hungry", doing: "looking for work" }
      ],
      districts: [{ name: "Ashward Yard" }],
      log: ["The yard counts meals and labor. It does not use a fixed bonus."]
    };
  }

  function clockHour() { return state.hour % 24; }
  function onShiftHours() { const h = clockHour(); return h >= 7 && h < 15; }
  function nightHours() { const h = clockHour(); return h >= 20 || h < 5; }
  function usable(p) { return p.cond === "ready" || p.cond === "tired"; }
  function log(line) {
    state.log.unshift(`Day ${state.day} ${String(clockHour()).padStart(2, "0")}:00 — ${line}`);
    state.log = state.log.slice(0, 60);
  }

  function laborFactor(p) {
    if (!usable(p)) return 0;
    const tired = p.cond === "tired" ? 0.6 : 1;
    const hours = onShiftHours() && p.job !== "unassigned" ? 1 : 0.45;
    return hours * tired;
  }

  function mealNeed(p) {
    if (p.cond === "missing") return 0;
    const base = p.trait === "hungry" ? 0.22 : 0.16;
    const work = p.doing === "on shift" ? 0.06 : 0.02;
    return base + work;
  }

  function rates() {
    const beds = Math.max(1, state.buildings.garden || 1);
    const bedYield = 1.2 * (1 - Math.exp(-beds / 2));
    let foodMake = 0;
    let scrapMake = 0;
    let powerMake = 0;
    state.people.forEach((p) => {
      const labor = laborFactor(p);
      if (p.job === "garden") foodMake += labor * (2.2 + bedYield);
      if (p.job === "scrap") {
        scrapMake += labor * 1.8;
        powerMake += labor * 0.4;
      }
      if (p.job === "unassigned" && p.doing === "picking up odd jobs") scrapMake += 0.4;
    });
    const foodUse = state.people.reduce((n, p) => n + mealNeed(p), 0);
    const medUse = state.people.some((p) => p.job === "clinic" && usable(p)) && state.buildings.clinic && state.people.some((p) => p.cond === "injured") ? 0.25 : 0;
    const ammoUse = nightHours() ? state.people.filter((p) => p.job === "watch" && usable(p)).length * 0.15 : 0;
    return {
      food: { make: foodMake, use: foodUse },
      scrap: { make: scrapMake, use: 0 },
      meds: { make: 0, use: medUse },
      ammo: { make: 0, use: ammoUse },
      power: { make: powerMake, use: 0.35 }
    };
  }

  function steward(p) {
    const scores = [
      { task: "resting", score: p.fatigue * 2 + (p.cond === "tired" ? 3 : 0), why: "fatigue is high" },
      { task: "looking for a meal", score: p.hunger * 1.4, why: "hunger is ahead of the pot" },
      { task: "checking the gate", score: Math.max(0, state.threat - state.gate), why: "the gate is the weaker number" },
      { task: "picking up odd jobs", score: state.stocks.scrap < 8 ? 2 : 0.4, why: "scrap is thin" },
      { task: "sitting with the injured", score: state.people.some((q) => q.cond === "injured") ? 2.5 : 0, why: "someone is down" }
    ];
    scores.sort((a, b) => b.score - a.score);
    return scores[0];
  }

  function placeName(p) {
    if (p.cond === "missing") return "Past the gate";
    if (p.cond === "injured") return "Clinic";
    if (p.doing === "on shift" && p.job === "garden") return "Garden";
    if (p.doing === "on shift" && p.job === "scrap") return "Scrap pile";
    if (p.doing === "on shift" && p.job === "watch") return "Gate";
    if (p.doing === "on shift" && p.job === "clinic") return "Clinic";
    if (p.doing === "checking the gate") return "Gate";
    return "Ashward Yard";
  }

  function tickHour(quiet) {
    state.hour += 1;
    if (state.hour % 24 === 0) state.day += 1;
    const shift = onShiftHours();
    state.people.forEach((p) => {
      if (p.cond === "missing") { p.doing = "missing"; return; }
      if (p.cond === "injured") { p.doing = "lying up"; return; }
      if (shift && p.job !== "unassigned") {
        p.doing = "on shift";
        p.fatigue = Math.min(8, p.fatigue + 0.4);
      } else {
        const choice = steward(p);
        if (p.doing !== choice.task && !quiet) log(`${p.name} ${choice.task}: ${choice.why}.`);
        p.doing = choice.task;
        p.fatigue = Math.max(0, p.fatigue - (choice.task === "resting" ? 1 : 0.3));
        if (p.cond === "tired" && p.fatigue < 2) p.cond = "ready";
      }
    });
    const r = rates();
    state.stocks.food = Math.max(0, state.stocks.food + r.food.make - r.food.use);
    state.stocks.scrap += r.scrap.make;
    state.stocks.power = Math.max(0, state.stocks.power + r.power.make - r.power.use);
    state.stocks.ammo = Math.max(0, state.stocks.ammo - r.ammo.use);
    state.stocks.meds = Math.max(0, state.stocks.meds - r.meds.use);
    state.people.forEach((p) => {
      if (p.cond === "missing") return;
      p.hunger = state.stocks.food > 0 ? Math.max(0, p.hunger - 0.4) : p.hunger + 1;
      if (p.hunger > 6) p.cond = "tired";
    });
    if (clockHour() === 21) {
      const watch = state.people.filter((p) => p.job === "watch" && usable(p)).length;
      if (state.threat > state.gate + watch) {
        const victim = state.people.find(usable);
        if (victim) {
          victim.cond = "injured";
          victim.doing = "lying up";
          log(`${victim.name} is brought in from the gate.`);
        }
      } else if (!quiet) log("Night noise. The gate number holds.");
    }
  }

  function catchUp() {
    const hours = Math.floor((Date.now() - state.lastTick) / A.hourMs);
    if (hours < 1) return;
    const ran = Math.min(hours, A.catchupCapHours);
    for (let i = 0; i < ran; i++) tickHour(true);
    state.lastTick += ran * A.hourMs;
    log(`Away ${ran} hour${ran === 1 ? "" : "s"}. The labor count kept running.`);
  }

  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  function paintClock() {
    const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
    const phase = onShiftHours() ? "main shift" : nightHours() ? "night" : "own hours";
    clockEl.textContent = `Day ${state.day} ${String(clockHour()).padStart(2, "0")}:00 · ${phase} · next hour ${left}s · threat ${state.threat} · gate ${state.gate}`;
  }

  function paintStocks() {
    const r = rates();
    stocksEl.replaceChildren();
    Object.entries(state.stocks).forEach(([k, v]) => {
      const part = r[k] || { make: 0, use: 0 };
      const net = part.make - part.use;
      const d = document.createElement("div");
      d.className = "card";
      d.innerHTML = `<b>${k}</b><div>${fmt(v)} <span class="rate ${net > 0 ? "up" : net < 0 ? "down" : ""}">+${fmt(part.make)} / -${fmt(part.use)}</span></div>`;
      stocksEl.appendChild(d);
    });
  }

  function paintMap() {
    cityEl.replaceChildren();
    const spots = ["Ashward Yard", "Garden", "Scrap pile", "Gate", "Clinic"]
      .concat(state.districts.map((d) => d.name).filter((name) => name !== "Ashward Yard"));
    spots.forEach((name) => {
      const cell = document.createElement("div");
      cell.className = "plot";
      const here = state.people.filter((p) => placeName(p) === name);
      cell.innerHTML = `<b>${name}</b><div>${here.length ? here.map((p) => p.name).join(", ") : "empty"}</div>`;
      cityEl.appendChild(cell);
    });
    mapEl.replaceChildren();
    state.districts.forEach((d0) => {
      const d = document.createElement("div");
      d.className = "district";
      d.textContent = d0.name;
      mapEl.appendChild(d);
    });
  }

  function paintPeople() {
    const open = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.person;
    state.people.forEach((p, i) => {
      let card = peopleEl.querySelector(`[data-card="${i}"]`);
      if (!card) {
        card = document.createElement("div");
        card.className = "person";
        card.dataset.card = String(i);
        const title = document.createElement("div");
        title.className = "who";
        const sel = document.createElement("select");
        sel.dataset.person = String(i);
        A.jobs.forEach((job) => {
          const o = document.createElement("option");
          o.value = job.id;
          o.textContent = job.label;
          sel.appendChild(o);
        });
        sel.addEventListener("change", () => {
          state.people[i].job = sel.value;
          log(`${p.name}'s main job is now ${sel.options[sel.selectedIndex].textContent}.`);
          save();
          paintStocks();
          paintMap();
          paintPeople();
        });
        card.append(title, sel);
        peopleEl.appendChild(card);
      }
      card.querySelector(".who").textContent = `${p.name} · ${p.trait} · ${p.cond} · ${p.doing}`;
      const sel = card.querySelector("select");
      if (open !== String(i)) sel.value = p.job;
    });
  }

  function paintLog() {
    logEl.replaceChildren();
    state.log.slice(0, 12).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      logEl.appendChild(li);
    });
  }

  function paintBuilds() {
    if (built) return;
    buildsEl.replaceChildren();
    A.buildings.forEach((b) => {
      const d = document.createElement("div");
      d.className = "build";
      d.dataset.build = b.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `Build ${b.name} (${b.cost} scrap)`;
      btn.addEventListener("click", () => buy(b.id));
      d.innerHTML = `<b>${b.name}</b> <span class="have"></span><div class="note">${b.effect}</div>`;
      d.appendChild(btn);
      buildsEl.appendChild(d);
    });
    built = true;
    refreshBuilds();
  }

  function refreshBuilds() {
    A.buildings.forEach((b) => {
      const d = buildsEl.querySelector(`[data-build="${b.id}"]`);
      if (d) d.querySelector(".have").textContent = `${state.buildings[b.id] || 0}/${b.max}`;
    });
  }

  function render() {
    paintClock();
    paintStocks();
    paintMap();
    paintPeople();
    paintLog();
    paintBuilds();
  }

  function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(state, blank(), data);
      state.stocks = Object.assign(blank().stocks, data.stocks || {});
      state.buildings = Object.assign(blank().buildings, data.buildings || {});
      state.people = (data.people || blank().people).map((p, i) => Object.assign(blank().people[i] || {}, p, { fatigue: p.fatigue || 0 }));
      state.districts = data.districts && data.districts.length ? data.districts : blank().districts;
    } catch { /* fresh */ }
  }

  function buy(id) {
    const spec = A.buildings.find((b) => b.id === id);
    const have = state.buildings[id] || 0;
    if (have >= spec.max || state.stocks.scrap < spec.cost) {
      log(have >= spec.max ? `${spec.name} is as built as it gets.` : `${spec.name} wants ${spec.cost} scrap.`);
      paintLog();
      return;
    }
    state.stocks.scrap -= spec.cost;
    state.buildings[id] = have + 1;
    if (id === "wall") state.gate += 1;
    log(`${spec.name} goes up. Yield now comes from beds and labor, not a flat bonus.`);
    save();
    refreshBuilds();
    render();
  }

  document.getElementById("btn-scout").addEventListener("click", () => {
    if (state.stocks.food < 3) { log("Scouting wants 3 food."); paintLog(); return; }
    state.stocks.food -= 3;
    const n = state.districts.length;
    const base = A.districts[n % A.districts.length];
    const name = n < A.districts.length ? base : `${base} ${A.streets[n % A.streets.length]} ${n}`;
    state.districts.push({ name });
    log(`A street gets a name: ${name}.`);
    save();
    render();
  });
  document.getElementById("btn-search").addEventListener("click", () => {
    const lost = state.people.find((p) => p.cond === "missing");
    if (!lost) { log("Nobody is out past the gate."); paintLog(); return; }
    lost.cond = "injured";
    lost.doing = "lying up";
    log(`${lost.name} is walked back in.`);
    save();
    render();
  });
  document.getElementById("btn-new").addEventListener("click", () => {
    const fresh = blank();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    peopleEl.replaceChildren();
    built = false;
    log("Relief camp. The count starts again.");
    save();
    render();
  });

  load();
  catchUp();
  nextAt = state.lastTick + A.hourMs;
  render();
  save();
  setInterval(() => {
    if (Date.now() >= nextAt) {
      tickHour(false);
      state.lastTick = Date.now();
      nextAt = Date.now() + A.hourMs;
      save();
      render();
      return;
    }
    paintClock();
  }, 1000);
})();
