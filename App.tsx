import React, { useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import TreeParticles from './components/TreeParticles';
import TreeStar from './components/TreeStar';
import PhotoOrnaments from './components/PhotoOrnaments';
import GestureController from './components/GestureController';
import Snow from './components/Snow';
import { HandTrackingData, PhotoData } from './types';
import { TREE_CONFIG } from './constants';

// --- Scene Controller ---
interface SceneControllerProps {
  handData: HandTrackingData | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

const SceneController: React.FC<SceneControllerProps> = ({ handData, onHover, onClick }) => {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const controlsRef = useRef<any>(null);
  const prevGestureRef = useRef<string>('NONE');

  useFrame(() => {
    if (!handData || !handData.isPresent) return;

    // Camera Rotation
    if (controlsRef.current) {
        const targetAzimuth = (handData.cursor.x - 0.5) * 2 * Math.PI;
        const currentAzimuth = controlsRef.current.getAzimuthalAngle();
        const diff = targetAzimuth - currentAzimuth;
        if (Math.abs(handData.cursor.x - 0.5) > 0.1) {
             controlsRef.current.setAzimuthalAngle(currentAzimuth + diff * 0.02);
        }
        const targetPolar = Math.PI/2 - (handData.cursor.y - 0.5) * 1.0;
        const currentPolar = controlsRef.current.getPolarAngle();
        controlsRef.current.setPolarAngle(currentPolar + (targetPolar - currentPolar) * 0.02);
        controlsRef.current.update();
    }

    // Raycasting
    const ndcX = (handData.cursor.x * 2) - 1;
    const ndcY = -(handData.cursor.y * 2) + 1;
    mouse.current.set(ndcX, ndcY);
    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    
    let foundId: string | null = null;
    for (const hit of intersects) {
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

    // Click Detection
    if (handData.gesture === 'PINCH' && prevGestureRef.current !== 'PINCH') {
        onClick(foundId || '');
    }
    prevGestureRef.current = handData.gesture;
  });

  return <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={10} maxDistance={50} />;
};

// --- Main App ---
const App: React.FC = () => {
  const [isFormed, setIsFormed] = useState(true);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [handData, setHandData] = useState<HandTrackingData | null>(null);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  const [zoomedPhotoId, setZoomedPhotoId] = useState<string | null>(null);

  const handleGestureUpdate = (data: HandTrackingData) => {
    setHandData(data);
    if (data.gesture === 'FIST' || data.gesture === 'THUMB_UP') setIsFormed(true);
    if (data.gesture === 'OPEN') setIsFormed(false);
  };

  const handlePhotoClick = (id: string) => {
      setZoomedPhotoId(zoomedPhotoId === id ? null : (id === '' ? null : id));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos: PhotoData[] = [];
      const files = Array.from(event.target.files);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        const t = Math.random();
        const y = (1 - t) * TREE_CONFIG.height - TREE_CONFIG.height / 2;
        const r = Math.pow(t, 1.2) * TREE_CONFIG.baseRadius * 0.85;
        const angle = Math.random() * Math.PI * 2;
        
        newPhotos.push({
          id: uuidv4(),
          url,
          treePosition: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
          randomPosition: new THREE.Vector3((Math.random()-0.5)*40, (Math.random()-0.5)*40, (Math.random()-0.5)*40),
          rotation: (Math.random() - 0.5) * 0.5,
        });
      });
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#02040a] overflow-hidden font-sans">
      <Canvas
        camera={{ position: [0, 5, 35], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        shadows
      >
        <fog attach="fog" args={['#02040a', 20, 70]} />
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <ambientLight intensity={0.4} />
        <spotLight position={[20, 30, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="blue" intensity={1} />

        <Snow />
        <TreeParticles isFormed={isFormed} />
        <TreeStar isFormed={isFormed} />
        
        <React.Suspense fallback={null}>
          <PhotoOrnaments photos={photos} isFormed={isFormed} hoveredId={hoveredPhotoId} zoomedId={zoomedPhotoId} />
        </React.Suspense>

        {/* Ground / Snow Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TREE_CONFIG.height / 2 - 2, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
        </mesh>
        
        <ContactShadows opacity={0.4} scale={40} blur={2} far={10} resolution={256} color="#000000" />

        <SceneController handData={handData} onHover={setHoveredPhotoId} onClick={handlePhotoClick} />
      </Canvas>

      {/* UI Overlays */}
      <div className="absolute top-0 w-full text-center pointer-events-none z-20 pt-12">
        <h1 className="text-6xl md:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-yellow-600 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)] tracking-tighter italic">
          Merry Christmas
        </h1>
        <p className="text-xl md:text-2xl mt-4 text-blue-100 font-light tracking-[0.5em] opacity-60 uppercase">
          牧羊云与小羊
        </p>
      </div>

      {/* Hand Cursor */}
      {handData && handData.isPresent && (
          <div 
            className="absolute w-6 h-6 border-2 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-300"
            style={{ 
                left: `${handData.cursor.x * 100}%`, 
                top: `${handData.cursor.y * 100}%`,
                borderColor: handData.gesture === 'PINCH' ? '#fbbf24' : '#ffffff',
                backgroundColor: handData.gesture === 'PINCH' ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)',
                boxShadow: handData.gesture === 'PINCH' ? '0 0 20px #fbbf24' : '0 0 10px rgba(255,255,255,0.5)',
                scale: handData.gesture === 'PINCH' ? '1.5' : '1'
            }}
          />
      )}

      <GestureController onUpdate={handleGestureUpdate} />

      <div className="absolute inset-x-0 bottom-0 p-10 pointer-events-none flex justify-between items-end">
        <div className="pointer-events-auto">
          <label className="cursor-pointer group">
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center space-x-4 transition-all hover:bg-white/10 shadow-2xl hover:scale-105 group-hover:border-white/30">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-white/90 font-medium text-sm tracking-widest uppercase">添加照片挂件</span>
            </div>
          </label>
        </div>
        
        <div className="text-white/50 text-[10px] tracking-[0.2em] uppercase text-right space-y-3 bg-black/40 p-6 rounded-2xl backdrop-blur-md border border-white/5 shadow-2xl">
           <div className="flex items-center justify-end gap-4">
             <span>散开粒子</span>
             <span className="text-white/90 border border-white/20 px-2 py-1 rounded">五指张开</span>
           </div>
           <div className="flex items-center justify-end gap-4">
             <span>聚合成树</span>
             <span className="text-white/90 border border-white/20 px-2 py-1 rounded">握拳 / 竖大拇指</span>
           </div>
           <div className="flex items-center justify-end gap-4">
             <span>查看照片</span>
             <span className="text-white/90 border border-white/20 px-2 py-1 rounded">食指捏合</span>
           </div>
           <div className="flex items-center justify-end gap-4">
             <span>旋转视角</span>
             <span className="text-white/90 border border-white/20 px-2 py-1 rounded">移动手部</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
