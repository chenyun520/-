import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, ANIMATION_SPEED } from '../constants';

interface TreeStarProps {
  isFormed: boolean;
}

const TreeStar: React.FC<TreeStarProps> = ({ isFormed }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.5;
    const innerRadius = 0.7;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.5,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  const treePos = new THREE.Vector3(0, 11, 0);
  const randomPos = new THREE.Vector3(0, 30, 0); // Flies up when exploded

  useFrame((state) => {
    if (meshRef.current) {
      const target = isFormed ? treePos : randomPos;
      meshRef.current.position.lerp(target, ANIMATION_SPEED);
      
      // Rotate constantly
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={COLORS.star} 
        emissive={COLORS.star}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
};

export default TreeStar;