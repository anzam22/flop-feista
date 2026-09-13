import { create } from "zustand";

export type Roster = { id: string; name: string; color: string }[];

type GameState = {
  phase: "menu" | "playing" | "won";
  name: string;
  room: string;
  roster: Roster;
  platesOn: number;
  gateOpen: boolean;
  time: number;
  falls: number;
  hint: string;
  setName: (n: string) => void;
  setRoom: (r: string) => void;
  start: () => void;
  setRoster: (r: Roster) => void;
  setPlates: (n: number, open: boolean) => void;
  setTime: (t: number) => void;
  addFall: () => void;
  setHint: (h: string) => void;
  win: () => void;
  replay: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  phase: "menu",
  name: "",
  room: "",
  roster: [],
  platesOn: 0,
  gateOpen: false,
  time: 0,
  falls: 0,
  hint: "",
  setName: (name) => set({ name }),
  setRoom: (room) => set({ room }),
  start: () => set({ phase: "playing", time: 0, falls: 0 }),
  setRoster: (roster) => set({ roster }),
  setPlates: (platesOn, gateOpen) => set({ platesOn, gateOpen }),
  setTime: (time) => set({ time }),
  addFall: () => set((s) => ({ falls: s.falls + 1 })),
  setHint: (hint) => set({ hint }),
  win: () => set((s) => (s.phase === "playing" ? { phase: "won" } : {})),
  replay: () => set({ phase: "playing", time: 0, falls: 0, platesOn: 0, gateOpen: false }),
}));
