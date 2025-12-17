import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import TreeParticles from './components/TreeParticles';
import TreeStar from './components/TreeStar';
import PhotoOrnaments from './components/PhotoOrnaments';
import GestureController from './components/GestureController';
import Snow from './components/Snow';
import { HandTrackingData, PhotoData } from './types';
import { TREE_CONFIG } from './constants';

// --- Scene Controller for Camera & Raycasting ---
interface SceneControllerProps {
  handData: HandTrackingData | null;
  photos: PhotoData[];
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

const SceneController: React.FC<SceneControllerProps> = ({ handData, photos, onHover, onClick }) => {
  const { camera, scene, size } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const controlsRef = useRef<any>(null);
  
  // Track previous click state to detect "Click" (transition to PINCH)
  const prevGestureRef = useRef<string>('NONE');

  useFrame(() => {
    if (!handData || !handData.isPresent) return;

    // 1. Camera Rotation (Orbit)
    // Map Cursor X (0..1) to Angle (-PI to PI)
    if (controlsRef.current) {
        const targetAzimuth = (handData.cursor.x - 0.5) * 4 * Math.PI; // Amplify effect
        
        const currentAzimuth = controlsRef.current.getAzimuthalAngle();
        const diff = targetAzimuth - currentAzimuth;
        
        // Only rotate if hand is near edges (deadzone in middle)
        if (Math.abs(handData.cursor.x - 0.5) > 0.1) {
             controlsRef.current.setAzimuthalAngle(currentAzimuth + diff * 0.02);
        }
        
        // Also subtle vertical tilt
        const targetPolar = Math.PI/2 - (handData.cursor.y - 0.5) * 1.5;
        const currentPolar = controlsRef.current.getPolarAngle();
        controlsRef.current.setPolarAngle(currentPolar + (targetPolar - currentPolar) * 0.02);
        
        controlsRef.current.update();
    }

    // 2. Raycasting for Photos
    // Convert 0..1 cursor to NDC -1..1
    const ndcX = (handData.cursor.x * 2) - 1;
    const ndcY = -(handData.cursor.y * 2) + 1;

    mouse.current.set(ndcX, ndcY);
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // Find objects named 'photo-ID'
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    
    let foundId: string | null = null;
    
    for (const hit of intersects) {
      // Traverse up to find group with name
      let obj = hit.object;
      while (obj) {
        if (obj.name && obj.name.startsWith('photo-')) {
          foundId = obj.name.replace('photo-', '');
          break;
        }
        if (obj.parent) obj = obj.parent;
        else break;
      }
      if (foundId) break;
    }

    onHover(foundId);

    // 3. Click Detection (Pinch Trigger)
    if (handData.gesture === 'PINCH' && prevGestureRef.current !== 'PINCH') {
        if (foundId) {
            onClick(foundId);
        } else {
            // Clicked on empty space -> Deselect
            onClick(''); 
        }
    }
    prevGestureRef.current = handData.gesture;
  });

  return <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} />;
};

// --- Main App ---

