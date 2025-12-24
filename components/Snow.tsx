import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC = () => {
  const count = 2000;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = new THREE.Object3D();

  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 80,
      y: Math.random() * 60 - 20,
      z: (Math.random() - 0.5) * 80,
      speed: 0.02 + Math.random() * 0.05,
      scale: 0.03 + Math.random() * 0.06,
      drift: Math.random() * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      p.y -= p.speed;
      // Add some horizontal drift
      const xOffset = Math.sin(time * 0.5 + p.drift) * 0.02;
      const zOffset = Math.cos(time * 0.3 + p.drift) * 0.02;
      p.x += xOffset;
      p.z += zOffset;

      if (p.y < -25) {
        p.y = 35;
        p.x = (Math.random() - 0.5) * 80;
        p.z = (Math.random() - 0.5) * 80;
      }
      
      tempObj.position.set(p.x, p.y, p.z);
      tempObj.scale.set(p.scale, p.scale, p.scale);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={1} metalness={0} />
    </instancedMesh>
  );
};

export default Snow;
