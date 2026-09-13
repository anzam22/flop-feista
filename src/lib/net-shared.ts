import type { RealtimeChannel } from "@supabase/supabase-js";

export type NetState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  g: number; // index of prop being grabbed, -1 = none
};

export type PropsPacket = { p: number[][] };

/**
 * Cross-component network scratch space. Refs only — never React state, so the
 * per-frame game loop can read it without re-rendering.
 */
export const net = {
  channel: null as RealtimeChannel | null,
  isCoordinator: true,
  /** latest authoritative prop transforms from the coordinator */
  propStates: null as number[][] | null,
  /** remote avatar positions + grab intent, written by Multiplayer each frame */
  remotes: new Map<string, { x: number; y: number; z: number; g: number }>(),
  /** local player's live position + grab intent */
  local: { x: 0, y: 1, z: -22, g: -1 },
};
