// "Wobble Ferry" — a rocking ferry deck. The boat stays at the world origin and
// the sea/obstacles scroll past, so all deck coordinates below are fixed.

export const PALETTE = {
  sky: "#bfe7ff",
  fog: "#cfeaf6",
  sea: "#2f8ec9",
  deck: "#f0c48a",
  deckTrim: "#e2703a",
  hull: "#ef5f4c",
  cabin: "#fff3df",
  metal: "#9fb4c7",
  crate: "#f2a03d",
  pax: ["#ff8fb1", "#8fd6ff", "#ffe07a", "#b79bff"],
  leak: "#3fd2ff",
  zoneCargo: "#ffd98a",
  zonePax: "#ffb6d5",
  roles: ["#4fc3f7", "#ffb74d", "#81c784", "#ff8a9c"],
};

export const DECK = { w: 14, l: 26, y: 0 };

export const WHEEL_POS: [number, number, number] = [0, 0, 10.2];
export const ENGINE_POS: [number, number, number] = [0, 0, -10.2];
export const CARGO_ZONE = { x: -4.2, z: 0, w: 4.6, l: 7 };
export const PAX_ZONE = { x: 4.2, z: 0, w: 4.6, l: 7 };
export const STATION_RADIUS = 2.6;

export const CRATE_SPAWNS: [number, number, number][] = [
  [-5, 1.2, -2],
  [-3.4, 1.2, 0.4],
  [-5, 1.2, 2.4],
  [-3.4, 1.2, -3.6],
];

export const PAX_SPAWNS: [number, number, number][] = [
  [4.6, 1.2, -2],
  [3.2, 1.2, 0.6],
  [4.6, 1.2, 2.6],
];

export const ROLES = [
  {
    key: "pilot",
    name: "Pilot",
    station: "Wheel (bow)",
    duty: "Steer around rocks, set the throttle. Crashes tear holes in the hull.",
  },
  {
    key: "engineer",
    name: "Engineer",
    station: "Engine (stern)",
    duty: "Hold E at the engine to cool it. Overheat = power loss and fire.",
  },
  {
    key: "deckhand",
    name: "Deckhand",
    station: "Anywhere wet",
    duty: "Hold E on leaks to patch them. Big leaks need two people at once.",
  },
  {
    key: "crew",
    name: "Crew",
    station: "Cargo + passengers",
    duty: "Shove crates and passengers back into their pens before they slide off.",
  },
] as const;

export type RoleKey = (typeof ROLES)[number]["key"];

export const TOTAL_DISTANCE = 1600;
export const VOID_Y = -4;

const SPAWN_LANES = [-2.2, 2.2, -2.2, 2.2, 0, 0];
const SPAWN_ROWS = [6.5, 6.5, -6.5, -6.5, 4, -4];

export function spawnPoint(index: number): [number, number, number] {
  const i = ((index % 6) + 6) % 6;
  return [SPAWN_LANES[i] ?? 0, 1.4, SPAWN_ROWS[i] ?? 0];
}
