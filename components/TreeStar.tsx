import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, ANIMATION_SPEED, TREE_CONFIG } from '../constants';

interface TreeStarProps {
  isFormed: boolean;
}

const TreeStar: React.FC<TreeStarProps> = ({ isFormed }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.8;
    const innerRadius = 0.8;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.6,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.2,
      bevelThickness: 0.2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  const treePos = new THREE.Vector3(0, TREE_CONFIG.height / 2 + 1, 0);
  const randomPos = new THREE.Vector3(0, 40, 0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      const target = isFormed ? treePos : randomPos;
      meshRef.current.position.lerp(target, ANIMATION_SPEED);
      
      // Rotate and float slightly
      meshRef.current.rotation.y += 0.015;
      if (isFormed) {
        meshRef.current.position.y += Math.sin(time * 2) * 0.05;
      }
    }
    if (glowRef.current) {
        glowRef.current.intensity = 2 + Math.sin(time * 4) * 1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
          color={COLORS.star} 
          emissive={COLORS.star}
          emissiveIntensity={4}
          metalness={1}
          roughness={0.2}
          toneMapped={false}
        />
        <pointLight ref={glowRef} color={COLORS.star} distance={10} intensity={2} />
      </mesh>
    </group>
  );
};

export default TreeStar;
