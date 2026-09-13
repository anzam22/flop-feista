import { create } from "zustand";
import type { RoleKey } from "@/lib/level";

export type RosterEntry = { id: string; name: string; roles: RoleKey[] };

type GameState = {
  phase: "menu" | "playing" | "docked" | "sunk";
  name: string;
  room: string;
  roster: RosterEntry[];
  myRoles: RoleKey[];
  integrity: number;
  heat: number;
  progress: number; // 0..1
  speed: number;
  leaks: number;
  crates: number;
  pax: number;
  alert: string;
  alertAt: number;
  nearStation: string;
  setName: (n: string) => void;
  setRoom: (r: string) => void;
  start: () => void;
  setRoster: (r: RosterEntry[], myRoles: RoleKey[]) => void;
  setMeters: (m: Partial<Pick<GameState, "integrity" | "heat" | "progress" | "speed" | "leaks" | "crates" | "pax">>) => void;
  setNearStation: (s: string) => void;
  pushAlert: (a: string) => void;
  finish: (won: boolean) => void;
  backToMenu: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  phase: "menu",
  name: "",
  room: "",
  roster: [],
  myRoles: [],
  integrity: 100,
  heat: 0,
  progress: 0,
  speed: 0,
  leaks: 0,
  crates: 4,
  pax: 3,
  alert: "",
  alertAt: 0,
  nearStation: "",
  setName: (name) => set({ name }),
  setRoom: (room) => set({ room }),
  start: () => set({ phase: "playing", integrity: 100, heat: 0, progress: 0 }),
  setRoster: (roster, myRoles) => set({ roster, myRoles }),
  setMeters: (m) => set(m),
  setNearStation: (nearStation) => set({ nearStation }),
  pushAlert: (alert) => set({ alert, alertAt: Date.now() }),
  finish: (won) => set({ phase: won ? "docked" : "sunk" }),
  backToMenu: () => set({ phase: "menu" }),
}));
