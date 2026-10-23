// anim/check_silhouettes.js - Mathematical Silhouette & Overlap Analyzer
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const window = { CF: {}, Math, performance: { now: () => Date.now() }, console };
window.window = window;
const context = vm.createContext(window);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), context);
}
load('rig.js');
load('poses.js');
load('moves.js');

const CF = window.CF;

console.log('=== Checking Pose Silhouettes, Stances & Torso Overlaps ===\n');

function segDist(p, a, b) {
  const l2 = Math.hypot(b[0] - a[0], b[1] - a[1]) ** 2;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * (b[0] - a[0])), p[1] - (a[1] + t * (b[1] - a[1])));
}

let warnings = 0;

for (const name in CF.Poses) {
  const pose = CF.Poses[name];
  const j = CF.computeJoints(200, pose, 1, 190);

  // 1. Stance separation (front foot vs back foot X)
  const footSeparation = Math.abs(j.frontFoot[0] - j.backFoot[0]);
  if (!pose.airborne && footSeparation < 10) {
    console.log(`[WARN] Pose '${name}': Narrow stance (${footSeparation.toFixed(1)}px).`);
    warnings++;
  }

  // 2. Sword clearance from torso segment [hip -> shoulder]
  const swordTipToTorso = segDist(j.swordTip, j.hip, j.shoulder);
  const swordHandToTorso = segDist(j.frontHand, j.hip, j.shoulder);
  const swordMinClearance = Math.min(swordTipToTorso, swordHandToTorso);
  if (swordMinClearance < 6 && name !== 'focusKneelTyping1' && name !== 'focusKneelTyping2') {
    console.log(`[WARN] Pose '${name}': Sword close to torso (${swordMinClearance.toFixed(1)}px).`);
    warnings++;
  }

  // 3. Sword to forearm separation (sword shouldn't lay directly backwards along arm)
  const swordAngle = pose.sw !== undefined ? pose.sw : 0;
  const forearmAngle = pose.al !== undefined ? pose.al : 0;
  const swordForearmDiff = Math.abs(((swordAngle - forearmAngle + 180) % 360) - 180);
  if (swordForearmDiff === 180) {
    console.log(`[WARN] Pose '${name}': Sword doubles back exactly onto forearm.`);
    warnings++;
  }
}

if (warnings === 0) {
  console.log('[PASS] All poses maintain wide stances, distinct sword separation, and clear silhouettes!\n');
} else {
  console.log(`[INFO] Found ${warnings} minor warnings.\n`);
}
