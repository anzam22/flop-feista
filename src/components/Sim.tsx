import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { net } from "@/lib/net-shared";
import { ROCK_COUNT, rockAt, sim } from "@/lib/sim";
import { playerId } from "@/hooks/useGameChannel";
import { useGameStore } from "@/store/useGameStore";
import {
  DECK,
  ENGINE_POS,
  STATION_RADIUS,
  TOTAL_DISTANCE,
  WHEEL_POS,
  type RoleKey,
} from "@/lib/level";

const MAX_SPEED = 16;
const NET_TICK = 1 / 6;
const LOST_Y = -4;

function inputFor(role: RoleKey) {
  const id = sim.roleOwner[role];
  if (!id) return null;
  if (id === playerId) return net.local;
  return net.remotes.get(id) ?? null;
}

function everyone() {
  return [net.local, ...net.remotes.values()];
}

export function Sim() {
  const acc = useRef(0);
  const hudAcc = useRef(0);
  const nextLeak = useRef(14);
  const nextRock = useRef(0);
  const leakId = useRef(1);
  const lostCrates = useRef(new Set<number>());
  const lostPax = useRef(new Set<number>());

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const w = sim.world;
    const store = useGameStore.getState();

    if (net.isCoordinator) {
      if (w.ov === 0) {
        // ---- pilot: throttle + steering, only while manning the wheel ----
        const pilot = inputFor("pilot");
        const pilotAtWheel =
          !!pilot &&
          Math.hypot(pilot.x - WHEEL_POS[0], pilot.z - WHEEL_POS[2]) < STATION_RADIUS + 0.6;
        const th = pilotAtWheel ? (pilot?.th ?? 0) : 0;
        const st = pilotAtWheel ? (pilot?.st ?? 0) : 0;

        // ---- engineer: cooling the engine ----
        const eng = inputFor("engineer");
        const engAtPost =
          !!eng &&
          eng.act === 1 &&
          Math.hypot(eng.x - ENGINE_POS[0], eng.z - ENGINE_POS[2]) < STATION_RADIUS + 0.6;
        w.hz = Math.max(
          0,
          Math.min(1, w.hz + (0.055 * Math.max(th, 0) - (engAtPost ? 0.32 : 0) - 0.012) * dt),
        );
        const power = w.hz > 0.85 ? 0.3 : 1;
        if (w.hz > 0.92) w.ig -= 3.2 * dt;

        w.sp += (th * MAX_SPEED * power - w.sp) * 1.1 * dt;
        w.sp = Math.max(0, w.sp);
        w.ds += w.sp * dt;
        w.bx = Math.max(-10, Math.min(10, w.bx + st * 7 * dt * Math.min(1, 0.25 + w.sp / 10)));

        // ---- rocks ----
        for (let i = nextRock.current; i < ROCK_COUNT; i++) {
          const r = rockAt(i);
          if (w.ds > r.dist) {
            nextRock.current = i + 1;
            if (Math.abs(w.bx - r.x) < r.r + 3) {
              w.ig -= 14;
              sim.shake = 1;
              spawnLeak(true);
              store.pushAlert("CRUNCH! We clipped a rock — hull breached!");
            }
          }
        }

        // ---- leaks drain the hull; patching needs bodies on the hole ----
        nextLeak.current -= dt;
        if (nextLeak.current <= 0) {
          nextLeak.current = 16 + Math.random() * 12;
          spawnLeak(Math.random() < 0.35);
        }
        const crowd = everyone();
        for (let i = w.lk.length - 1; i >= 0; i--) {
          const leak = w.lk[i]!;
          const patchers = crowd.filter(
            (p) =>
              p.act === 1 &&
              (p.roles?.includes("deckhand") || p.roles?.includes("crew")) &&
              Math.hypot(p.x - leak.x, p.z - leak.z) < 2,
          ).length;
          const need = leak.b ? 2 : 1;
          if (patchers >= need) leak.p += (patchers / need) * 0.45 * dt;
          else leak.p = Math.max(0, leak.p - 0.1 * dt);
          w.ig -= (leak.b ? 2.6 : 1.3) * dt;
          if (leak.p >= 1) {
            w.lk.splice(i, 1);
            store.pushAlert("Leak patched. Nice hands.");
          }
        }

        // ---- cargo + passengers going overboard ----
        sim.crates.forEach((b, i) => {
          if (!b || lostCrates.current.has(i)) return;
          if (b.translation().y < LOST_Y) {
            lostCrates.current.add(i);
            w.cg = Math.max(0, w.cg - 1);
            w.ig -= 4;
            b.setTranslation({ x: 0, y: -80, z: 0 }, true);
            store.pushAlert("A crate went over the side!");
          }
        });
        sim.pax.forEach((b, i) => {
          if (!b || lostPax.current.has(i)) return;
          if (b.translation().y < LOST_Y) {
            lostPax.current.add(i);
            w.px = Math.max(0, w.px - 1);
            w.ig -= 8;
            b.setTranslation({ x: 0, y: -80, z: 0 }, true);
            store.pushAlert("Passenger overboard! That is coming out of the tips.");
          }
        });

        if (w.ig <= 0) {
          w.ig = 0;
          w.ov = 2;
          store.finish(false);
        } else if (w.ds >= TOTAL_DISTANCE) {
          w.ov = 1;
          store.finish(true);
        }
        w.ig = Math.min(100, w.ig);
      }

      // ---- broadcast the authoritative world ----
      acc.current += dt;
      if (acc.current >= NET_TICK) {
        acc.current = 0;
        const channel = net.channel;
        if (channel && !document.hidden && net.remotes.size > 0) {
          const pack = (bodies: typeof sim.crates) =>
            bodies.map((b) => {
              if (!b) return [0, -80, 0, 0, 0, 0, 1];
              const t = b.translation();
              const r = b.rotation();
              return [t.x, t.y, t.z, r.x, r.y, r.z, r.w].map((n) => Math.round(n * 100) / 100);
            });
          channel.send({
            type: "broadcast",
            event: "world",
            payload: {
              sp: Math.round(w.sp * 10) / 10,
              ds: Math.round(w.ds * 10) / 10,
              bx: Math.round(w.bx * 100) / 100,
              hz: Math.round(w.hz * 100) / 100,
              ig: Math.round(w.ig),
              lk: w.lk,
              cg: w.cg,
              px: w.px,
              ov: w.ov,
              c: pack(sim.crates),
              p: pack(sim.pax),
            },
          });
        }
      }
    } else {
      // ---- follower: apply the coordinator's world, dead-reckon between ticks ----
      const remote = net.world;
      if (remote) {
        w.sp += (remote.sp - w.sp) * Math.min(1, 6 * dt);
        w.bx += (remote.bx - w.bx) * Math.min(1, 6 * dt);
        w.hz = remote.hz;
        w.ig = remote.ig;
        w.cg = remote.cg;
        w.px = remote.px;
        w.lk = remote.lk;
        if (Math.abs(remote.ds - w.ds) > 6) w.ds = remote.ds;
        if (remote.ov !== w.ov) {
          w.ov = remote.ov;
          if (remote.ov === 1) store.finish(true);
          if (remote.ov === 2) store.finish(false);
        }
      }
      if (w.ov === 0) w.ds += w.sp * dt;
    }

    // ---- HUD meters, a few times a second ----
    hudAcc.current += dt;
    if (hudAcc.current > 0.2) {
      hudAcc.current = 0;
      store.setMeters({
        integrity: Math.round(w.ig),
        heat: w.hz,
        progress: Math.min(1, w.ds / TOTAL_DISTANCE),
        speed: w.sp,
        leaks: w.lk.length,
        crates: w.cg,
        pax: w.px,
      });
    }
  });

  function spawnLeak(big: boolean) {
    const w = sim.world;
    if (w.lk.length >= 5) return;
    w.lk.push({
      i: leakId.current++,
      x: Math.round((Math.random() - 0.5) * (DECK.w - 4) * 100) / 100,
      z: Math.round((Math.random() - 0.5) * (DECK.l - 8) * 100) / 100,
      p: 0,
      b: big ? 1 : 0,
    });
    useGameStore
      .getState()
      .pushAlert(big ? "BIG leak amidships — two people on it!" : "Leak sprung on deck!");
  }

  return null;
}
