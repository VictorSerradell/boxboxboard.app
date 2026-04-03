"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
        Math.sin(state.clock.elapsedTime * 0.5) * 0.25;
    }
  });

  const mat1 = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: color1,
        shininess: 80,
        specular: "#ffffff",
      }),
    [color1],
  );
  const mat2 = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: color2,
        shininess: 80,
        specular: "#ffffff",
      }),
    [color2],
  );
  const mat3 = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: color3,
        shininess: 80,
        specular: "#ffffff",
      }),
    [color3],
  );
  const visor = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: "#001830",
        shininess: 200,
        specular: "#88ccff",
        transparent: true,
        opacity: 0.92,
      }),
    [],
  );

  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      {/* Main Helmet Shape - Using a Cone for a more helmet-like form */}
      <mesh castShadow>
        <coneGeometry args={[2.5, 1, 64, 1, true]} />
        <primitive object={mat1} attach="material" />
      </mesh>

      {/* Stripe 1 - Using a Cylinder for a cleaner look */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[1.002, 1.002, 0.2, 64, 1, true]} />
        <primitive object={mat2} attach="material" />
      </mesh>

      {/* Stripe 2 - Using a Cylinder for a cleaner look */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.99, 0.99, 0.13, 64, 1, true]} />
        <primitive object={mat3} attach="material" />
      </mesh>

      {/* Chin Lower - Using a Cylinder for a cleaner look */}
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.92, 0.7, 0.22, 64, 1, true]} />
        <primitive object={mat1} attach="material" />
      </mesh>

      {/* Visor - Simplified Visor Shape */}
      <mesh position={[0, 0.04, 0.02]} rotation={[0.08, 0, 0]}>
        <sphereGeometry
          args={[
            1.015,
            64,
            32,
            Math.PI * 0.12,
            Math.PI * 0.76,
            Math.PI * 0.22,
            Math.PI * 0.36,
          ]}
        />
        <primitive object={visor} attach="material" />
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
  size = 140,
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
        background: "#060C18",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 5]} intensity={1.8} />
        <directionalLight
          position={[-3, -2, -3]}
          intensity={0.4}
          color="#88aaff"
        />
        <pointLight position={[0, 3, 3]} intensity={0.8} color="#ffffff" />
        <HelmetMesh color1={color1} color2={color2} color3={color3} />
      </Canvas>
    </div >
  );
}
