import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RoleKey } from "@/lib/level";

export type Leak = { i: number; x: number; z: number; p: number; b: 0 | 1 };

export type NetState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  /** steering input (-1..1) */
  st: number;
  /** throttle input (-1..1) */
  th: number;
  /** roles currently owned by this player */
  roles: RoleKey[];
  /** interact held */
  act: 0 | 1;
};

export type WorldPacket = {
  sp: number; // speed
  ds: number; // distance travelled
  bx: number; // lateral position in the channel
  hz: number; // engine heat 0..1
  ig: number; // hull integrity 0..100
  lk: Leak[];
  cg: number; // crates still aboard
  px: number; // passengers still aboard
  ov: 0 | 1 | 2; // 0 sailing, 1 docked (win), 2 sunk
  c: number[][]; // crate transforms
  p: number[][]; // passenger transforms
};

/** Cross-component, per-frame scratch space. Refs only — never React state. */
export const net = {
  channel: null as RealtimeChannel | null,
  isCoordinator: true,
  myIndex: 0,
  playerCount: 1,
  /** latest authoritative world packet (non-coordinators only) */
  world: null as WorldPacket | null,
  /** remote avatar positions + inputs, written by Multiplayer each frame */
  remotes: new Map<string, NetState>(),
  /** local player's live position + inputs */
  local: { x: 0, y: 1.4, z: 6, st: 0, th: 0, roles: [] as RoleKey[], act: 0 as 0 | 1 },
};

export function resetNet() {
  net.isCoordinator = true;
  net.myIndex = 0;
  net.playerCount = 1;
  net.world = null;
  net.remotes.clear();
  net.local.x = 0;
  net.local.y = 1.4;
  net.local.z = 6;
  net.local.st = 0;
  net.local.th = 0;
  net.local.roles = [];
  net.local.act = 0;
}
