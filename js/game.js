(() => {
  const A = window.ASH;
  const SAVE_KEY = "ashward-save-v1";
  const stocksEl = document.getElementById("stocks");
  const peopleEl = document.getElementById("people");
  const mapEl = document.getElementById("map");
  const buildsEl = document.getElementById("builds");
  const logEl = document.getElementById("log");
  const clockEl = document.getElementById("clock");
  const state = blank();

  function blank() {
    return {
      hour: 0,
      day: 1,
      lastTick: Date.now(),
      threat: 5,
      gate: 4,
      buildings: { garden: 1, clinic: 0, watch: 0, wall: 1 },
      stocks: { food: 22, scrap: 14, meds: 5, ammo: 8, power: 10 },
      people: [
        { name: "Mara", job: "garden", hunger: 1, cond: "ready", trait: "careful" },
        { name: "Ivo", job: "scrap", hunger: 2, cond: "ready", trait: "stubborn" },
        { name: "Sera", job: "watch", hunger: 1, cond: "ready", trait: "quiet" },
        { name: "Penn", job: "idle", hunger: 1, cond: "ready", trait: "hungry" }
      ],
      districts: [{ name: "Ashward Yard", loot: 0 }],
      log: ["Four adults. One gate. The city does not end."]
    };
  }

  function log(line) {
    state.log.unshift(`Day ${state.day}, hour ${state.hour % 24}: ${line}`);
    state.log = state.log.slice(0, 60);
  }

  function active() {
    return state.people.filter((p) => p.cond === "ready" || p.cond === "tired");
  }

  function onJob(id) {
    return active().filter((p) => p.job === id);
  }

  function tickHour(quiet) {
    state.hour += 1;
    if (state.hour % 24 === 0) state.day += 1;
    const gardeners = onJob("garden");
    const scrappers = onJob("scrap");
    const medics = onJob("clinic");
    const watchers = onJob("watch");
    const beds = state.buildings.garden || 0;
    const fed = Math.min(gardeners.length, beds) * 2;
    state.stocks.food += fed;
    state.stocks.scrap += scrappers.length * 2;
    state.stocks.power = Math.max(0, state.stocks.power - 1 + Math.min(scrappers.length, 2));
    if (watchers.length && state.stocks.ammo > 0 && state.buildings.watch > 0) {
      state.stocks.ammo -= 1;
      state.threat = Math.max(0, state.threat - watchers.length);
    } else {
      state.threat += 1;
    }
    state.people.forEach((p) => {
      if (p.cond === "missing") return;
      const need = p.trait === "hungry" ? 2 : 1;
      if (state.stocks.food >= need) {
        state.stocks.food -= need;
        p.hunger = Math.max(0, p.hunger - 1);
        if (p.cond === "tired" && p.job === "idle") p.cond = "ready";
      } else {
        p.hunger += 1;
        if (p.hunger > 5) p.cond = "tired";
      }
    });
    medics.forEach((m) => {
      const hurt = state.people.find((p) => p.cond === "injured");
      if (hurt && state.stocks.meds > 0 && state.buildings.clinic > 0) {
        state.stocks.meds -= 1;
        hurt.cond = "tired";
        if (!quiet) log(`${m.name} clears ${hurt.name}'s injury at the clinic.`);
      }
    });
    if (!quiet && state.hour % 8 === 0) {
      log(`Yard report. Food ${state.stocks.food}, scrap ${state.stocks.scrap}, threat ${state.threat}, gate ${state.gate}.`);
    }
  }

  function nightPush() {
    const watchers = onJob("watch").length;
    const posts = state.buildings.watch || 0;
    let push = state.threat + 2;
    if (watchers && posts && state.stocks.ammo > 0) {
      const spent = Math.min(state.stocks.ammo, watchers);
      state.stocks.ammo -= spent;
      push -= spent * 2;
      log(`Watch spends ${spent} ammo. The push is ${Math.max(0, push)}.`);
    } else {
      log("No watch on the wall. The push comes in full.");
    }
    if (push > state.gate) {
      state.gate = Math.max(0, state.gate - 1);
      const victim = active()[0];
      if (victim) {
        victim.cond = state.stocks.meds > 0 ? "injured" : "missing";
        log(victim.cond === "injured"
          ? `${victim.name} is down inside the yard. Still alive.`
          : `${victim.name} is missing past the gate.`);
      }
      state.threat = Math.max(2, state.threat - 1);
    } else {
      state.threat = Math.max(1, state.threat - 1);
      log("The gate holds the night.");
    }
    state.lastTick = Date.now();
    render();
    save();
  }

  function catchUp() {
    const hours = Math.floor((Date.now() - state.lastTick) / A.hourMs);
    if (hours < 1) return;
    const ran = Math.min(hours, A.catchupCapHours);
    for (let i = 0; i < ran; i++) tickHour(true);
    state.lastTick += ran * A.hourMs;
    const left = hours - ran;
    log(left > 0
      ? `Away ${hours} hours. Caught up ${ran}. ${left} still waiting on the next open.`
      : `Away ${ran} hour${ran === 1 ? "" : "s"}. The yard worked without you.`);
  }

  function districtName() {
    const n = state.districts.length;
    const base = A.districts[n % A.districts.length];
    const street = A.streets[n % A.streets.length];
    return n < A.districts.length ? base : `${base} ${street} ${n}`;
  }

  function scout() {
    if (state.stocks.food < 3) {
      log("A scout pair wants 3 food.");
      render();
      return;
    }
    state.stocks.food -= 3;
    const name = districtName();
    state.districts.push({ name, loot: 1 + (state.hour % 3) });
    state.stocks.scrap += 3;
    log(`Street marked: ${name}. Scrap comes back.`);
    state.lastTick = Date.now();
    render();
    save();
  }

  function searchMissing() {
    const lost = state.people.find((p) => p.cond === "missing");
    if (!lost) {
      log("Nobody is missing.");
      render();
      return;
    }
    if (state.stocks.food < 2 || state.stocks.ammo < 1) {
      log("A search wants 2 food and 1 ammo.");
      render();
      return;
    }
    state.stocks.food -= 2;
    state.stocks.ammo -= 1;
    if (Math.random() < 0.65) {
      lost.cond = "injured";
      log(`${lost.name} is found and brought inside.`);
    } else {
      log(`No sign of ${lost.name} this hour.`);
    }
    state.lastTick = Date.now();
    render();
    save();
  }

  function buy(id) {
    const spec = A.buildings.find((b) => b.id === id);
    const have = state.buildings[id] || 0;
    if (have >= spec.max) {
      log(`${spec.name} is at its limit.`);
      render();
      return;
    }
    if (state.stocks.scrap < spec.cost) {
      log(`${spec.name} wants ${spec.cost} scrap.`);
      render();
      return;
    }
    state.stocks.scrap -= spec.cost;
    state.buildings[id] = have + 1;
    if (id === "wall") state.gate += 1;
    log(`${spec.name} raised. ${spec.effect}`);
    state.lastTick = Date.now();
    render();
    save();
  }

  function render() {
    clockEl.textContent = `Day ${state.day} · hour ${state.hour % 24} · threat ${state.threat} · gate ${state.gate} · v${A.version}`;
    stocksEl.replaceChildren();
    Object.entries(state.stocks).forEach(([k, v]) => {
      const d = document.createElement("div");
      d.className = "card";
      d.innerHTML = `<b>${k}</b><div>${v}</div>`;
      stocksEl.appendChild(d);
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
        log(`${p.name} takes ${sel.value}.`);
        save();
        render();
      });
      const title = document.createElement("div");
      title.innerHTML = `<b>${p.name}</b> · ${p.trait} · ${p.cond} · hunger ${p.hunger}`;
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
      Object.assign(state, blank(), data);
      state.stocks = Object.assign(blank().stocks, data.stocks || {});
      state.buildings = Object.assign(blank().buildings, data.buildings || {});
      state.people = (data.people || blank().people).map((p, i) => Object.assign(blank().people[i] || {}, p));
    } catch { /* fresh yard */ }
  }

  document.getElementById("btn-shift").addEventListener("click", () => {
    tickHour(false);
    state.lastTick = Date.now();
    log("You call the hour.");
    render();
    save();
  });
  document.getElementById("btn-night").addEventListener("click", nightPush);
  document.getElementById("btn-scout").addEventListener("click", scout);
  document.getElementById("btn-search").addEventListener("click", searchMissing);
  document.getElementById("btn-new").addEventListener("click", () => {
    const fresh = blank();
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    log("Relief camp. The map you already marked stays a rumor.");
    save();
    render();
  });

  load();
  catchUp();
  render();
  save();
  setInterval(() => {
    tickHour(true);
    state.lastTick = Date.now();
    render();
    save();
  }, A.hourMs);
})();
