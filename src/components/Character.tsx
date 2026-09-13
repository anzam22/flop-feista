import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type CharAnim = { speed: number; act: boolean };

/**
 * Goofy toy ferry-hand: rounded capsule body, oversized head, noodle arms that
 * swing with speed and shoot up when interacting.
 */
export function Character({
  color,
  anim,
  label,
}: {
  color: string;
  anim: MutableRefObject<CharAnim>;
  label?: string;
}) {
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;
    const s = anim.current.speed;
    const swing = Math.sin(t * (6 + s * 1.6)) * (0.25 + s * 0.22);
    const up = anim.current.act ? -2.1 : 0;
    if (armL.current) armL.current.rotation.x += (swing + up - armL.current.rotation.x) * 12 * dt;
    if (armR.current) armR.current.rotation.x += (-swing + up - armR.current.rotation.x) * 12 * dt;
    if (body.current) {
      const squash = 1 + Math.sin(t * (6 + s * 1.6)) * 0.03 * (0.4 + s * 0.2);
      body.current.scale.set(2 - squash, squash, 2 - squash);
      body.current.rotation.z = Math.sin(t * 3 + 1) * 0.04;
    }
    if (head.current) head.current.rotation.z = Math.sin(t * 2.2) * 0.09;
  });

  return (
    <group>
      <group ref={body}>
        <mesh castShadow position={[0, -0.05, 0]}>
          <capsuleGeometry args={[0.34, 0.42, 6, 16]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        {/* life vest */}
        <mesh position={[0, -0.02, 0]} castShadow>
          <capsuleGeometry args={[0.37, 0.16, 6, 16]} />
          <meshStandardMaterial color="#ffd23f" roughness={0.6} />
        </mesh>
      </group>

      <group ref={head} position={[0, 0.56, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.31, 24, 20]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        {/* eyes */}
        <mesh position={[-0.12, 0.05, 0.26]}>
          <sphereGeometry args={[0.09, 16, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0.12, 0.05, 0.26]}>
          <sphereGeometry args={[0.09, 16, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[-0.12, 0.05, 0.33]}>
          <sphereGeometry args={[0.04, 12, 10]} />
          <meshStandardMaterial color="#222b3a" />
        </mesh>
        <mesh position={[0.12, 0.05, 0.33]}>
          <sphereGeometry args={[0.04, 12, 10]} />
          <meshStandardMaterial color="#222b3a" />
        </mesh>
        {/* little sailor cap */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 0.12, 16]} />
          <meshStandardMaterial color="#fdfdfd" roughness={0.6} />
        </mesh>
      </group>

      <group ref={armL} position={[-0.38, 0.18, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.3, 6, 12]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      </group>
      <group ref={armR} position={[0.38, 0.18, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.3, 6, 12]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      </group>

      <mesh position={[-0.16, -0.52, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.16, 6, 12]} />
        <meshStandardMaterial color="#3d4a5c" roughness={0.6} />
      </mesh>
      <mesh position={[0.16, -0.52, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.16, 6, 12]} />
        <meshStandardMaterial color="#3d4a5c" roughness={0.6} />
      </mesh>

      {label ? (
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      ) : null}
    </group>
  );
}
