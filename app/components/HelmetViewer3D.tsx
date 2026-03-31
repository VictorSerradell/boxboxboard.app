"use client";
// /app/components/HelmetViewer3D.tsx
// 3D helmet viewer using Three.js — loaded dynamically (no SSR)

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Sphere } from "@react-three/drei";
import * as THREE from "three";

interface HelmetMeshProps {
  color1: string;
  color2: string;
  color3: string;
}

function HelmetMesh({ color1, color2, color3 }: HelmetMeshProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    }
  });

  // Create helmet geometry using Three.js primitives
  const helmetMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: color1,
        roughness: 0.3,
        metalness: 0.4,
      }),
    [color1],
  );
  const stripe1Mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: color2,
        roughness: 0.3,
        metalness: 0.4,
      }),
    [color2],
  );
  const stripe2Mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: color3,
        roughness: 0.3,
        metalness: 0.4,
      }),
    [color3],
  );
  const visorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#001020",
        roughness: 0.05,
        metalness: 0.9,
        envMapIntensity: 2,
      }),
    [],
  );

  return (
    <group ref={groupRef}>
      {/* Main dome */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <sphereGeometry args={[1, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <primitive object={helmetMat} />
      </mesh>

      {/* Stripe band 1 */}
      <mesh position={[0, -0.12, 0]} castShadow>
        <cylinderGeometry
          args={[1.005, 1.005, 0.18, 64, 1, true, 0, Math.PI * 2]}
        />
        <primitive object={stripe1Mat} />
      </mesh>

      {/* Stripe band 2 */}
      <mesh position={[0, -0.32, 0]} castShadow>
        <cylinderGeometry
          args={[0.98, 0.98, 0.12, 64, 1, true, 0, Math.PI * 2]}
        />
        <primitive object={stripe2Mat} />
      </mesh>

      {/* Chin piece */}
      <mesh position={[0, -0.5, 0.1]} castShadow>
        <sphereGeometry
          args={[0.75, 32, 32, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.35]}
        />
        <primitive object={helmetMat} />
      </mesh>

      {/* Visor */}
      <mesh position={[0, 0.0, 0.88]} castShadow>
        <sphereGeometry
          args={[
            1.02,
            64,
            64,
            Math.PI * 0.1,
            Math.PI * 0.8,
            Math.PI * 0.28,
            Math.PI * 0.32,
          ]}
        />
        <primitive object={visorMat} />
      </mesh>
    </group>
  );
}

interface Props {
  color1: string;
  color2: string;
  color3: string;
  size?: number;
}

export default function HelmetViewer3D({
  color1,
  color2,
  color3,
  size = 180,
}: Props) {
  return (
    <div
      style={{
        width: size,
        height: size * 1.08,
        borderRadius: size * 0.2,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: `0 0 50px ${color1}50, 0 25px 60px rgba(0,0,0,0.6)`,
        border: "3px solid rgba(255,255,255,0.18)",
      }}
    >
      <Canvas
        camera={{ position: [0, 0.1, 3.2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 5, 4]} intensity={1.5} castShadow />
        <pointLight position={[-3, -3, -3]} intensity={0.6} color="#88CCFF" />
        <Environment preset="studio" />
        <HelmetMesh color1={color1} color2={color2} color3={color3} />
      </Canvas>
    </div>
  );
}
