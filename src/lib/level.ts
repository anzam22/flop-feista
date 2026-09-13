// Level layout for "Jelly Docks" — a short co-op physics course.
// All platforms are boxes with their TOP surface at y = 0 unless noted.

export type Platform = {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
};

export const PALETTE = {
  sky: "#bfe9ff",
  fog: "#cdeeff",
  deck: "#ffd79a",
  deckAlt: "#ffc16b",
  mid: "#a8e6a1",
  finish: "#ffb3d1",
  crate: "#f7854b",
  ball: "#ff6b8b",
  bar: "#8f7bff",
  gate: "#6fc6ff",
  plate: "#ffe66d",
  plateOn: "#7bf59a",
  players: ["#ff7a5c", "#4fc3f7", "#ffd54f", "#a78bfa", "#66e2a0", "#ff8fd0"],
};

export const PLATFORMS: Platform[] = [
  { pos: [0, -0.5, -22], size: [20, 1, 16], color: PALETTE.deck },
  { pos: [0, -0.5, -10], size: [7, 1, 10], color: PALETTE.deckAlt },
  { pos: [0, -0.5, 2], size: [26, 1, 24], color: PALETTE.mid },
  { pos: [0, -0.5, 17], size: [9, 1, 8], color: PALETTE.deckAlt },
  { pos: [0, -0.5, 27], size: [16, 1, 14], color: PALETTE.finish },
  // low side ledges on the mid arena for goofy climbing
  { pos: [-11, 0.4, 2], size: [2, 0.8, 20], color: PALETTE.deckAlt },
  { pos: [11, 0.4, 2], size: [2, 0.8, 20], color: PALETTE.deckAlt },
  // ramp-ish step up to the gate corridor
  { pos: [0, 0.1, 13.5], size: [7, 0.6, 3], color: PALETTE.deckAlt },
];

export const PLATES: [number, number, number][] = [
  [-7, 0, -3],
  [0, 0, 7],
  [7, 0, -3],
];
export const PLATE_RADIUS = 1.9;

export const CRATE_SPAWNS: [number, number, number][] = [
  [-4.5, 1.5, -20],
  [0, 1.5, -24],
  [4.5, 1.5, -20],
];
export const BALL_SPAWN: [number, number, number] = [0, 2, -2];

export const SPINNERS: { pos: [number, number, number]; speed: number; length: number }[] = [
  { pos: [0, 0.9, -12], speed: 1.1, length: 9 },
  { pos: [0, 0.9, -7], speed: -1.4, length: 9 },
  { pos: [0, 1.1, 4], speed: 0.8, length: 16 },
];

export const GATE_POS: [number, number, number] = [0, 1.6, 12];
export const FINISH: [number, number, number] = [0, 0, 28];
export const FINISH_RADIUS = 4.5;
export const VOID_Y = -14;

export function spawnPoint(index: number): [number, number, number] {
  const a = (index / 6) * Math.PI * 2;
  return [Math.cos(a) * 4, 1.2, -22 + Math.sin(a) * 3];
}
