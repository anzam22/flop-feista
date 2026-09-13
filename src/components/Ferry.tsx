import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  CARGO_ZONE,
  DECK,
  ENGINE_POS,
  PALETTE,
  PAX_ZONE,
  TOTAL_DISTANCE,
  WHEEL_POS,
} from "@/lib/level";
import { ROCK_COUNT, rockAt, sim } from "@/lib/sim";

const q = new THREE.Quaternion();
const e = new THREE.Euler();

function seaTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2f8ec9";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.30)" : "rgba(120,205,240,0.45)";
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    const y = Math.random() * 256;
    const x = Math.random() * 256;
    ctx.ellipse(x, y, 14 + Math.random() * 22, 3 + Math.random() * 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function deckTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = PALETTE.deck;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 ? "rgba(180,120,60,0.18)" : "rgba(255,240,210,0.35)";
    ctx.fillRect(0, i * 16, 256, 8);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Ferry() {
  const deckBody = useRef<RapierRigidBody>(null);
  const boat = useRef<THREE.Group>(null);
  const engineGlow = useRef<THREE.MeshStandardMaterial>(null);
  const rocks = useRef<THREE.Group>(null);
  const dock = useRef<THREE.Group>(null);
  const leakRefs = useRef<(THREE.Group | null)[]>([]);
  const sea = useMemo(() => seaTexture(), []);
  const deckTex = useMemo(() => deckTexture(), []);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;
    const w = sim.world;

    // Rocking gets worse with speed, damage and impacts.
    sim.shake = Math.max(0, sim.shake - dt * 1.6);
    const rough = 0.035 + w.sp * 0.004 + (100 - w.ig) * 0.0006;
    sim.roll =
      Math.sin(t * 0.82) * rough +
      Math.sin(t * 0.37 + 1.7) * rough * 0.7 +
      sim.shake * Math.sin(t * 26) * 0.09;
    sim.pitch = Math.sin(t * 0.61) * rough * 0.8 + sim.shake * Math.sin(t * 21) * 0.06;

    e.set(sim.pitch, 0, sim.roll);
    q.setFromEuler(e);
    deckBody.current?.setNextKinematicRotation(q);
    if (boat.current) boat.current.quaternion.copy(q);

    // sea scroll + parallax
    sea.offset.y = -w.ds * 0.01;
    sea.offset.x = w.bx * 0.01;

    if (engineGlow.current) {
      engineGlow.current.emissiveIntensity = 0.15 + w.hz * 2.4 + (w.hz > 0.85 ? Math.sin(t * 14) * 0.5 : 0);
    }

    // rocks scroll toward the boat
    if (rocks.current) {
      rocks.current.children.forEach((child, i) => {
        const r = rockAt(i);
        const z = r.dist - w.ds;
        child.visible = z > -40 && z < 260;
        child.position.set(r.x - w.bx, -1.6 + Math.sin(t * 1.3 + i) * 0.25, z);
      });
    }
    if (dock.current) {
      const z = TOTAL_DISTANCE - w.ds;
      dock.current.visible = z < 260;
      dock.current.position.set(-w.bx, 0, z);
    }

    // leak spouts
    for (let i = 0; i < leakRefs.current.length; i++) {
      const g = leakRefs.current[i];
      if (!g) continue;
      const leak = w.lk[i];
      g.visible = !!leak;
      if (leak) {
        g.position.set(leak.x, 0.05, leak.z);
        const s = (leak.b ? 1.5 : 1) * (1 + Math.sin(t * 9 + i) * 0.12);
        g.scale.set(s, s * (0.7 + leak.p * 0.6), s);
      }
    }
  });

  return (
    <group>
      {/* sea */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial map={sea} color="#ffffff" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* rocks + buoys scrolling past */}
      <group ref={rocks}>
        {Array.from({ length: ROCK_COUNT }).map((_, i) => (
          <group key={i}>
            <mesh castShadow position={[0, 1.4, 0]}>
              <coneGeometry args={[2.3, 4.4, 6]} />
              <meshStandardMaterial color="#7d8ba0" roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, 1.4, 0]} scale={[1.25, 0.12, 1.25]}>
              <sphereGeometry args={[2.2, 14, 10]} />
              <meshStandardMaterial color="#eaf7ff" transparent opacity={0.75} />
            </mesh>
          </group>
        ))}
      </group>

      {/* the dock at the end of the run */}
      <group ref={dock} visible={false}>
        <mesh position={[0, -1, 0]} receiveShadow>
          <boxGeometry args={[40, 2, 14]} />
          <meshStandardMaterial color="#ffd9a0" roughness={0.8} />
        </mesh>
        <mesh position={[-10, 3, 2]} castShadow>
          <boxGeometry args={[8, 8, 8]} />
          <meshStandardMaterial color="#fff3df" roughness={0.7} />
        </mesh>
        <mesh position={[10, 4, 2]} castShadow>
          <cylinderGeometry args={[2.4, 2.8, 10, 12]} />
          <meshStandardMaterial color="#ff8f6b" roughness={0.7} />
        </mesh>
      </group>

      {/* ===== the ferry ===== */}
      <group ref={boat}>
        {/* hull + superstructure (visual) */}
        <mesh position={[0, -1.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[DECK.w + 0.8, 2.6, DECK.l]} />
          <meshStandardMaterial color={PALETTE.hull} roughness={0.6} />
        </mesh>
        <mesh position={[0, -1.9, DECK.l / 2]} rotation-y={Math.PI / 4} castShadow>
          <boxGeometry args={[10.4, 2.6, 10.4]} />
          <meshStandardMaterial color={PALETTE.hull} roughness={0.6} />
        </mesh>
        <mesh position={[0, -3.3, 0]}>
          <boxGeometry args={[DECK.w + 0.4, 0.4, DECK.l - 1]} />
          <meshStandardMaterial color="#2f3b4d" roughness={0.8} />
        </mesh>

        {/* deck surface */}
        <mesh position={[0, -0.3, 0]} receiveShadow>
          <boxGeometry args={[DECK.w, 0.6, DECK.l]} />
          <meshStandardMaterial map={deckTex} roughness={0.85} />
        </mesh>

        {/* zone paint */}
        <mesh position={[CARGO_ZONE.x, 0.02, CARGO_ZONE.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[CARGO_ZONE.w, CARGO_ZONE.l]} />
          <meshStandardMaterial color={PALETTE.zoneCargo} roughness={0.9} />
        </mesh>
        <mesh position={[PAX_ZONE.x, 0.02, PAX_ZONE.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[PAX_ZONE.w, PAX_ZONE.l]} />
          <meshStandardMaterial color={PALETTE.zonePax} roughness={0.9} />
        </mesh>

        {/* wheel house */}
        <group position={WHEEL_POS}>
          <mesh position={[0, 1.3, 1.2]} castShadow>
            <boxGeometry args={[5.4, 2.6, 2.6]} />
            <meshStandardMaterial color={PALETTE.cabin} roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.75, 1.2]} castShadow>
            <boxGeometry args={[6, 0.3, 3.2]} />
            <meshStandardMaterial color={PALETTE.deckTrim} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.75, -0.1]} castShadow>
            <boxGeometry args={[2.2, 1.5, 0.6]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.5, -0.35]} rotation-x={Math.PI / 2.4} castShadow>
            <torusGeometry args={[0.5, 0.09, 10, 20]} />
            <meshStandardMaterial color={PALETTE.deckTrim} roughness={0.5} />
          </mesh>
        </group>

        {/* engine block */}
        <group position={ENGINE_POS}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[4.4, 1.8, 2.6]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.95, 0]} castShadow>
            <boxGeometry args={[3.2, 0.4, 2]} />
            <meshStandardMaterial
              ref={engineGlow}
              color="#ffb36b"
              emissive="#ff5b2e"
              emissiveIntensity={0.2}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[-1.4, 2.6, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.42, 1.6, 12]} />
            <meshStandardMaterial color={PALETTE.deckTrim} roughness={0.6} />
          </mesh>
          <mesh position={[1.4, 2.6, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.42, 1.6, 12]} />
            <meshStandardMaterial color={PALETTE.deckTrim} roughness={0.6} />
          </mesh>
        </group>

        {/* leaks */}
        {Array.from({ length: 5 }).map((_, i) => (
          <group
            key={i}
            visible={false}
            ref={(g) => {
              leakRefs.current[i] = g;
            }}
          >
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.9, 20]} />
              <meshStandardMaterial color="#2a3b52" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <coneGeometry args={[0.45, 1.6, 12, 1, true]} />
              <meshStandardMaterial
                color={PALETTE.leak}
                transparent
                opacity={0.75}
                emissive={PALETTE.leak}
                emissiveIntensity={0.35}
              />
            </mesh>
          </group>
        ))}

        {/* railing posts (decorative) */}
        {Array.from({ length: 22 }).map((_, i) => {
          const side = i % 2 ? 1 : -1;
          const z = -DECK.l / 2 + 0.8 + Math.floor(i / 2) * 2.3;
          return (
            <mesh key={`r${i}`} position={[side * (DECK.w / 2 - 0.2), 0.55, z]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 1.1, 8]} />
              <meshStandardMaterial color={PALETTE.cabin} roughness={0.6} />
            </mesh>
          );
        })}
      </group>

      {/* ===== physics body for the deck (kinematic, rocks with the boat) ===== */}
      <RigidBody ref={deckBody} type="kinematicPosition" colliders={false} friction={1.4}>
        <CuboidCollider args={[DECK.w / 2, 0.3, DECK.l / 2]} position={[0, -0.3, 0]} />
        {/* bow + stern walls */}
        <CuboidCollider args={[DECK.w / 2, 0.6, 0.25]} position={[0, 0.6, DECK.l / 2]} />
        <CuboidCollider args={[DECK.w / 2, 0.6, 0.25]} position={[0, 0.6, -DECK.l / 2]} />
        {/* side rails with a gap amidships so things can tumble overboard */}
        {[-1, 1].map((s) =>
          [-1, 1].map((h) => (
            <CuboidCollider
              key={`${s}${h}`}
              args={[0.25, 0.55, 4]}
              position={[s * (DECK.w / 2), 0.55, h * 9]}
            />
          )),
        )}
        {/* wheel house + engine block colliders */}
        <CuboidCollider args={[2.7, 1.3, 1.3]} position={[WHEEL_POS[0], 1.3, WHEEL_POS[2] + 1.2]} />
        <CuboidCollider args={[2.2, 0.9, 1.3]} position={[ENGINE_POS[0], 0.9, ENGINE_POS[2]]} />
        {/* cargo pen kerbs (open toward the deck centre) */}
        <CuboidCollider args={[CARGO_ZONE.w / 2, 0.3, 0.15]} position={[CARGO_ZONE.x, 0.3, CARGO_ZONE.z + CARGO_ZONE.l / 2]} />
        <CuboidCollider args={[CARGO_ZONE.w / 2, 0.3, 0.15]} position={[CARGO_ZONE.x, 0.3, CARGO_ZONE.z - CARGO_ZONE.l / 2]} />
        <CuboidCollider args={[0.15, 0.3, CARGO_ZONE.l / 2]} position={[CARGO_ZONE.x - CARGO_ZONE.w / 2, 0.3, CARGO_ZONE.z]} />
        {/* passenger pen kerbs */}
        <CuboidCollider args={[PAX_ZONE.w / 2, 0.3, 0.15]} position={[PAX_ZONE.x, 0.3, PAX_ZONE.z + PAX_ZONE.l / 2]} />
        <CuboidCollider args={[PAX_ZONE.w / 2, 0.3, 0.15]} position={[PAX_ZONE.x, 0.3, PAX_ZONE.z - PAX_ZONE.l / 2]} />
        <CuboidCollider args={[0.15, 0.3, PAX_ZONE.l / 2]} position={[PAX_ZONE.x + PAX_ZONE.w / 2, 0.3, PAX_ZONE.z]} />
      </RigidBody>
    </group>
  );
}
