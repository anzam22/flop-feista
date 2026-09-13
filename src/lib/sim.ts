import type { RapierRigidBody } from "@react-three/rapier";
import type { Leak } from "@/lib/net-shared";
import type { RoleKey } from "@/lib/level";

export type WorldSim = {
  sp: number;
  ds: number;
  bx: number;
  hz: number;
  ig: number;
  cg: number;
  px: number;
  ov: 0 | 1 | 2;
  lk: Leak[];
};

/** Shared, per-frame simulation scratch space (refs only — no React state). */
export const sim = {
  world: { sp: 0, ds: 0, bx: 0, hz: 0, ig: 100, cg: 4, px: 3, ov: 0, lk: [] } as WorldSim,
  roleOwner: {} as Record<RoleKey, string>,
  crates: [] as (RapierRigidBody | null)[],
  pax: [] as (RapierRigidBody | null)[],
  /** visual deck motion, read by the camera and the deck body */
  roll: 0,
  pitch: 0,
  shake: 0,
  reset() {
    sim.world = { sp: 0, ds: 0, bx: 0, hz: 0, ig: 100, cg: 4, px: 3, ov: 0, lk: [] };
    sim.roll = 0;
    sim.pitch = 0;
    sim.shake = 0;
  },
};

/** Deterministic obstacle field: rocks the pilot has to steer around. */
export function rockAt(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  const r = s - Math.floor(s);
  return { dist: 140 + i * 88, x: (r - 0.5) * 15, r: 2.4 + (r % 0.5) };
}
export const ROCK_COUNT = 18;
