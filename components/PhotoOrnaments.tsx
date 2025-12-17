import React, { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { PhotoData } from '../types';
import { ANIMATION_SPEED } from '../constants';

interface PhotoOrnamentsProps {
  photos: PhotoData[];
  isFormed: boolean;
  hoveredId: string | null;
  zoomedId: string | null;
}

const Polaroid: React.FC<{ 
  data: PhotoData; 
  isFormed: boolean;
  isHovered: boolean;
  isZoomed: boolean;
}> = ({ data, isFormed, isHovered, isZoomed }) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, data.url);

  useFrame((state) => {
    if (groupRef.current) {
      let targetPos: THREE.Vector3;
      let targetRot: THREE.Quaternion = new THREE.Quaternion();
      let targetScale = 1;

      if (isZoomed) {
        // Fly to center, in front of camera slightly
        targetPos = new THREE.Vector3(0, 2, 10);
        targetRot.setFromEuler(new THREE.Euler(0, 0, 0));
        targetScale = 3.0;
        
        // Make it look at camera
        const cameraPos = state.camera.position.clone();
        groupRef.current.lookAt(cameraPos);
      } else {
        // Normal behavior
        targetPos = isFormed ? data.treePosition : data.randomPosition;
        targetScale = isHovered ? 1.2 : 1.0;
        
        // Rotation
        if (isFormed) {
           // Create a dummy object to calculate "facing outward" rotation
           const dummy = new THREE.Object3D();
           dummy.position.copy(targetPos);
           
           // Look at the center (0, y, 0)
           dummy.lookAt(0, targetPos.y, 0);
           
           // Rotate 180 degrees around Y to face OUTWARDS instead of INWARDS
           dummy.rotateY(Math.PI);
           
           // Apply the random jaunty angle (Z-axis tilt)
           dummy.rotateZ(data.rotation);
           
           targetRot = dummy.quaternion;
        } else {
           // Random rotation updates (floating state)
           groupRef.current.rotation.x += 0.005;
           groupRef.current.rotation.y += 0.005;
           // In free float, we don't strictly lerp rotation to avoid spinning glitches
           // We just let the above incremental rotation happen, but we need to update targetRot 
           // to current so the slerp below doesn't reset it.
           targetRot.copy(groupRef.current.quaternion);
        }
      }

      // Apply
      groupRef.current.position.lerp(targetPos, isZoomed ? 0.1 : ANIMATION_SPEED);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1));
      
      // Only slerp rotation if formed or zoomed (controlled states)
      if (isFormed || isZoomed) {
        groupRef.current.quaternion.slerp(targetRot, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} name={`photo-${data.id}`}>
      {/* Hit box for raycaster - slightly larger */}
      <mesh visible={false}>
         <boxGeometry args={[2.5, 3, 0.2]} />
      </mesh>

      {/* Visuals */}
      {/* White Border / Paper */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[2.2, 2.6, 0.05]} />
        <meshStandardMaterial 
          color={isHovered ? "#ffdddd" : "#ffffff"} 
          emissive={isHovered ? "#330000" : "#000000"}
          roughness={0.4} 
        />
      </mesh>
      
      {/* Photo Image */}
      <mesh position={[0, 0.2, 0.02]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
};

const PhotoOrnaments: React.FC<PhotoOrnamentsProps> = ({ photos, isFormed, hoveredId, zoomedId }) => {
  return (
    <>
      {photos.map((photo) => (
        <Polaroid 
          key={photo.id} 
          data={photo} 
          isFormed={isFormed} 
          isHovered={hoveredId === photo.id}
          isZoomed={zoomedId === photo.id}
        />
      ))}
    </>
  );
};

export default PhotoOrnaments;