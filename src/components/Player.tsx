import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { Character, type CharAnim } from "./Character";
import { useKeyboard } from "@/hooks/useKeyboard";
import { net } from "@/lib/net-shared";
import { sim } from "@/lib/sim";
import { PALETTE, STATION_RADIUS, VOID_Y, WHEEL_POS, ENGINE_POS, spawnPoint } from "@/lib/level";
import { useGameStore } from "@/store/useGameStore";
import { playerId } from "@/hooks/useGameChannel";

const SPEED = 6.2;
const camTarget = new THREE.Vector3();
const camWanted = new THREE.Vector3();

export function Player({ index }: { index: number }) {
  const rb = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null);
  const anim = useRef<CharAnim>({ speed: 0, act: false });
  const yaw = useRef(0);
  const keys = useKeyboard();
  const { world, rapier } = useRapier();
  const myRoles = useGameStore((s) => s.myRoles);
  const rolesRef = useRef(myRoles);
  rolesRef.current = myRoles;
  const nearRef = useRef("");

  const color = PALETTE.roles[index % PALETTE.roles.length] ?? "#4fc3f7";

  // mouse-drag camera orbit
  useEffect(() => {
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yaw.current -= (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
    };
    const up = () => {
      dragging = false;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const body = rb.current;
    if (!body) return;
    const k = keys.current;
    const p = body.translation();
    const v = body.linvel();

    if (k.has("ArrowLeft")) yaw.current += 1.9 * dt;
    if (k.has("ArrowRight")) yaw.current -= 1.9 * dt;

    const fwd = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const side = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const interact = k.has("KeyE");
    const stepOff = k.has("ShiftLeft") || k.has("ShiftRight");

    const isPilot = rolesRef.current.includes("pilot");
    const isEngineer = rolesRef.current.includes("engineer");
    const dWheel = Math.hypot(p.x - WHEEL_POS[0], p.z - WHEEL_POS[2]);
    const dEngine = Math.hypot(p.x - ENGINE_POS[0], p.z - ENGINE_POS[2]);
    const atWheel = isPilot && dWheel < STATION_RADIUS && !stepOff;

    let near = "";
    if (atWheel) near = "wheel";
    else if (isEngineer && dEngine < STATION_RADIUS) near = "engine";
    else {
      const leak = sim.world.lk.find((l) => Math.hypot(p.x - l.x, p.z - l.z) < 2);
      if (leak) near = leak.b ? "bigleak" : "leak";
    }
    if (near !== nearRef.current) {
      nearRef.current = near;
      useGameStore.getState().setNearStation(near);
    }

    if (atWheel) {
      // Manning the wheel: WASD drives the boat, the body stays planted.
      net.local.st = side;
      net.local.th = fwd;
      body.setLinvel(
        { x: (WHEEL_POS[0] - p.x) * 4, y: v.y, z: (WHEEL_POS[2] - 1.6 - p.z) * 4 },
        true,
      );
      if (visual.current) {
        const want = Math.atan2(0, -1);
        visual.current.rotation.y += (want - visual.current.rotation.y) * 10 * dt;
      }
      anim.current.speed = 0;
      anim.current.act = true;
    } else {
      net.local.st = 0;
      net.local.th = 0;
      const sy = Math.sin(yaw.current);
      const cy = Math.cos(yaw.current);
      let dx = side * cy - fwd * sy;
      let dz = -side * sy - fwd * cy;
      const len = Math.hypot(dx, dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
      }
      const wanted = { x: dx * SPEED, z: dz * SPEED };
      body.setLinvel(
        {
          x: v.x + (wanted.x - v.x) * Math.min(1, 9 * dt),
          y: v.y,
          z: v.z + (wanted.z - v.z) * Math.min(1, 9 * dt),
        },
        true,
      );
      anim.current.speed = Math.min(1, Math.hypot(v.x, v.z) / SPEED);
      anim.current.act = interact;
      if (visual.current && len > 0) {
        const want = Math.atan2(dx, dz);
        const diff = Math.atan2(
          Math.sin(want - visual.current.rotation.y),
          Math.cos(want - visual.current.rotation.y),
        );
        visual.current.rotation.y += diff * Math.min(1, 14 * dt);
      }
    }

    net.local.roles = rolesRef.current;
    net.local.act = interact ? 1 : 0;

    // jump (ground ray, excluding self)
    if (k.has("Space")) {
      const ray = new rapier.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(ray, 1.0, true, undefined, undefined, undefined, body);
      if (hit) body.setLinvel({ x: v.x, y: 6.4, z: v.z }, true);
    }

    // overboard → back on deck
    if (p.y < VOID_Y) {
      const s = spawnPoint(index);
      body.setTranslation({ x: s[0], y: s[1] + 1, z: s[2] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      useGameStore.getState().pushAlert("You went overboard! Fished back out.");
    }

    net.local.x = p.x;
    net.local.y = p.y;
    net.local.z = p.z;

    // third-person follow camera
    camTarget.set(p.x, p.y + 0.8, p.z);
    camWanted.set(
      p.x + Math.sin(yaw.current) * 8.5,
      p.y + 5.2 + sim.roll * 4,
      p.z + Math.cos(yaw.current) * 8.5,
    );
    camera.position.lerp(camWanted, Math.min(1, 6 * dt));
    camera.lookAt(camTarget);
  });

  const spawn = spawnPoint(index);

  return (
    <RigidBody
      ref={rb}
      colliders={false}
      position={spawn}
      enabledRotations={[false, false, false]}
      linearDamping={0.4}
      friction={1.1}
      mass={1.2}
      ccd
    >
      <CapsuleCollider args={[0.42, 0.36]} />
      <group ref={visual} position={[0, -0.2, 0]}>
        <Character color={color} anim={anim} label="me" />
      </group>
    </RigidBody>
  );
}

export { playerId };
