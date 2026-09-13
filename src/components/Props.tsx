import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BallCollider, CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CRATE_SPAWNS, PALETTE, PAX_SPAWNS } from "@/lib/level";
import { net } from "@/lib/net-shared";
import { sim } from "@/lib/sim";

/**
 * Cargo crates and wobbly passengers.
 * The room coordinator simulates them with real physics; everyone else runs
 * them as kinematic bodies driven by the coordinator's broadcast.
 */
export function Props() {
  const crates = useRef<(RapierRigidBody | null)[]>([]);
  const pax = useRef<(RapierRigidBody | null)[]>([]);
  sim.crates = crates.current;
  sim.pax = pax.current;

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    if (net.isCoordinator) {
      // passengers fidget and wander like panicking tourists
      pax.current.forEach((b, i) => {
        if (!b) return;
        const t = clock.elapsedTime + i * 2.1;
        b.applyImpulse(
          { x: Math.sin(t * 0.7) * 0.5 * dt * 60, y: 0, z: Math.cos(t * 0.53 + i) * 0.5 * dt * 60 },
          true,
        );
      });
      return;
    }

    const w = net.world;
    if (!w) return;
    const apply = (bodies: (RapierRigidBody | null)[], data: number[][]) => {
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const d = data[i];
        if (!b || !d) continue;
        const p = b.translation();
        const target = new THREE.Vector3(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0);
        const cur = new THREE.Vector3(p.x, p.y, p.z);
        const k = cur.distanceTo(target) > 4 ? 1 : Math.min(1, 10 * dt);
        cur.lerp(target, k);
        b.setNextKinematicTranslation({ x: cur.x, y: cur.y, z: cur.z });
        b.setNextKinematicRotation({ x: d[3] ?? 0, y: d[4] ?? 0, z: d[5] ?? 0, w: d[6] ?? 1 });
      }
    };
    apply(crates.current, w.c);
    apply(pax.current, w.p);
  });

  const type = net.isCoordinator ? "dynamic" : "kinematicPosition";

  return (
    <group>
      {CRATE_SPAWNS.map((p, i) => (
        <RigidBody
          key={`crate${i}`}
          ref={(b) => {
            crates.current[i] = b;
          }}
          type={type}
          position={p}
          colliders={false}
          friction={0.7}
          mass={2.2}
          linearDamping={0.25}
          angularDamping={0.4}
        >
          <CuboidCollider args={[0.55, 0.55, 0.55]} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.1, 1.1, 1.1]} />
            <meshStandardMaterial color={PALETTE.crate} roughness={0.75} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[1.16, 0.18, 1.16]} />
            <meshStandardMaterial color="#c96a22" roughness={0.7} />
          </mesh>
        </RigidBody>
      ))}

      {PAX_SPAWNS.map((p, i) => (
        <RigidBody
          key={`pax${i}`}
          ref={(b) => {
            pax.current[i] = b;
          }}
          type={type}
          position={p}
          colliders={false}
          friction={0.4}
          mass={1}
          linearDamping={0.6}
          angularDamping={0.8}
        >
          <BallCollider args={[0.52]} />
          <mesh castShadow>
            <sphereGeometry args={[0.52, 20, 16]} />
            <meshStandardMaterial
              color={PALETTE.pax[i % PALETTE.pax.length] ?? "#ff8fb1"}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[-0.18, 0.12, 0.44]}>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.18, 0.12, 0.44]}>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.18, 0.12, 0.53]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#222b3a" />
          </mesh>
          <mesh position={[0.18, 0.12, 0.53]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#222b3a" />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}
