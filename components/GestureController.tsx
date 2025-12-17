import React, { useEffect, useRef, useState } from 'react';
import { HandTrackingData, HandGesture } from '../types';

interface GestureControllerProps {
  onUpdate: (data: HandTrackingData) => void;
}

const GestureController: React.FC<GestureControllerProps> = ({ onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const cameraRef = useRef<any>(null);
  const handsRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    let isMounted = true;
    let scriptCheckInterval: number;

    const startMediaPipe = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Hands = (window as any).Hands;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Camera = (window as any).Camera;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const drawUtils = (window as any).drawConnectors;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const drawingUtils = (window as any);

      if (!Hands || !Camera) return;

      if (handsRef.current) handsRef.current.close();
      if (cameraRef.current) cameraRef.current.stop();

      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });
      handsRef.current = hands;

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hands.onResults((results: any) => {
        if (!isMounted) return;
        setIsLoaded(true);
        
        const canvasCtx = canvasRef.current?.getContext('2d');
        const width = canvasRef.current?.width || 320;
        const height = canvasRef.current?.height || 240;

        if (canvasCtx && results.image) {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, width, height);
          canvasCtx.drawImage(results.image, 0, 0, width, height);
          
          let currentGesture: HandGesture = 'NONE';
          let cursor = { x: 0.5, y: 0.5 };
          let isPresent = false;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            isPresent = true;
            const landmarks = results.multiHandLandmarks[0];
            
            // Draw skeleton
            if (drawUtils && drawingUtils) {
               drawUtils(canvasCtx, landmarks, drawingUtils.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
               drawingUtils.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
            }

            // --- GESTURE LOGIC ---
            currentGesture = detectGesture(landmarks);
            
            // --- CURSOR LOGIC ---
            // Use Index Finger Tip (8) as cursor
            // Mirror X because webcam is mirrored
            cursor = {
              x: 1 - landmarks[8].x,
              y: landmarks[8].y
            };
          }

          onUpdate({ gesture: currentGesture, cursor, isPresent });
          canvasCtx.restore();
        }
      });

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onFrame: async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240,
        });
        cameraRef.current = camera;
        camera.start();
      }
    };

    scriptCheckInterval = window.setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).Hands && (window as any).Camera) {
        clearInterval(scriptCheckInterval);
        startMediaPipe();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearInterval(scriptCheckInterval);
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, []); // Run once on mount

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectGesture = (landmarks: any[]): HandGesture => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    
    // Helper: Distance between two 3D points
    const distance = (p1: any, p2: any) => 
       Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    const pinchDist = distance(thumbTip, indexTip);
    
    // Check extended fingers (Index(8), Middle(12), Ring(16), Pinky(20))
    // A simple check is if Tip is higher (lower Y value) than PIP joint (base of finger)
    // Note: This coordinate system has Y=0 at top. So Tip < PIP means extended upwards.
    // However, for generic orientation, distance from wrist is safer.
    
    const isExtended = (tipIdx: number, pipIdx: number) => {
        return distance(wrist, landmarks[tipIdx]) > distance(wrist, landmarks[pipIdx]) * 1.2;
    };

    const indexExt = isExtended(8, 6);
    const middleExt = isExtended(12, 10);
    const ringExt = isExtended(16, 14);
    const pinkyExt = isExtended(20, 18);
    const thumbExt = distance(wrist, thumbTip) > distance(wrist, landmarks[2]); // Simple check

    const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

    // 1. PINCH (Index close to thumb)
    if (pinchDist < 0.05) {
      return 'PINCH';
    }

    // 2. THUMB UP
    // Thumb is extended, others are curled. 
    // Usually Hand is upright, so Thumb Tip Y is above Index Base Y? 
    // Let's stick to extended count.
    if (thumbExt && extendedCount === 0) {
      return 'THUMB_UP';
    }

    // 3. FIST
    // All fingers curled
    if (extendedCount === 0 && !thumbExt) {
      return 'FIST';
    }

    // 4. OPEN
    // At least 4 fingers extended
    if (extendedCount >= 4) {
      return 'OPEN';
    }

    return 'NONE';
  };

  return (
    <div className="absolute top-4 right-4 w-40 h-32 border-2 border-white/30 rounded-lg overflow-hidden bg-black/50 backdrop-blur-sm z-50 transform scale-x-[-1]">
      <video ref={videoRef} className="hidden" playsInline />
      <canvas ref={canvasRef} className="w-full h-full" width={320} height={240} />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs text-center p-2 transform scale-x-[-1]">
          Loading AI...
        </div>
      )}
    </div>
  );
};

export default GestureController;