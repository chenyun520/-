import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC = () => {
  const count = 1000;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = new THREE.Object3D();

  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 50,
      y: Math.random() * 40 - 20, // Initial range
      z: (Math.random() - 0.5) * 50,
      speed: 0.05 + Math.random() * 0.1,
      scale: 0.05 + Math.random() * 0.05,
    }));
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    particles.forEach((p, i) => {
      p.y -= p.speed;
      // Reset when it goes below -15 (tree bottom is around -10)
      if (p.y < -15) {
        p.y = 20;
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
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
    </instancedMesh>
  );
};

export default Snow;