const App: React.FC = () => {
  const [isFormed, setIsFormed] = useState(true);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [handData, setHandData] = useState<HandTrackingData | null>(null);
  
  // Interaction State
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  const [zoomedPhotoId, setZoomedPhotoId] = useState<string | null>(null);

  const handleGestureUpdate = (data: HandTrackingData) => {
    setHandData(data);
    
    // Global States based on Gesture
    // FIST or THUMB_UP -> Form Tree
    if (data.gesture === 'FIST' || data.gesture === 'THUMB_UP') setIsFormed(true);
    // OPEN -> Explode
    if (data.gesture === 'OPEN') setIsFormed(false);
  };

  const handlePhotoClick = (id: string) => {
      // Toggle zoom if same id, otherwise zoom new, or unzoom if empty
      if (zoomedPhotoId === id) {
          setZoomedPhotoId(null);
      } else {
          setZoomedPhotoId(id === '' ? null : id);
      }
  };

  // File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos: PhotoData[] = [];
      const files = Array.from(event.target.files);
      const currentPhotoCount = photos.length;

      files.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const t = Math.random();
        const y = 8 - (t * 16);
        const normalizedHeight = 1 - t;
        const maxR = normalizedHeight * TREE_CONFIG.baseRadius * 0.8; 
        const r = Math.random() * maxR;
        const angle = Math.random() * Math.PI * 2;
        
        // Special logic for the very first photo (index 0 overall):
        // Place it dead center in front of camera when exploded
        const isFirstPhoto = currentPhotoCount + index === 0;
        
        const randomPos = isFirstPhoto 
            ? new THREE.Vector3(0, 2, 18) // Center, slightly elevated, close to camera (25)
            : new THREE.Vector3((Math.random()-0.5)*40, (Math.random()-0.5)*40, (Math.random()-0.5)*40);

        newPhotos.push({
          id: uuidv4(),
          url,
          treePosition: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
          randomPosition: randomPos,
          rotation: (Math.random() - 0.5) * 0.5,
        });
      });
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans">
      
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 2, 25], fov: 45 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
      >
        <Environment preset="city" />
        {/* Increased lighting for better visibility */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 15, 10]} intensity={2} color="#ffaa55" />
        <pointLight position={[-10, 5, 20]} intensity={1} color="#aaaaff" />

        <Snow />
        <TreeParticles isFormed={isFormed} />
        <TreeStar isFormed={isFormed} />
        <React.Suspense fallback={null}>
          <PhotoOrnaments 
            photos={photos} 
            isFormed={isFormed} 
            hoveredId={hoveredPhotoId}
            zoomedId={zoomedPhotoId}
          />
        </React.Suspense>

        <SceneController 
            handData={handData} 
            photos={photos} 
            onHover={setHoveredPhotoId}
            onClick={handlePhotoClick}
        />
      </Canvas>

      {/* Decorative Text Overlays */}
      <div className="absolute top-0 w-full text-center pointer-events-none z-20 pt-10">
        <h1 className="text-5xl md:text-7xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-500 drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse tracking-widest">
          Merry Christmas
        </h1>
        <h2 className="text-2xl md:text-3xl mt-2 text-pink-200 font-light tracking-widest drop-shadow-lg opacity-80">
          牧羊云与小羊
        </h2>
      </div>

      {/* Hand Cursor (Visual Feedback) */}
      {handData && handData.isPresent && (
          <div 
            className="absolute w-8 h-8 border-2 border-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-40 transition-colors duration-200 shadow-[0_0_10px_rgba(255,0,0,0.5)]"
            style={{ 
                left: `${handData.cursor.x * 100}%`, 
                top: `${handData.cursor.y * 100}%`,
                borderColor: handData.gesture === 'PINCH' ? '#00FF00' : '#FF0000',
                backgroundColor: handData.gesture === 'PINCH' ? 'rgba(0,255,0,0.3)' : 'transparent',
                boxShadow: handData.gesture === 'PINCH' ? '0 0 15px rgba(0,255,0,0.8)' : '0 0 10px rgba(255,0,0,0.5)'
            }}
          />
      )}

      {/* Gesture Control Input */}
      <GestureController onUpdate={handleGestureUpdate} />

      {/* UI Controls */}
      <div className="absolute inset-x-0 bottom-0 p-8 pointer-events-none flex justify-between items-end">
        <div className="pointer-events-auto">
          <label className="cursor-pointer group">
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center space-x-3 transition-all hover:bg-white/20 shadow-lg hover:scale-105 group-hover:border-white/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white font-medium text-sm tracking-wide">添加照片挂件</span>
            </div>
          </label>
        </div>
        
        <div className="text-white/80 text-sm text-right space-y-2 bg-black/60 p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl">
           <div className="flex items-center justify-end gap-2">
             <span>散开粒子</span>
             <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-bold border border-green-500/30">五指张开</span>
           </div>
           <div className="flex items-center justify-end gap-2">
             <span>聚合成树</span>
             <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded text-xs font-bold border border-red-500/30">握拳 / 竖大拇指</span>
           </div>
           <div className="flex items-center justify-end gap-2">
             <span>查看照片</span>
             <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-xs font-bold border border-yellow-500/30">食指放大</span>
           </div>
           <div className="flex items-center justify-end gap-2">
             <span>旋转视角</span>
             <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-bold border border-blue-500/30">移动手部</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;