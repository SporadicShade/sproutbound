/* Sproutbound data catalog — keep tables here so gameplay code stays lean. */
window.SPROUT = {
  version: "0.1.0",
  worldSize: 56,
  tile: 32,
  tiles: {
    GRASS: 0, TALL: 1, FLOWER: 2, TREE: 3, WATER: 4,
    PATH: 5, ROCK: 6, BUSH: 7, SAND: 8, SHRINE: 9
  },
  solid: new Set([3, 4, 6]),
  palette: {
    0: "#5dba62",
    1: "#3f9348",
    2: "#5dba62",
    3: "#2f6a38",
    4: "#3aa0d0",
    5: "#c9b37a",
    6: "#8a8f7a",
    7: "#2f7a3a",
    8: "#e2c98a",
    9: "#f0d27a"
  },
  enemies: {
    pebblebug: {
      name: "Pebblebug",
      color: "#c07a4a",
      hp: 4,
      speed: 48,
      damage: 1,
      xp: 4,
      aggro: 110,
      loot: ["seed", "pebble", "seed"]
    },
    puffmoth: {
      name: "Puffmoth",
      color: "#e8d6ff",
      hp: 3,
      speed: 72,
      damage: 1,
      xp: 6,
      aggro: 150,
      loot: ["seed", "silkfluff"]
    },
    shadowseed: {
      name: "Shadowseed",
      color: "#4b3b6a",
      hp: 8,
      speed: 40,
      damage: 2,
      xp: 10,
      aggro: 90,
      loot: ["seed", "gloomkernel", "heartpetal"]
    }
  },
  items: {
    seed: { name: "Sunseed", kind: "currency", value: 1, color: "#ffd56a" },
    pebble: { name: "Smooth Pebble", kind: "loot", value: 2, color: "#cfc7b0" },
    silkfluff: { name: "Silkfluff", kind: "loot", value: 4, color: "#f4e9ff" },
    gloomkernel: { name: "Gloom Kernel", kind: "loot", value: 6, color: "#6b5b95" },
    heartpetal: { name: "Heart Petal", kind: "heal", value: 3, color: "#ff8a7a" },
    sproutcap: { name: "Sprout Cap", kind: "gear", value: 8, color: "#7dce6a" }
  },
  levels: [0, 12, 28, 50, 80, 120, 170, 230]
};
