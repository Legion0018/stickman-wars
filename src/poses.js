/**
 * Stick-Fighting Pose & Move Sequence Definitions
 * 
 * All joint coordinates are relative to the fighter's base position at the floor line:
 * - [x, y] in pixels
 * - y = 0 is the floor contact level (negative y is upward)
 * - x > 0 is forward towards the opponent (in standard unmirrored facing-right orientation)
 */

export const idle = {
  head: [2, -84],
  neck: [0, -70],
  hip: [-2, -40],
  kneeL: [10, -20],
  footL: [16, 0],
  kneeR: [-10, -18],
  footR: [-16, 0],
  elbowL: [10, -56],
  handL: [18, -50],
  elbowR: [-8, -54],
  handR: [6, -48],
  swordTip: [36, -66],
};

export const windup = {
  head: [-8, -84],
  neck: [-10, -70],
  hip: [-8, -38],
  kneeL: [6, -18],
  footL: [12, 0],
  kneeR: [-16, -18],
  footR: [-22, 0],
  elbowL: [-18, -72],
  handL: [-24, -84],
  elbowR: [-10, -66],
  handR: [-18, -80],
  swordTip: [-42, -98],
};

export const strike = {
  head: [18, -76],
  neck: [14, -64],
  hip: [6, -36],
  kneeL: [26, -18],
  footL: [32, 0],
  kneeR: [-8, -16],
  footR: [-18, 0],
  elbowL: [32, -54],
  handL: [48, -48],
  elbowR: [18, -48],
  handR: [42, -46],
  swordTip: [80, -44],
};

export const block = {
  head: [-4, -80],
  neck: [-4, -66],
  hip: [-6, -38],
  kneeL: [8, -18],
  footL: [12, 0],
  kneeR: [-12, -18],
  footR: [-18, 0],
  elbowL: [10, -60],
  handL: [16, -68],
  elbowR: [2, -56],
  handR: [12, -66],
  swordTip: [14, -104],
};

export const duck = {
  head: [10, -44],
  neck: [6, -34],
  hip: [-6, -20],
  kneeL: [16, -10],
  footL: [20, 0],
  kneeR: [-14, -10],
  footR: [-18, 0],
  elbowL: [12, -26],
  handL: [20, -22],
  elbowR: [0, -24],
  handR: [14, -20],
  swordTip: [36, -22],
};

export const hurt = {
  head: [-24, -82],
  neck: [-18, -68],
  hip: [-12, -36],
  kneeL: [0, -18],
  footL: [6, 0],
  kneeR: [-20, -16],
  footR: [-24, 0],
  elbowL: [-26, -58],
  handL: [-34, -50],
  elbowR: [-18, -54],
  handR: [-28, -46],
  swordTip: [-46, -26],
};

export const POSES = {
  idle,
  windup,
  strike,
  block,
  duck,
  hurt,
};

/**
 * Move Sequences: arrays of [pose, ms]
 * - slash: [[windup, 220], [strike, 90], [strike, 120]] (strike lands ~310ms after trigger)
 * - block: [[block, 150], [block, 700]]
 * - duck:  [[duck, 150], [duck, 700]]
 * - hurt:  [[hurt, 100], [hurt, 250]]
 */
export const MOVES = {
  slash: [
    [windup, 220],
    [strike, 90],
    [strike, 120],
  ],
  block: [
    [block, 150],
    [block, 700],
  ],
  duck: [
    [duck, 150],
    [duck, 700],
  ],
  hurt: [
    [hurt, 100],
    [hurt, 250],
  ],
};

export const JOINT_KEYS = [
  'head',
  'neck',
  'hip',
  'kneeL',
  'footL',
  'kneeR',
  'footR',
  'elbowL',
  'handL',
  'elbowR',
  'handR',
  'swordTip',
];

export function clonePose(pose) {
  const cloned = {};
  for (const k of JOINT_KEYS) {
    cloned[k] = [pose[k][0], pose[k][1]];
  }
  return cloned;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default {
  POSES,
  MOVES,
  idle,
  windup,
  strike,
  block,
  duck,
  hurt,
  JOINT_KEYS,
  clonePose,
  lerp,
  easeInOutQuad,
};
