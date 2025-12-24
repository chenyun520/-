import { Color } from 'three';

export const TREE_CONFIG = {
  particleCount: 4000, // 增加粒子数量使树更茂密
  height: 20,
  baseRadius: 8,
  spiralTightness: 15.0,
  layers: 6, // 树的分层
};

export const COLORS = {
  leaf: new Color('#0a3d1a'), // 更深的森林绿
  leafLight: new Color('#1b5e20'), // 较浅的绿色用于高光
  trunk: new Color('#3d2b1f'), // 树干棕色
  gold: new Color('#ffd700'),
  red: new Color('#b71c1c'), // 更深红
  silver: new Color('#e0e0e0'),
  lights: [
    new Color('#ffeb3b'), // 暖黄
    new Color('#f44336'), // 红
    new Color('#2196f3'), // 蓝
    new Color('#4caf50'), // 绿
  ],
  star: new Color('#ffdf00'),
};

export const ANIMATION_SPEED = 0.05;
