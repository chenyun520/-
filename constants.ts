import { Color } from 'three';

export const TREE_CONFIG = {
  particleCount: 2500,
  height: 25,
  baseRadius: 8,
  spiralTightness: 25.0, // Controls wave frequency
};

export const COLORS = {
  leaf: new Color('#003318'),
  gold: new Color('#FFD700'),
  red: new Color('#8a0a0a'),
  lights: [
    new Color('#00FFFF'), // Cyan
    new Color('#FF00FF'), // Magenta
    new Color('#FFA500'), // Orange
    new Color('#FFFFFF'), // White
  ],
  star: new Color('#FFD700'),
};

export const ANIMATION_SPEED = 0.05; // Lerp factor