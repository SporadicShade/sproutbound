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

  function blank() {
    return {
      hour: 8,
      day: 1,
      lastTick: Date.now(),
      threat: 5,
      gate: 4,
      buildings: { garden: 1, clinic: 0, watch: 1, wall: 1 },
      stocks: { food: 22, scrap: 14, meds: 5, ammo: 8, power: 10 },
      people: [
        { name: "Mara", job: "garden", hunger: 1, cond: "ready", trait: "careful", doing: "on shift", x: 48, y: 46 },
        { name: "Ivo", job: "scrap", hunger: 2, cond: "ready", trait: "stubborn", doing: "on shift", x: 58, y: 52 },
        { name: "Sera", job: "watch", hunger: 1, cond: "ready", trait: "quiet", doing: "on shift", x: 42, y: 40 },
        { name: "Penn", job: "unassigned", hunger: 1, cond: "ready", trait: "hungry", doing: "looking for work", x: 52, y: 60 }
      ],
      districts: [{ name: "Ashward Yard", x: 46, y: 48 }],
      log: ["Morning. People take their main jobs unless they are unassigned."]
    };
  }

  function clockHour() { return state.hour % 24; }
  function onShiftHours() { const h = clockHour(); return h >= 7 && h < 15; }
  function nightHours() { const h = clockHour(); return h >= 20 || h < 5; }

  function log(line) {
    state.log.unshift(`Day ${state.day} ${String(clockHour()).padStart(2, "0")}:00 — ${line}`);
    state.log = state.log.slice(0, 60);
  }

  function usable(p) { return p.cond === "ready" || p.cond === "tired"; }

  function chooseOwnTime(p) {
    if (p.cond === "missing") return "missing";
    if (p.cond === "injured") return "lying up";
    if (p.hunger > 3) return "looking for a meal";
    if (p.cond === "tired" || p.trait === "quiet") return "resting";
    if (p.trait === "stubborn") return "checking the gate";
    if (p.trait === "careful") return "mending clothes";
    if (p.trait === "hungry") return "snacking";
    return A.interests[state.hour % A.interests.length];
  }

  function place(p) {
    const yard = state.districts[0];
    if (p.doing === "on shift" && p.job === "watch") { p.x = 30; p.y = 28; return; }
    if (p.doing === "on shift" && p.job === "garden") { p.x = 62; p.y = 38; return; }
    if (p.doing === "on shift" && p.job === "scrap") { p.x = 70; p.y = 62; return; }
    if (p.doing === "scavenging" && state.districts.length > 1) {
      const d = state.districts[1 + (p.name.length % (state.districts.length - 1))];
      p.x = d.x; p.y = d.y; return;
    }
    p.x = yard.x + ((p.name.charCodeAt(0) % 7) - 3) * 3;
    p.y = yard.y + ((p.name.charCodeAt(1) % 5) - 2) * 3;
  }

  function rates() {
    const shift = onShiftHours();
    const working = state.people.filter((p) => usable(p) && shift && p.job !== "unassigned" && p.doing === "on shift");
    const garden = Math.min(working.filter((p) => p.job === "garden").length, state.buildings.garden || 0);
    const scrap = Math.min(working.filter((p) => p.job === "scrap").length, 4);
    const watch = Math.min(working.filter((p) => p.job === "watch").length, state.buildings.watch || 0);
    const eaters = state.people.filter((p) => p.cond !== "missing");
    const foodEat = eaters.reduce((n, p) => n + (p.trait === "hungry" ? 2 : 1), 0);
    return {
      food: garden * 2 - foodEat,
      scrap: scrap * 2,
      meds: working.some((p) => p.job === "clinic") && state.buildings.clinic ? -1 : 0,
      ammo: watch && nightHours() ? -watch : 0,
      power: -1 + Math.min(scrap, 2)
    };
  }

  function tickHour(quiet) {
    state.hour += 1;
    if (state.hour % 24 === 0) state.day += 1;
    const shift = onShiftHours();
    state.people.forEach((p) => {
      if (p.cond === "missing") { p.doing = "missing"; return; }
      if (p.cond === "injured") { p.doing = "lying up"; return; }
      if (!shift || p.job === "unassigned") {
        p.doing = p.job === "unassigned" && shift ? "picking up odd jobs" : chooseOwnTime(p);
        if (p.doing === "scavenging" || p.doing === "picking up odd jobs") state.stocks.scrap += 1;
        if (p.doing === "snacking" && state.stocks.food > 0) state.stocks.food -= 1;
      } else {
        p.doing = "on shift";
      }
      place(p);
    });
    const r = rates();
    state.stocks.food = Math.max(0, state.stocks.food + r.food);
    state.stocks.scrap = Math.max(0, state.stocks.scrap + Math.max(0, r.scrap));
    state.stocks.power = Math.max(0, state.stocks.power + r.power);
    if (r.ammo < 0) state.stocks.ammo = Math.max(0, state.stocks.ammo + r.ammo);
    state.people.forEach((p) => {
      if (p.cond === "missing") return;
      if (state.stocks.food === 0) p.hunger += 1;
      else p.hunger = Math.max(0, p.hunger - (p.doing === "resting" ? 1 : 0));
      if (p.hunger > 6) p.cond = "tired";
      if (p.doing === "resting" && p.cond === "tired") p.cond = "ready";
    });
    const medic = state.people.find((p) => p.doing === "on shift" && p.job === "clinic");
    const hurt = state.people.find((p) => p.cond === "injured");
    if (medic && hurt && state.stocks.meds > 0 && state.buildings.clinic > 0) {
      state.stocks.meds -= 1;
      hurt.cond = "tired";
      if (!quiet) log(`${medic.name} sits with ${hurt.name} until the injury eases.`);
    }
    if (nightHours()) {
      state.threat += 1;
      const watch = state.people.filter((p) => p.doing === "on shift" && p.job === "watch").length;
      let push = state.threat;
      if (watch && state.buildings.watch && state.stocks.ammo > 0) push -= watch;
      if (push > state.gate && clockHour() === 21) {
        state.gate = Math.max(0, state.gate - 1);
        const victim = state.people.find(usable);
        if (victim) {
          victim.cond = state.stocks.meds > 0 ? "injured" : "missing";
          victim.doing = victim.cond === "missing" ? "missing" : "lying up";
          log(victim.cond === "injured"
            ? `${victim.name} comes back from the gate hurt.`
            : `${victim.name} does not come back from the gate.`);
        }
      } else if (clockHour() === 21) {
        log("Night noise at the gate. It holds.");
      }
    } else if (clockHour() === 7 && !quiet) {
      log("Shift starts. Unassigned people find their own work.");
    } else if (clockHour() === 15 && !quiet) {
      log("Main jobs end. People drift to their own hours.");
    }
  }

  function catchUp() {
    const hours = Math.floor((Date.now() - state.lastTick) / A.hourMs);
    if (hours < 1) return;
    const ran = Math.min(hours, A.catchupCapHours);
    for (let i = 0; i < ran; i++) tickHour(true);
    state.lastTick += ran * A.hourMs;
    log(hours - ran > 0
      ? `Away ${hours} hours. Caught up ${ran}.`
      : `Away ${ran} hour${ran === 1 ? "" : "s"}. People kept their own hours.`);
  }

  function scout() {
    if (state.stocks.food < 3) { log("Scouting wants 3 food."); render(); return; }
    state.stocks.food -= 3;
    const n = state.districts.length;
    const base = A.districts[n % A.districts.length];
    const name = n < A.districts.length ? base : `${base} ${A.streets[n % A.streets.length]} ${n}`;
    const angle = n * 0.9;
    state.districts.push({
      name,
      x: 50 + Math.cos(angle) * (18 + n * 4),
      y: 50 + Math.sin(angle) * (16 + n * 3)
    });
    log(`A street gets a name: ${name}.`);
    render();
    save();
  }

  function searchMissing() {
    const lost = state.people.find((p) => p.cond === "missing");
    if (!lost) { log("Nobody is out past the gate."); render(); return; }
    if (Math.random() < 0.6) {
      lost.cond = "injured";
      lost.doing = "lying up";
      log(`${lost.name} is walked back in.`);
    } else log(`No sign of ${lost.name}.`);
    render();
    save();
  }

  function buy(id) {
    const spec = A.buildings.find((b) => b.id === id);
    const have = state.buildings[id] || 0;
    if (have >= spec.max || state.stocks.scrap < spec.cost) {
      log(have >= spec.max ? `${spec.name} is as built as it gets.` : `${spec.name} wants ${spec.cost} scrap.`);
      render();
      return;
    }
    state.stocks.scrap -= spec.cost;
    state.buildings[id] = have + 1;
    if (id === "wall") state.gate += 1;
    log(`${spec.name} goes up. ${spec.effect}`);
    render();
    save();
  }

  function rateText(n) {
    if (n > 0) return `+${n}/h`;
    if (n < 0) return `${n}/h`;
    return "0/h";
  }

  function render() {
    const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
    const phase = onShiftHours() ? "main shift" : nightHours() ? "night" : "own hours";
    clockEl.textContent = `Day ${state.day} ${String(clockHour()).padStart(2, "0")}:00 · ${phase} · next hour ${left}s · threat ${state.threat} · gate ${state.gate}`;
    const r = rates();
    stocksEl.replaceChildren();
    Object.entries(state.stocks).forEach(([k, v]) => {
      const d = document.createElement("div");
      d.className = "card";
      const n = r[k] || 0;
      d.innerHTML = `<b>${k}</b><div>${v} <span class="rate ${n > 0 ? "up" : n < 0 ? "down" : ""}">${rateText(n)}</span></div>`;
      stocksEl.appendChild(d);
    });
    cityEl.replaceChildren();
    state.districts.forEach((d0) => {
      const plot = document.createElement("div");
      plot.className = "plot";
      plot.style.left = `${Math.max(4, Math.min(78, d0.x))}%`;
      plot.style.top = `${Math.max(6, Math.min(78, d0.y))}%`;
      plot.textContent = d0.name;
      cityEl.appendChild(plot);
    });
    state.people.forEach((p) => {
      const dot = document.createElement("div");
      dot.className = "dot";
      dot.style.left = `${p.x}%`;
      dot.style.top = `${p.y}%`;
      dot.innerHTML = `<span>${p.name.split(" ")[0]}</span>`;
      cityEl.appendChild(dot);
    });
    peopleEl.replaceChildren();
    state.people.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = "person";
      const sel = document.createElement("select");
      A.jobs.forEach((job) => {
        const o = document.createElement("option");
        o.value = job.id;
        o.textContent = job.label;
        if (p.job === job.id) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => {
        state.people[i].job = sel.value;
        log(`${p.name}'s main job is now ${sel.options[sel.selectedIndex].textContent}.`);
        save();
        render();
      });
      const title = document.createElement("div");
      title.innerHTML = `<b>${p.name}</b> · ${p.trait} · ${p.cond}<div class="note">${p.doing}</div>`;
      d.append(title, sel);
      peopleEl.appendChild(d);
    });
    buildsEl.replaceChildren();
    A.buildings.forEach((b) => {
      const d = document.createElement("div");
      d.className = "build";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `Build ${b.name} (${b.cost} scrap)`;
      btn.addEventListener("click", () => buy(b.id));
      d.innerHTML = `<b>${b.name}</b> ${state.buildings[b.id] || 0}/${b.max}<div class="note">${b.effect}</div>`;
      d.appendChild(btn);
      buildsEl.appendChild(d);
    });
    mapEl.replaceChildren();
    state.districts.forEach((d0) => {
      const d = document.createElement("div");
      d.className = "district";
      d.textContent = d0.name;
      mapEl.appendChild(d);
    });
    logEl.replaceChildren();
    state.log.slice(0, 12).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      logEl.appendChild(li);
    });
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
      state.people = (data.people || blank().people).map((p, i) => Object.assign(blank().people[i] || { x: 50, y: 50 }, p));
      state.districts = data.districts || blank().districts;
    } catch { /* fresh */ }
  }

  document.getElementById("btn-scout").addEventListener("click", scout);
  document.getElementById("btn-search").addEventListener("click", searchMissing);
  document.getElementById("btn-new").addEventListener("click", () => {
    const fresh = blank();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    log("Relief camp. Named streets are rumors again.");
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
    }
    render();
  }, 1000);
})();
