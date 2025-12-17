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

  // Generate Particle Data
  const { leaves, ornaments, lights } = useMemo(() => {
    const _leaves: ParticleData[] = [];
    const _ornaments: ParticleData[] = [];
    const _lights: ParticleData[] = [];

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < TREE_CONFIG.particleCount; i++) {
      const t = i / TREE_CONFIG.particleCount; // 0 to 1
      const angle = i * goldenAngle;
      
      // Tree Shape Math - FIXED ORIENTATION
      // t=0 (Top) -> y=10, r=0
      // t=1 (Bottom) -> y=-10, r=baseRadius
      
      const y = 10 - (t * 20); 
      // Radius increases as we go down (t increases)
      const baseR = Math.pow(t, 0.9) * TREE_CONFIG.baseRadius; 
      
      const layerWave = Math.sin(t * TREE_CONFIG.spiralTightness) * 0.8 * t;
      
      let radiusOffset = 0;
      let type = ParticleType.LEAF;
      const rand = Math.random();

      // Assign Types
      if (rand < 0.7) {
        type = ParticleType.LEAF;
        radiusOffset = Math.random() * 0.2;
      } else if (rand < 0.9) {
        type = ParticleType.ORNAMENT;
        radiusOffset = 0.4 + Math.random() * 0.2;
      } else {
        type = ParticleType.LIGHT;
        radiusOffset = 0.25 + Math.random() * 0.2;
      }

      // Add clamp to prevent negative radius at absolute tip
      const r = Math.max(0.0, baseR + layerWave + radiusOffset);
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);

      const treePos = new THREE.Vector3(x, y, z);
      
      // Random Chaos Position
      const randomPos = new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );

      // Rotation & Scale
      const rotation = new THREE.Quaternion();
      rotation.setFromEuler(new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ));

      let scale = new THREE.Vector3(1, 1, 1);
      let color = new THREE.Color();

      if (type === ParticleType.LEAF) {
        const s = 0.6 + Math.random() * 0.4;
        scale.set(s, s, s);
        color = COLORS.leaf;
        _leaves.push({ id: i, type, treePosition: treePos, randomPosition: randomPos, rotation, scale, color });
      } else if (type === ParticleType.ORNAMENT) {
        const s = 1.2 + Math.random() * 0.6;
        scale.set(s, s, s);
        color = Math.random() > 0.5 ? COLORS.gold : COLORS.red;
        _ornaments.push({ id: i, type, treePosition: treePos, randomPosition: randomPos, rotation, scale, color });
      } else {
        // Light
        const s = 0.7;
        scale.set(s, s, s);
        color = COLORS.lights[Math.floor(Math.random() * COLORS.lights.length)];
        _lights.push({ id: i, type, treePosition: treePos, randomPosition: randomPos, rotation, scale, color, emissive: color });
      }
    }

    return { leaves: _leaves, ornaments: _ornaments, lights: _lights };
  }, []);

  useFrame(() => {
    // Helper to animate a group
    const animateGroup = (ref: React.RefObject<THREE.InstancedMesh>, data: ParticleData[]) => {
      if (!ref.current) return;
      
      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        
        // Calculate current target based on state
        const target = isFormed ? p.treePosition : p.randomPosition;
        
        // Get current matrix
        ref.current.getMatrixAt(i, tempObject.matrix);
        tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);
        
        // Lerp position
        tempObject.position.lerp(target, ANIMATION_SPEED);
        
        // Ensure rotation/scale are stable
        tempObject.quaternion.slerp(p.rotation, 0.1);
        tempObject.scale.copy(p.scale);
        
        // Blink lights
        if (p.type === ParticleType.LIGHT) {
             const scalePulse = 0.7 + Math.sin(Date.now() * 0.005 + p.id) * 0.2;
             tempObject.scale.set(scalePulse, scalePulse, scalePulse);
        }

        tempObject.updateMatrix();
        ref.current.setMatrixAt(i, tempObject.matrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
    };

    animateGroup(leavesRef, leaves);
    animateGroup(ornamentsRef, ornaments);
    animateGroup(lightsRef, lights);
  });

  // Set initial colors
  useLayoutEffect(() => {
    const initColors = (ref: React.RefObject<THREE.InstancedMesh>, data: ParticleData[]) => {
      if (!ref.current) return;
      for (let i = 0; i < data.length; i++) {
        ref.current.setColorAt(i, data[i].color);
      }
      ref.current.instanceColor!.needsUpdate = true;
    };
    initColors(leavesRef, leaves);
    initColors(ornamentsRef, ornaments);
    initColors(lightsRef, lights);
  }, [leaves, ornaments, lights]);

  return (
    <group>
      {/* Leaves - Cone/Tetrahedron approx */}
      <instancedMesh ref={leavesRef} args={[undefined, undefined, leaves.length]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* Ornaments - Spheres */}
      <instancedMesh ref={ornamentsRef} args={[undefined, undefined, ornaments.length]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial metalness={1.0} roughness={0.1} />
      </instancedMesh>

      {/* Lights - Cubes - Increased Emissive Intensity */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, lights.length]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial toneMapped={false} emissiveIntensity={5.0} />
      </instancedMesh>
    </group>
  );
};

export default TreeParticles;