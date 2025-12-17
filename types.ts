import { Vector3, Quaternion, Color } from 'three';

export enum ParticleType {
  LEAF = 'LEAF',
  ORNAMENT = 'ORNAMENT',
  LIGHT = 'LIGHT',
}

export interface ParticleData {
  id: number;
  type: ParticleType;
  treePosition: Vector3;
  randomPosition: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  color: Color;
  emissive?: Color;
  metalness?: number;
  roughness?: number;
}

export interface PhotoData {
  id: string;
  url: string;
  treePosition: Vector3;
  randomPosition: Vector3;
  rotation: number; // Z-axis rotation for jaunty angle
}

export type HandGesture = 'FIST' | 'OPEN' | 'THUMB_UP' | 'PINCH' | 'NONE';

export interface HandTrackingData {
  gesture: HandGesture;
  cursor: { x: number; y: number }; // Normalized 0-1
  isPresent: boolean;
}