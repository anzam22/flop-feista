import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { Character, type CharAnim } from "./Character";
import { playerId, useGameChannel } from "@/hooks/useGameChannel";
import { net, type NetState } from "@/lib/net-shared";
import { sim } from "@/lib/sim";
import { PALETTE, ROLES, type RoleKey } from "@/lib/level";
import { useGameStore } from "@/store/useGameStore";

const NET_TICK = 1 / 6;

/** Assign the four jobs across however many people are in the room. */
function assignRoles(ids: string[]) {
  const owner = {} as Record<RoleKey, string>;
  ROLES.forEach((role, i) => {
    const id = ids[i % Math.max(1, ids.length)];
    if (id) owner[role.key] = id;
  });
  return owner;
}

export function Multiplayer({ name }: { name: string }) {
  const room = useGameStore((s) => s.room);
  const myRoles = useGameStore((s) => s.myRoles);
  const [ids, setIds] = useState<string[]>([]);
  const roster = useRef(new Set<string>());
  const states = useRef(new Map<string, NetState>());
  const bodies = useRef(new Map<string, RapierRigidBody>());
  const visuals = useRef(new Map<string, THREE.Group>());
  const anims = useRef(new Map<string, { current: CharAnim }>());
  const colors = useRef(new Map<string, string>());
  const acc = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, at: -1 });

  const channelRef = useGameChannel(room, name, {
    onRoster: (list) => {
      const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
      const allIds = sorted.map((p) => p.id);
      const owner = assignRoles(allIds);
      sim.roleOwner = owner;
      const wasCoordinator = net.isCoordinator;
      const nextCoordinator = allIds[0] === playerId || allIds.length === 0;
      if (!wasCoordinator && nextCoordinator && net.world) {
        const snapshot = net.world;
        sim.world = {
          ...sim.world,
          sp: snapshot.sp,
          ds: snapshot.ds,
          bx: snapshot.bx,
          hz: snapshot.hz,
          ig: snapshot.ig,
          cg: snapshot.cg,
          px: snapshot.px,
          ov: snapshot.ov,
          lk: snapshot.lk.map((leak) => ({ ...leak })),
        };
        if (snapshot.ov === 1) useGameStore.getState().finish(true);
        if (snapshot.ov === 2) useGameStore.getState().finish(false);
      }
      net.isCoordinator = nextCoordinator;
      net.myIndex = Math.max(0, allIds.indexOf(playerId));
      net.playerCount = Math.max(1, allIds.length);

      sorted.forEach((p, i) =>
        colors.current.set(p.id, PALETTE.roles[i % PALETTE.roles.length] ?? "#4fc3f7"),
      );

      useGameStore.getState().setRoster(
        sorted.map((p) => ({
          id: p.id,
          name: p.name,
          roles: ROLES.filter((r) => owner[r.key] === p.id).map((r) => r.key),
        })),
        ROLES.filter((r) => owner[r.key] === playerId).map((r) => r.key),
      );

      roster.current = new Set(allIds);
      roster.current.delete(playerId);
      for (const id of [...states.current.keys()]) {
        if (!roster.current.has(id)) {
          states.current.delete(id);
          net.remotes.delete(id);
        }
      }
      setIds([...roster.current]);
    },
    onConnection: (status, message) => {
      useGameStore.getState().setConnection(status, message);
    },
    onState: (s) => {
      if (roster.current.has(s.id)) {
        states.current.set(s.id, s);
        net.remotes.set(s.id, s);
      }
    },
  });

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = 1 - Math.exp(-12 * delta);

    for (const [id, s] of states.current) {
      const body = bodies.current.get(id);
      const vis = visuals.current.get(id);
      if (body) {
        const p = body.translation();
        const cur = new THREE.Vector3(p.x, p.y, p.z);
        const target = new THREE.Vector3(s.x, s.y, s.z);
        if (cur.distanceTo(target) > 5) cur.copy(target);
        else cur.lerp(target, t);
        body.setNextKinematicTranslation({ x: cur.x, y: cur.y, z: cur.z });
      }
      if (vis) {
        const dy = s.ry - vis.rotation.y;
        vis.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t;
      }
      const a = anims.current.get(id);
      if (a) {
        a.current.act = s.act === 1;
        a.current.speed = 0.6;
      }
    }

    // send our own state
    acc.current += delta;
    if (acc.current < NET_TICK) return;
    acc.current = 0;
    const channel = channelRef.current;
    if (!channel || document.hidden) return;

    const r = (n: number) => Math.round(n * 100) / 100;
    const x = r(net.local.x);
    const y = r(net.local.y);
    const z = r(net.local.z);
    const ry = 0;
    const l = last.current;
    const moved = Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) > 0.01;
    const stale = clock.elapsedTime - l.at > 1;
    if (!moved && !stale && net.local.act === 0) return;
    last.current = { x, y, z, ry, at: clock.elapsedTime };

    channel.send({
      type: "broadcast",
      event: "state",
      payload: {
        id: playerId,
        name,
        x,
        y,
        z,
        ry,
        st: net.local.st,
        th: net.local.th,
        roles: myRoles,
        act: net.local.act,
      } satisfies NetState,
    });
  });

  return (
    <>
      {ids.map((id) => {
        if (!anims.current.has(id)) anims.current.set(id, { current: { speed: 0, act: false } });
        const anim = anims.current.get(id)!;
        return (
          <RigidBody
            key={id}
            type="kinematicPosition"
            colliders={false}
            position={[0, 1.4, 0]}
            friction={1}
            ref={(b) => {
              if (b) bodies.current.set(id, b);
              else bodies.current.delete(id);
            }}
          >
            <CapsuleCollider args={[0.42, 0.36]} />
            <group
              position={[0, -0.2, 0]}
              ref={(g) => {
                if (g) visuals.current.set(id, g);
                else visuals.current.delete(id);
              }}
            >
              <Character color={colors.current.get(id) ?? "#ffb74d"} anim={anim} />
            </group>
          </RigidBody>
        );
      })}
    </>
  );
}
