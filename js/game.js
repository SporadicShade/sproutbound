(() => {
  const A = window.ASH;
  const SAVE_KEY = "ashward-save-v1";
  const stocksEl = document.getElementById("stocks");
  const peopleEl = document.getElementById("people");
  const mapEl = document.getElementById("map");
  const logEl = document.getElementById("log");
  const clockEl = document.getElementById("clock");

  const state = blank();

  function blank() {
    return {
      hour: 0,
      lastTick: Date.now(),
      threat: 4,
      gate: 6,
      stocks: { food: 18, scrap: 12, meds: 4, ammo: 6, power: 8 },
      people: [
        { name: "Mara", job: "garden", hunger: 2, cond: "ready" },
        { name: "Ivo", job: "scrap", hunger: 2, cond: "ready" },
        { name: "Sera", job: "watch", hunger: 1, cond: "ready" },
        { name: "Penn", job: "idle", hunger: 1, cond: "ready" }
      ],
      districts: [{ name: "Ashward Yard", known: true }],
      log: ["The gate holds. Four people, one yard, a city with no edge."]
    };
  }

  function log(line) {
    state.log.unshift(`Hour ${state.hour}: ${line}`);
    state.log = state.log.slice(0, 40);
  }

  function readyPeople() {
    return state.people.filter((p) => p.cond === "ready" || p.cond === "tired");
  }

  function tickHour() {
    state.hour += 1;
    const ready = readyPeople();
    const gardeners = ready.filter((p) => p.job === "garden").length;
    const scrappers = ready.filter((p) => p.job === "scrap").length;
    const watchers = ready.filter((p) => p.job === "watch").length;
    state.stocks.food += gardeners * 2;
    state.stocks.scrap += scrappers;
    state.stocks.power = Math.max(0, state.stocks.power - 1 + Math.min(1, scrappers));
    if (watchers && state.stocks.ammo > 0) {
      state.stocks.ammo -= 1;
      state.threat = Math.max(0, state.threat - 1);
    } else {
      state.threat += 1;
    }
    state.people.forEach((p) => {
      if (p.cond === "missing") return;
      if (state.stocks.food > 0) {
        state.stocks.food -= 1;
        p.hunger = Math.max(0, p.hunger - 1);
      } else {
        p.hunger += 1;
      }
      if (p.hunger > 4) p.cond = "tired";
      if (p.cond === "injured" && state.stocks.meds > 0) {
        state.stocks.meds -= 1;
        p.cond = "tired";
        log(`${p.name} is back on their feet.`);
      }
    });
    state.stocks.food = Math.max(0, state.stocks.food);
    if (state.threat > state.gate + 2) {
      const victim = ready[0];
      state.gate = Math.max(0, state.gate - 1);
      state.threat = Math.max(1, state.threat - 2);
      if (victim) {
        victim.cond = state.stocks.meds > 0 ? "injured" : "missing";
        log(victim.cond === "injured"
          ? `${victim.name} is hurt at the gate. The yard still stands.`
          : `${victim.name} is missing after a push on the gate.`);
      } else {
        log("The gate bends. Nobody is at the wall.");
      }
    }
    if (state.hour % 6 === 0) log(`Stocks hold. Threat ${state.threat}. Gate ${state.gate}.`);
  }

  function catchUp() {
    const elapsed = Date.now() - state.lastTick;
    let hours = Math.floor(elapsed / A.hourMs);
    if (hours < 1) return;
    const ran = Math.min(hours, A.catchupCapHours);
    for (let i = 0; i < ran; i++) tickHour();
    state.lastTick += ran * A.hourMs;
    const left = hours - ran;
    log(left > 0
      ? `You were away ${hours} hours. The log covers ${ran}. ${left} still wait.`
      : `You were away ${ran} hour${ran === 1 ? "" : "s"}. The yard kept working.`);
  }

  function workShift() {
    tickHour();
    state.lastTick = Date.now();
    log("A shift ends. The yard is louder, not safer.");
    render();
    save();
  }

  function scout() {
    if (state.stocks.food < 2) {
      log("Scout needs 2 food.");
      render();
      return;
    }
    state.stocks.food -= 2;
    const n = state.districts.length;
    const base = A.districts[n % A.districts.length];
    const street = A.streets[n % A.streets.length];
    const name = n < A.districts.length ? base : `${base} ${street} ${n}`;
    state.districts.push({ name, known: true });
    state.stocks.scrap += 2;
    log(`Scout marks ${name}. Scrap comes back with them.`);
    state.lastTick = Date.now();
    render();
    save();
  }

  function patchGate() {
    if (state.stocks.scrap < 3) {
      log("The gate wants 3 scrap.");
      render();
      return;
    }
    state.stocks.scrap -= 3;
    state.gate += 1;
    log("Ivo's patch holds. Gate strength rises.");
    state.lastTick = Date.now();
    render();
    save();
  }

  function render() {
    clockEl.textContent = `Hour ${state.hour} · threat ${state.threat} · gate ${state.gate} · v${A.version}`;
    stocksEl.replaceChildren();
    Object.entries(state.stocks).forEach(([k, v]) => {
      const d = document.createElement("div");
      d.className = "card";
      d.innerHTML = `<b>${k}</b><div>${v}</div>`;
      stocksEl.appendChild(d);
    });
    peopleEl.replaceChildren();
    state.people.forEach((p) => {
      const d = document.createElement("div");
      d.className = "person";
      d.innerHTML = `<b>${p.name}</b> · ${p.job} · ${p.cond}`;
      peopleEl.appendChild(d);
    });
    mapEl.replaceChildren();
    state.districts.forEach((d0) => {
      const d = document.createElement("div");
      d.className = "district";
      d.textContent = d0.name;
      mapEl.appendChild(d);
    });
    logEl.replaceChildren();
    state.log.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      logEl.appendChild(li);
    });
  }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(state, data);
      state.stocks = Object.assign(blank().stocks, data.stocks || {});
      state.people = data.people || state.people;
      state.districts = data.districts || state.districts;
      state.log = data.log || state.log;
    } catch { /* new yard */ }
  }

  document.getElementById("btn-shift").addEventListener("click", workShift);
  document.getElementById("btn-scout").addEventListener("click", scout);
  document.getElementById("btn-gate").addEventListener("click", patchGate);
  document.getElementById("btn-new").addEventListener("click", () => {
    const fresh = blank();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    log("A relief camp starts in the same city.");
    save();
    render();
  });

  load();
  catchUp();
  render();
  save();
  setInterval(() => {
    tickHour();
    state.lastTick = Date.now();
    log("The hour turns.");
    render();
    save();
  }, A.hourMs);
})();
