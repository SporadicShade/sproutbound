(() => {
  const S = window.SPROUT;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const toastEl = document.getElementById("toast");
  const pauseMenu = document.getElementById("pause-menu");
  const stick = document.getElementById("stick");
  const knob = document.getElementById("knob");
  const bagList = document.getElementById("bag-list");
  const shopNote = document.getElementById("shop-note");
  const buyPetalBtn = document.getElementById("btn-buy-petal");
  const buySwipeBtn = document.getElementById("btn-buy-swipe");

  const SAVE_KEY = "sproutbound-save-v1";
  const state = {
    paused: false,
    keys: new Set(),
    stick: { x: 0, y: 0 },
    pad: { x: 0, y: 0 },
    attackCooldown: 0,
    toastTimer: 0,
    time: 0,
    world: [],
    entities: [],
    drops: [],
    particles: [],
    player: null,
    camera: { x: 0, y: 0 }
  };

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    state.toastTimer = 2.2;
  }

  function resize() {
    const stage = document.getElementById("stage");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(stage.clientWidth * dpr);
    canvas.height = Math.floor(stage.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= S.worldSize || ty >= S.worldSize) return S.tiles.WATER;
    return state.world[ty][tx];
  }

  function blocked(x, y, r = 10) {
    const points = [
      [x - r, y], [x + r, y], [x, y - r], [x, y + r]
    ];
    return points.some(([px, py]) => S.solid.has(tileAt(Math.floor(px / S.tile), Math.floor(py / S.tile))));
  }

  function generateWorld(seed = 42) {
    const rand = mulberry32(seed);
    const n = S.worldSize;
    const grid = Array.from({ length: n }, () => Array(n).fill(S.tiles.GRASS));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
        if (edge < 2) grid[y][x] = S.tiles.WATER;
        else if (rand() < 0.05) grid[y][x] = S.tiles.FLOWER;
        else if (rand() < 0.08) grid[y][x] = S.tiles.TALL;
        else if (rand() < 0.07) grid[y][x] = S.tiles.BUSH;
        else if (rand() < 0.05) grid[y][x] = S.tiles.TREE;
        else if (rand() < 0.03) grid[y][x] = S.tiles.ROCK;
        else if (rand() < 0.02) grid[y][x] = S.tiles.SAND;
      }
    }
    let px = 8, py = n >> 1;
    while (px < n - 8) {
      grid[py][px] = S.tiles.PATH;
      grid[Math.max(1, py - 1)][px] = S.tiles.PATH;
      px += 1;
      if (rand() < 0.4) py += rand() < 0.5 ? -1 : 1;
      py = Math.max(6, Math.min(n - 7, py));
    }
    grid[n >> 1][8] = S.tiles.SHRINE;
    grid[(n >> 1) + 6][n - 10] = S.tiles.SHRINE;
    state.world = grid;
  }

  function spawnPlayer() {
    state.player = {
      x: 10 * S.tile, y: (S.worldSize >> 1) * S.tile,
      r: 11, hp: 10, maxHp: 10, seeds: 0, loot: 0, xp: 0, level: 1,
      facing: 1, invuln: 0, inventory: {}, swipe: 0
    };
  }

  function pickOpenTile(rand) {
    for (let i = 0; i < 80; i++) {
      const tx = 4 + Math.floor(rand() * (S.worldSize - 8));
      const ty = 4 + Math.floor(rand() * (S.worldSize - 8));
      if (!S.solid.has(tileAt(tx, ty)) && tileAt(tx, ty) !== S.tiles.SHRINE) {
        return { x: tx * S.tile + 16, y: ty * S.tile + 16 };
      }
    }
    return { x: 20 * S.tile, y: 20 * S.tile };
  }

  function spawnEnemies(seed = 99) {
    const rand = mulberry32(seed);
    const kinds = Object.keys(S.enemies);
    state.entities = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(rand() * kinds.length)];
      const spec = S.enemies[kind];
      const pos = pickOpenTile(rand);
      state.entities.push({
        id: i, kind, ...pos, r: 10,
        hp: spec.hp, maxHp: spec.hp,
        wander: rand() * Math.PI * 2,
        flash: 0
      });
    }
  }

  function addDrop(x, y, itemId) {
    state.drops.push({ x, y, itemId, bob: Math.random() * Math.PI * 2 });
  }

  function grantItem(id, amount = 1) {
    const item = S.items[id];
    if (!item) return;
    const p = state.player;
    if (item.kind === "currency") p.seeds += amount;
    else {
      p.inventory[id] = (p.inventory[id] || 0) + amount;
      if (item.kind !== "heal") p.loot += amount;
    }
    toast(item.kind === "heal" ? `Found ${item.name}! Open pause to use it.` : `Found ${item.name}!`);
  }

  function levelFromXp(xp) {
    let lv = 1;
    for (let i = 1; i < S.levels.length; i++) if (xp >= S.levels[i]) lv = i + 1;
    return Math.min(lv, S.levels.length);
  }

  function addXp(n) {
    const p = state.player;
    p.xp += n;
    const next = levelFromXp(p.xp);
    if (next > p.level) {
      p.level = next;
      p.maxHp += 2;
      p.hp = p.maxHp;
      toast(`Pip grew to level ${p.level}!`);
    }
  }

  function swipeBonus() {
    return state.player.swipe || 0;
  }

  function attack() {
    if (state.attackCooldown > 0 || state.paused) return;
    state.attackCooldown = 0.32;
    const p = state.player;
    const bonus = swipeBonus();
    const reach = 34 + bonus * 4;
    const ax = p.x + p.facing * 18;
    const ay = p.y;
    state.particles.push({ x: ax, y: ay, life: 0.18, color: bonus ? "#fff0a0" : "#fff4b0" });
    for (const e of state.entities) {
      const dx = e.x - ax, dy = e.y - ay;
      if (dx * dx + dy * dy < reach * reach) {
        e.hp -= 2 + Math.floor(p.level / 2) + bonus;
        e.flash = 0.15;
        if (e.hp <= 0) {
          const spec = S.enemies[e.kind];
          addXp(spec.xp);
          const drop = spec.loot[Math.floor(Math.random() * spec.loot.length)];
          addDrop(e.x, e.y, drop);
          if (Math.random() < 0.08) addDrop(e.x + 6, e.y, "sproutcap");
          e.dead = true;
        }
      }
    }
    state.entities = state.entities.filter((e) => !e.dead);
  }

  function hurtPlayer(dmg) {
    const p = state.player;
    if (p.invuln > 0) return;
    p.hp -= dmg;
    p.invuln = 0.8;
    if (p.hp <= 0) {
      p.hp = 0;
      toast("Pip needs a rest... shrine light returns you.");
      p.x = 10 * S.tile;
      p.y = (S.worldSize >> 1) * S.tile;
      p.hp = p.maxHp;
    }
  }

  function nearShrine() {
    const p = state.player;
    const tx = Math.floor(p.x / S.tile);
    const ty = Math.floor(p.y / S.tile);
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (tileAt(x, y) === S.tiles.SHRINE) return true;
      }
    }
    return false;
  }

  function useItem(id) {
    const p = state.player;
    const item = S.items[id];
    const n = p.inventory[id] || 0;
    if (!item || n <= 0) return;
    if (item.kind === "heal") {
      if (p.hp >= p.maxHp) {
        toast("Pip is already full of pep!");
        return;
      }
      p.inventory[id] = n - 1;
      if (p.inventory[id] <= 0) delete p.inventory[id];
      p.hp = Math.min(p.maxHp, p.hp + item.value);
      toast(`${item.name} helps (+${item.value} HP)`);
    } else {
      toast(`${item.name} is a keepsafe.`);
    }
    renderPause();
    save();
  }

  function buyPetal() {
    const offer = S.shop.heartpetal;
    if (!nearShrine()) {
      toast("Stand by a shrine to trade.");
      renderPause();
      return;
    }
    const p = state.player;
    if (p.seeds < offer.cost) {
      toast(`Need ${offer.cost} Sunseeds for a Heart Petal.`);
      return;
    }
    p.seeds -= offer.cost;
    p.inventory.heartpetal = (p.inventory.heartpetal || 0) + 1;
    toast("The shrine tucks a Heart Petal into the bag.");
    renderPause();
    save();
  }

  function buySwipe() {
    const offer = S.shop.swipe;
    const p = state.player;
    const rank = p.swipe || 0;
    if (!nearShrine()) {
      toast("Stand by a shrine to trade.");
      renderPause();
      return;
    }
    if (rank >= offer.max) {
      toast("The swipe is as bright as the shrine allows.");
      return;
    }
    const cost = offer.costs[rank];
    if (p.seeds < cost) {
      toast(`Need ${cost} Sunseeds for a stronger swipe.`);
      return;
    }
    p.seeds -= cost;
    p.swipe = rank + 1;
    toast(`Swipe shines brighter (${p.swipe}/${offer.max}).`);
    renderPause();
    save();
  }

  function renderPause() {
    if (!state.player) return;
    const p = state.player;
    const ids = Object.keys(p.inventory).filter((id) => p.inventory[id] > 0 && S.items[id]);
    bagList.replaceChildren();
    if (!ids.length) {
      const empty = document.createElement("li");
      empty.textContent = "Nothing in the bag yet. Sparkles on the meadow fill it.";
      bagList.appendChild(empty);
    } else {
      for (const id of ids) {
        const item = S.items[id];
        const li = document.createElement("li");
        const swatch = document.createElement("i");
        swatch.className = "swatch";
        swatch.style.background = item.color;
        const label = document.createElement("span");
        label.textContent = `${item.name} \u00d7 ${p.inventory[id]}`;
        li.append(swatch, label);
        if (item.kind === "heal") {
          const use = document.createElement("button");
          use.type = "button";
          use.className = "bag-use";
          use.textContent = "Use";
          use.addEventListener("click", () => useItem(id));
          li.appendChild(use);
        }
        bagList.appendChild(li);
      }
    }
    const atShrine = nearShrine();
    const petal = S.shop.heartpetal;
    const swipe = S.shop.swipe;
    const rank = p.swipe || 0;
    shopNote.textContent = atShrine
      ? `Shrine light is close. Sunseeds: ${p.seeds}.`
      : "Walk onto a yellow shrine, then open pause to trade.";
    buyPetalBtn.textContent = `Heart Petal \u2014 ${petal.cost} Sunseeds`;
    buyPetalBtn.disabled = !atShrine || p.seeds < petal.cost;
    if (rank >= swipe.max) {
      buySwipeBtn.textContent = "Stronger swipe \u2014 max";
      buySwipeBtn.disabled = true;
    } else {
      buySwipeBtn.textContent = `Stronger swipe ${rank + 1}/${swipe.max} \u2014 ${swipe.costs[rank]} Sunseeds`;
      buySwipeBtn.disabled = !atShrine || p.seeds < swipe.costs[rank];
    }
  }

  function update(dt) {
    if (state.paused) return;
    state.time += dt;
    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) toastEl.classList.remove("show");
    }

    const p = state.player;
    p.invuln = Math.max(0, p.invuln - dt);
    let mx = state.stick.x + state.pad.x, my = state.stick.y + state.pad.y;
    if (state.keys.has("arrowleft") || state.keys.has("a")) mx -= 1;
    if (state.keys.has("arrowright") || state.keys.has("d")) mx += 1;
    if (state.keys.has("arrowup") || state.keys.has("w")) my -= 1;
    if (state.keys.has("arrowdown") || state.keys.has("s")) my += 1;
    const mag = Math.hypot(mx, my) || 1;
    const speed = 110;
    const nx = p.x + (mx / mag) * speed * dt;
    const ny = p.y + (my / mag) * speed * dt;
    if (Math.abs(mx) > 0.08 || Math.abs(my) > 0.08) {
      if (!blocked(nx, p.y)) p.x = nx;
      if (!blocked(p.x, ny)) p.y = ny;
      if (mx !== 0) p.facing = Math.sign(mx);
    }
    if (state.keys.has(" ") || state.keys.has("j")) attack();

    for (const e of state.entities) {
      const spec = S.enemies[e.kind];
      e.flash = Math.max(0, e.flash - dt);
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      let vx = 0, vy = 0;
      if (dist < spec.aggro) {
        vx = (dx / dist) * spec.speed;
        vy = (dy / dist) * spec.speed;
      } else {
        e.wander += dt * (0.4 + (e.id % 5) * 0.1);
        vx = Math.cos(e.wander) * spec.speed * 0.35;
        vy = Math.sin(e.wander) * spec.speed * 0.35;
      }
      const ex = e.x + vx * dt, ey = e.y + vy * dt;
      if (!blocked(ex, e.y, 8)) e.x = ex;
      if (!blocked(e.x, ey, 8)) e.y = ey;
      if (dist < 18) hurtPlayer(spec.damage);
    }

    for (const d of state.drops) {
      d.bob += dt * 4;
      const dx = p.x - d.x, dy = p.y - d.y;
      if (dx * dx + dy * dy < 18 * 18) {
        grantItem(d.itemId);
        d.gone = true;
      }
    }
    state.drops = state.drops.filter((d) => !d.gone);
    state.particles = state.particles.filter((pt) => (pt.life -= dt) > 0);

    const viewW = canvas.clientWidth, viewH = canvas.clientHeight;
    const worldPx = S.worldSize * S.tile;
    state.camera.x = Math.max(0, Math.min(worldPx - viewW, p.x - viewW / 2));
    state.camera.y = Math.max(0, Math.min(worldPx - viewH, p.y - viewH / 2));

    document.getElementById("hp-bar").style.width = `${(p.hp / p.maxHp) * 100}%`;
    document.getElementById("hp-text").textContent = `${p.hp}/${p.maxHp}`;
    const floorXp = S.levels[p.level - 1] || 0;
    const nextXp = S.levels[p.level] || floorXp + 40;
    document.getElementById("xp-bar").style.width = `${Math.min(100, ((p.xp - floorXp) / (nextXp - floorXp)) * 100)}%`;
    document.getElementById("xp-text").textContent = `Lv ${p.level}`;
    document.getElementById("coin-text").textContent = p.seeds;
    document.getElementById("loot-text").textContent = p.loot;
    document.getElementById("status").textContent = `Pip \u2022 swipe ${swipeBonus()} \u2022 ${Object.keys(p.inventory).length} finds`;
  }

  function drawTile(tx, ty, screenX, screenY) {
    const id = tileAt(tx, ty);
    ctx.fillStyle = S.palette[id];
    ctx.fillRect(screenX, screenY, S.tile, S.tile);
    if (id === S.tiles.FLOWER) {
      ctx.fillStyle = "#ff7eb6";
      ctx.fillRect(screenX + 12, screenY + 12, 8, 8);
    } else if (id === S.tiles.TREE) {
      ctx.fillStyle = "#1e4a28";
      ctx.fillRect(screenX + 12, screenY + 18, 8, 12);
      ctx.fillStyle = "#2f8a44";
      ctx.beginPath();
      ctx.arc(screenX + 16, screenY + 14, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === S.tiles.WATER) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(screenX + 4, screenY + 10 + Math.sin(state.time * 2 + tx) * 2, 12, 3);
    } else if (id === S.tiles.ROCK) {
      ctx.fillStyle = "#6d7264";
      ctx.beginPath();
      ctx.ellipse(screenX + 16, screenY + 18, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === S.tiles.SHRINE) {
      ctx.fillStyle = "#fff4c2";
      ctx.fillRect(screenX + 8, screenY + 6, 16, 20);
      ctx.fillStyle = "#7dce6a";
      ctx.fillRect(screenX + 12, screenY + 10, 8, 8);
    } else if (id === S.tiles.BUSH) {
      ctx.fillStyle = "#246b32";
      ctx.beginPath();
      ctx.arc(screenX + 16, screenY + 18, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    const viewW = canvas.clientWidth, viewH = canvas.clientHeight;
    ctx.clearRect(0, 0, viewW, viewH);
    const cam = state.camera;
    const x0 = Math.floor(cam.x / S.tile);
    const y0 = Math.floor(cam.y / S.tile);
    const x1 = x0 + Math.ceil(viewW / S.tile) + 1;
    const y1 = y0 + Math.ceil(viewH / S.tile) + 1;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        drawTile(tx, ty, tx * S.tile - cam.x, ty * S.tile - cam.y);
      }
    }
    for (const d of state.drops) {
      const item = S.items[d.itemId];
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(d.x - cam.x, d.y - cam.y + Math.sin(d.bob) * 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of state.entities) {
      ctx.fillStyle = e.flash > 0 ? "#ffffff" : S.enemies[e.kind].color;
      ctx.beginPath();
      ctx.arc(e.x - cam.x, e.y - cam.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#14301f";
      ctx.fillRect(e.x - cam.x - 10, e.y - cam.y - 16, 20, 3);
      ctx.fillStyle = "#7dce6a";
      ctx.fillRect(e.x - cam.x - 10, e.y - cam.y - 16, 20 * (e.hp / e.maxHp), 3);
    }
    const p = state.player;
    ctx.globalAlpha = p.invuln > 0 && Math.sin(state.time * 24) > 0 ? 0.45 : 1;
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(p.x - cam.x, p.y - cam.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8f4a";
    ctx.beginPath();
    ctx.arc(p.x - cam.x, p.y - cam.y - 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#14301f";
    ctx.fillRect(p.x - cam.x + p.facing * 4, p.y - cam.y - 2, 4, 3);
    ctx.globalAlpha = 1;
    if (state.attackCooldown > 0.18) {
      ctx.strokeStyle = "rgba(255,244,176,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x - cam.x + p.facing * 16, p.y - cam.y, 16 + swipeBonus() * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const pt of state.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life * 4);
      ctx.beginPath();
      ctx.arc(pt.x - cam.x, pt.y - cam.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const mm = 92;
    ctx.fillStyle = "rgba(12,28,18,0.72)";
    ctx.fillRect(viewW - mm - 10, 10, mm, mm);
    const scale = mm / (S.worldSize * S.tile);
    ctx.fillStyle = "#7dce6a";
    ctx.fillRect(p.x * scale + viewW - mm - 10, p.y * scale + 10, 3, 3);
    ctx.fillStyle = "#ff8a7a";
    for (const e of state.entities) {
      ctx.fillRect(e.x * scale + viewW - mm - 10, e.y * scale + 10, 2, 2);
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function setPaused(v) {
    state.paused = v;
    pauseMenu.classList.toggle("hidden", !v);
    if (v) {
      state.stick.x = 0;
      state.stick.y = 0;
      renderPause();
    }
  }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      player: state.player,
      entities: state.entities,
      drops: state.drops
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.player) {
        state.player = data.player;
        state.player.inventory = state.player.inventory || {};
        state.player.swipe = state.player.swipe || 0;
      }
      if (data.entities) state.entities = data.entities;
      if (data.drops) state.drops = data.drops;
      return true;
    } catch {
      return false;
    }
  }

  function newAdventure() {
    generateWorld(42);
    spawnPlayer();
    spawnEnemies(77);
    localStorage.removeItem(SAVE_KEY);
    toast("A new meadow adventure begins!");
    setPaused(false);
  }

  function bindPad() {
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const held = new Set();
    const apply = () => {
      let x = 0, y = 0;
      for (const d of held) { x += dirs[d][0]; y += dirs[d][1]; }
      state.pad.x = x;
      state.pad.y = y;
    };
    document.querySelectorAll(".dir").forEach((btn) => {
      const dir = btn.dataset.dir;
      const down = (e) => {
        if (e.cancelable) e.preventDefault();
        held.add(dir);
        btn.classList.add("held");
        apply();
      };
      const up = () => {
        held.delete(dir);
        btn.classList.remove("held");
        apply();
      };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("touchstart", down, { passive: false });
      btn.addEventListener("touchend", up);
      btn.addEventListener("touchcancel", up);
    });
  }

  function bindStick() {
    let activeId = null;
    const setFromEvent = (clientX, clientY) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = Math.max(28, rect.width / 2 - 8);
      const mag = Math.hypot(dx, dy) || 1;
      if (mag > max) {
        dx = (dx / mag) * max;
        dy = (dy / mag) * max;
      }
      const knobSize = knob.offsetWidth || 52;
      knob.style.left = `${rect.width / 2 - knobSize / 2 + dx}px`;
      knob.style.top = `${rect.height / 2 - knobSize / 2 + dy}px`;
      state.stick.x = dx / max;
      state.stick.y = dy / max;
    };
    const clear = () => {
      activeId = null;
      state.stick.x = 0;
      state.stick.y = 0;
      const knobSize = knob.offsetWidth || 52;
      knob.style.left = `${stick.clientWidth / 2 - knobSize / 2}px`;
      knob.style.top = `${stick.clientHeight / 2 - knobSize / 2}px`;
    };
    const onDown = (e) => {
      if (activeId !== null) return;
      activeId = e.pointerId;
      if (e.cancelable) e.preventDefault();
      try { stick.setPointerCapture(e.pointerId); } catch (err) {}
      setFromEvent(e.clientX, e.clientY);
    };
    const onMove = (e) => {
      if (activeId === null || e.pointerId !== activeId) return;
      if (e.cancelable) e.preventDefault();
      setFromEvent(e.clientX, e.clientY);
    };
    const onUp = (e) => {
      if (activeId === null || e.pointerId !== activeId) return;
      try { stick.releasePointerCapture(e.pointerId); } catch (err) {}
      clear();
    };
    stick.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (e) => {
    state.keys.add(e.key.toLowerCase());
    if (e.key === "Escape") setPaused(!state.paused);
  });
  window.addEventListener("keyup", (e) => state.keys.delete(e.key.toLowerCase()));
  document.getElementById("btn-attack").addEventListener("pointerdown", (e) => {
    if (e.cancelable) e.preventDefault();
    attack();
  });
  document.getElementById("btn-pause").addEventListener("click", () => setPaused(!state.paused));
  document.getElementById("btn-resume").addEventListener("click", () => setPaused(false));
  document.getElementById("btn-reset").addEventListener("click", newAdventure);
  buyPetalBtn.addEventListener("click", buyPetal);
  buySwipeBtn.addEventListener("click", buySwipe);
  window.addEventListener("beforeunload", save);
  setInterval(save, 8000);

  resize();
  generateWorld(42);
  spawnPlayer();
  spawnEnemies(77);
  load();
  bindStick();
  bindPad();
  toast("Hold an arrow to walk. Tap A to swat.");
  requestAnimationFrame(loop);
})();
