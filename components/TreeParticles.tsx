import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleType, ParticleData } from '../types';
import { TREE_CONFIG, COLORS, ANIMATION_SPEED } from '../constants';

interface TreeParticlesProps {
  isFormed: boolean;
}

const tempObject = new THREE.Object3D();

const TreeParticles: React.FC<TreeParticlesProps> = ({ isFormed }) => {
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const ornamentsRef = useRef<THREE.InstancedMesh>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.Mesh>(null);

  // Generate Particle Data
  const { leaves, ornaments, lights } = useMemo(() => {
    const _leaves: ParticleData[] = [];
    const _ornaments: ParticleData[] = [];
    const _lights: ParticleData[] = [];

    // 1. Generate Leaves (Needles)
    // We use a more structured approach for a realistic look
    const leafCount = TREE_CONFIG.particleCount;
    for (let i = 0; i < leafCount; i++) {
      const t = Math.random(); // 0 (top) to 1 (bottom)
      const angle = Math.random() * Math.PI * 2;
      
      // Realistic tree profile: slightly curved cone
      const radiusAtT = Math.pow(t, 1.2) * TREE_CONFIG.baseRadius;
      const y = (1 - t) * TREE_CONFIG.height - TREE_CONFIG.height / 2;
      
      // Add some randomness to radius for "fluffy" look
      const r = radiusAtT * (0.7 + Math.random() * 0.3);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const treePos = new THREE.Vector3(x, y, z);
      const randomPos = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );

      const rotation = new THREE.Quaternion();
      // Point needles slightly outwards and downwards
      const lookAtVec = new THREE.Vector3(x, -2, z).normalize();
      const dummy = new THREE.Object3D();
      dummy.lookAt(lookAtVec);
      rotation.copy(dummy.quaternion);

      const s = 0.4 + Math.random() * 0.6;
      const scale = new THREE.Vector3(s, s, s * 2); // Elongated for needles
      
      // Vary green colors
      const color = COLORS.leaf.clone().lerp(COLORS.leafLight, Math.random() * 0.5);

      _leaves.push({ id: i, type: ParticleType.LEAF, treePosition: treePos, randomPosition: randomPos, rotation, scale, color });
    }

    // 2. Generate Ornaments
    const ornamentCount = 150;
    for (let i = 0; i < ornamentCount; i++) {
      const t = 0.1 + Math.random() * 0.85;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(t, 1.2) * TREE_CONFIG.baseRadius * 0.95; // Place on surface
      const y = (1 - t) * TREE_CONFIG.height - TREE_CONFIG.height / 2;

      const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const randomPos = new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
      
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3(1, 1, 1);
      const color = Math.random() > 0.5 ? COLORS.red : COLORS.gold;

      _ornaments.push({ id: i, type: ParticleType.ORNAMENT, treePosition: treePos, randomPosition: randomPos, rotation, scale, color });
    }

    // 3. Generate Lights
    const lightCount = 300;
    for (let i = 0; i < lightCount; i++) {
      // Spiral distribution for lights
      const t = i / lightCount;
      const angle = t * Math.PI * 20; // 10 spirals
      const r = Math.pow(t, 1.2) * TREE_CONFIG.baseRadius * 0.85;
      const y = (1 - t) * TREE_CONFIG.height - TREE_CONFIG.height / 2;

      const treePos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const randomPos = new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
      
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3(1, 1, 1);
      const color = COLORS.lights[Math.floor(Math.random() * COLORS.lights.length)];

      _lights.push({ id: i, type: ParticleType.LIGHT, treePosition: treePos, randomPosition: randomPos, rotation, scale, color, emissive: color });
    }

    return { leaves: _leaves, ornaments: _ornaments, lights: _lights };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    const animateGroup = (ref: React.RefObject<THREE.InstancedMesh>, data: ParticleData[]) => {
      if (!ref.current) return;
      
      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        const target = isFormed ? p.treePosition : p.randomPosition;
        
        ref.current.getMatrixAt(i, tempObject.matrix);
        tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);
        
        tempObject.position.lerp(target, ANIMATION_SPEED);
        tempObject.quaternion.slerp(p.rotation, 0.1);
        
        if (p.type === ParticleType.LIGHT) {
          const pulse = 0.8 + Math.sin(time * 3 + p.id) * 0.4;
          tempObject.scale.set(p.scale.x * pulse, p.scale.y * pulse, p.scale.z * pulse);
        } else {
          tempObject.scale.copy(p.scale);
        }

        tempObject.updateMatrix();
        ref.current.setMatrixAt(i, tempObject.matrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
    };

    animateGroup(leavesRef, leaves);
    animateGroup(ornamentsRef, ornaments);
    animateGroup(lightsRef, lights);

    // Animate Trunk
    if (trunkRef.current) {
        const targetY = isFormed ? -TREE_CONFIG.height / 2 : -50;
        trunkRef.current.position.y = THREE.MathUtils.lerp(trunkRef.current.position.y, targetY, ANIMATION_SPEED);
    }
  });

  useLayoutEffect(() => {
    const initColors = (ref: React.RefObject<THREE.InstancedMesh>, data: ParticleData[]) => {
      if (!ref.current || !ref.current.instanceColor) return;
      for (let i = 0; i < data.length; i++) {
        ref.current.setColorAt(i, data[i].color);
      }
      ref.current.instanceColor.needsUpdate = true;
    };
    initColors(leavesRef, leaves);
    initColors(ornamentsRef, ornaments);
    initColors(lightsRef, lights);
  }, [leaves, ornaments, lights]);

  return (
    <group>
      {/* Trunk */}
      <mesh ref={trunkRef} position={[0, -TREE_CONFIG.height / 2, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 4, 12]} />
        <meshStandardMaterial color={COLORS.trunk} roughness={0.9} />
      </mesh>

      {/* Leaves - Using a thin box or cone for needles */}
      <instancedMesh ref={leavesRef} args={[undefined, undefined, leaves.length]}>
        <coneGeometry args={[0.1, 0.8, 3]} />
        <meshStandardMaterial roughness={0.8} metalness={0.2} />
      </instancedMesh>

      {/* Ornaments */}
      <instancedMesh ref={ornamentsRef} args={[undefined, undefined, ornaments.length]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial metalness={0.9} roughness={0.1} />
      </instancedMesh>

      {/* Lights */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, lights.length]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial toneMapped={false} emissiveIntensity={12.0} />
      </instancedMesh>
    </group>
  );
};

export default TreeParticles;
