// anim/test_group1.js - Automated Verification for Group 1, Contract Adherence & Visual Pass
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== Running Code Fighters Automated Verification (Visual Pass) ===\n');

// 1. Setup Node Window environment for classic scripts
const window = {
  CF: {},
  Math: Math,
  performance: { now: () => Date.now() },
  console: console
};
window.window = window;

const context = vm.createContext(window);

function loadScript(filename) {
  const filePath = path.join(__dirname, filename);
  const code = fs.readFileSync(filePath, 'utf8');

  // Verify Rule 2: Every file begins with window.CF = window.CF || {};
  if (!code.includes('window.CF = window.CF || {};')) {
    throw new Error(`File ${filename} missing header: window.CF = window.CF || {};`);
  }

  vm.runInContext(code, context, { filename });
  console.log(`[PASS] Loaded & verified header for ${filename}`);
}

loadScript('rig.js');
loadScript('poses.js');
loadScript('effects.js');
loadScript('moves.js');
loadScript('fighter.js');

const CF = window.CF;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

// 2. Verify Rig Constants
assert(CF.RIG.torso === 40, 'RIG torso is 40px');
assert(CF.RIG.upperArm === 20, 'RIG upperArm is 20px');
assert(CF.RIG.forearm === 20, 'RIG forearm is 20px');
assert(CF.RIG.sword === 34, 'RIG sword is 34px');
assert(CF.RIG.thigh === 26, 'RIG thigh is 26px');
assert(CF.RIG.shin === 26, 'RIG shin is 26px');
assert(CF.RIG.headRadius === 9, 'RIG headRadius is 9px');
assert(CF.RIG.groundY === 190, 'RIG groundY is 190px');

// 3. Verify Geometric Invariance & Ground Snap across all Poses
function dist(p1, p2) {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

for (const poseName in CF.Poses) {
  const pose = CF.Poses[poseName];
  const joints = CF.computeJoints(200, pose, 1, 190);

  // Torso
  const torsoLen = dist(joints.hip, joints.shoulder);
  assert(Math.abs(torsoLen - 40) < 0.001, `Pose ${poseName}: torso length is 40px`);

  // Front Arm
  const frontUpperArm = dist(joints.shoulder, joints.frontElbow);
  const frontForearm = dist(joints.frontElbow, joints.frontHand);
  const swordLen = dist(joints.frontHand, joints.swordTip);
  assert(Math.abs(frontUpperArm - 20) < 0.001, `Pose ${poseName}: front upper arm is 20px`);
  assert(Math.abs(frontForearm - 20) < 0.001, `Pose ${poseName}: front forearm is 20px`);
  assert(Math.abs(swordLen - 34) < 0.001, `Pose ${poseName}: sword length is 34px`);

  // Front Leg
  const frontThigh = dist(joints.hip, joints.frontKnee);
  const frontShin = dist(joints.frontKnee, joints.frontFoot);
  assert(Math.abs(frontThigh - 26) < 0.001, `Pose ${poseName}: front thigh is 26px`);
  assert(Math.abs(frontShin - 26) < 0.001, `Pose ${poseName}: front shin is 26px`);

  // Back Leg
  const backThigh = dist(joints.hip, joints.backKnee);
  const backShin = dist(joints.backKnee, joints.backFoot);
  assert(Math.abs(backThigh - 26) < 0.001, `Pose ${poseName}: back thigh is 26px`);
  assert(Math.abs(backShin - 26) < 0.001, `Pose ${poseName}: back shin is 26px`);

  // Ground snap for grounded poses: lowest foot must be at groundY = 190
  if (!pose.airborne) {
    const lowestFootY = Math.max(joints.frontFoot[1], joints.backFoot[1]);
    assert(Math.abs(lowestFootY - 190) < 0.001, `Pose ${poseName}: lowest foot rests at 190px (actual: ${lowestFootY})`);
  }
}

// 4. Verify Move Catalog & CONTRACT.md Rules
const contractMoves = [
  'idle', 'stepLeft', 'stepRight', 'jump', 'duck', 'block',
  'slash', 'weakSlash', 'strongSlash', 'comboHeavy', 'stumble',
  'hurt', 'knockdown', 'victory', 'enemyAttack', 'feint', 'special',
  'riposte', 'spinSlash', 'backflipEvade', 'dashThrust', 'focus'
];

assert(contractMoves.length === 22, 'CONTRACT has exactly 22 moves');

const expectedDodgeMoves = ['duck', 'stepLeft', 'stepRight', 'jump', 'backflipEvade'];

for (const m of contractMoves) {
  const info = CF.getMoveInfo(m);
  assert(info && typeof info.totalMs === 'number', `CF.getMoveInfo('${m}') returns totalMs`);
  assert(Array.isArray(info.tags), `CF.getMoveInfo('${m}') returns tags array`);

  if (expectedDodgeMoves.includes(m)) {
    assert(info.tags.includes('dodge'), `Dodge move '${m}' includes 'dodge' tag`);
  }
}

// 5. Test Fighter Play & Event Emission (Slash)
const f1 = new CF.Fighter({ x: 200, facing: 1, accent: '#EF4444' });
let strikeFired = false;
f1.on('strike', (data) => {
  strikeFired = true;
  assert(data.strikeIndex === 0, 'Strike event has strikeIndex: 0');
  assert(data.tag === 'strike', 'Strike event has tag: "strike"');
});

const slashReceipt = f1.play('slash');
assert(slashReceipt.totalMs === 400, 'slash totalMs is 400ms');
assert(slashReceipt.strikeMs === 180, 'slash strikeMs is 180ms');
assert(f1.isBusy() === true, 'Fighter is busy during slash');

// Step through to strike
f1.update(100);
assert(!strikeFired, 'Strike has not fired before 180ms');
f1.update(85);
assert(strikeFired, 'Strike fired at or through 180ms');
f1.update(220);
assert(f1.isBusy() === false, 'Fighter returns to idle after slash finishes');

// 6. Test 1.9s Identical-Pose Rule and 2.4s Tell Divergence (Acceptance Criteria 5)
console.log('\n--- Verifying Acceptance Criteria 5: 1.9s Identical Pose & 2.4s Distinct Tell ---');
const fEnemyH = new CF.Fighter({ x: 200, facing: 1 });
const fEnemyV = new CF.Fighter({ x: 200, facing: 1 });
const fFeintH = new CF.Fighter({ x: 200, facing: 1 });

fEnemyH.play('enemyAttack', { dir: 'h', tellMs: 2000, windupMs: 3000 });
fEnemyV.play('enemyAttack', { dir: 'v', tellMs: 2000, windupMs: 3000 });
fFeintH.play('feint', { dir: 'h', tellMs: 2000, windupMs: 3000 });

// Step to 1.9s (1900ms)
fEnemyH.update(1900);
fEnemyV.update(1900);
fFeintH.update(1900);

// Verify poses are 100% IDENTICAL across all joint angles at 1.9s
for (const key of CF.POSE_FIELDS) {
  if (key === 'airborne') continue;
  const valH = fEnemyH.currentPose[key] || 0;
  const valV = fEnemyV.currentPose[key] || 0;
  const valFeint = fFeintH.currentPose[key] || 0;
  assert(Math.abs(valH - valV) < 0.001, `1.9s: enemyAttack H and V are identical for joint '${key}' (${valH} == ${valV})`);
  assert(Math.abs(valH - valFeint) < 0.001, `1.9s: enemyAttack and feint are identical for joint '${key}'`);
}
console.log('[PASS] enemyAttack H, V and feint are 100% identical at 1.9s');

// Step to 2.4s (2400ms - 500ms after 1.9s)
fEnemyH.update(500);
fEnemyV.update(500);

// Verify poses are CLEARLY and DRAMATICALLY different at 2.4s
const swH = fEnemyH.currentPose.sw;
const swV = fEnemyV.currentPose.sw;
const auH = fEnemyH.currentPose.au;
const auV = fEnemyV.currentPose.au;
console.log(`2.4s Tell Poses: Horizontal sw=${swH.toFixed(1)}°, au=${auH.toFixed(1)}° | Vertical sw=${swV.toFixed(1)}°, au=${auV.toFixed(1)}°`);
assert(Math.abs(swH - swV) > 100, `2.4s: Sword angle is dramatically different between H and V (${swH}° vs ${swV}°)`);
assert(Math.abs(auH - auV) > 100, `2.4s: Upper arm angle is dramatically different between H and V (${auH}° vs ${auV}°)`);
console.log('[PASS] enemyAttack H and V are clearly and unmistakably different at 2.4s');

// 7. Test enemyAttack with Pending Direction Resolution (Addendum 3)
const f2 = new CF.Fighter({ x: 200, facing: 1 });
let tellFired = false;
let telegraphedDir = null;
f2.on('tell', (data) => {
  tellFired = true;
  telegraphedDir = data.dir;
});

f2.play('enemyAttack', { dir: 'pending', tellMs: 1500, windupMs: 2500 });
// Advance to tellMs
f2.update(1500);
assert(!tellFired, 'tell event does NOT fire while dir is pending');
assert(f2._isWaitingForDir === true, 'Fighter pauses in neutral coil waiting for dir');

// Advance more time; fighter should still be waiting
f2.update(500);
assert(f2._isWaitingForDir === true, 'Fighter remains paused in neutral coil');

// Now resolve dir
f2.resolveDir('v');
assert(tellFired, 'tell event fires immediately upon resolveDir');
assert(telegraphedDir === 'v', 'tell event emitted resolved direction "v"');
assert(f2._isWaitingForDir === false, 'Fighter unfreezes after resolveDir');

// Step to strike
let enemyStrikeFired = false;
f2.on('strike', (data) => {
  enemyStrikeFired = true;
  assert(data.dir === 'v', 'Strike event contains resolved direction "v"');
});
f2.update(1200);
assert(enemyStrikeFired, 'Strike fired after windup');

// 8. Test Feint never fires strike
const f3 = new CF.Fighter({ x: 200, facing: 1 });
let feintStrikeFired = false;
let feintTellFired = false;
f3.on('strike', () => { feintStrikeFired = true; });
f3.on('tell', () => { feintTellFired = true; });

f3.play('feint', { dir: 'h', tellMs: 1000, windupMs: 2000 });
f3.update(1100);
assert(feintTellFired === true, 'Feint emits tell event');

// Step past windup through to end
f3.update(2500);
assert(feintStrikeFired === false, 'Feint NEVER emits a strike event');

// 9. Test Special Attack (Special Slam)
const f4 = new CF.Fighter({ x: 200, facing: 1 });
let slamStrikeFired = false;
f4.on('strike', (data) => {
  slamStrikeFired = true;
  assert(data.tag === 'slam', 'Special attack strike has tag: "slam"');
});
const specialReceipt = f4.play('special');
assert(specialReceipt.totalMs === 1800, 'Special attack totalMs is 1800ms');
assert(specialReceipt.strikeMs === 1200, 'Special attack strikeMs is 1200ms');

f4.update(1250);
assert(slamStrikeFired === true, 'Special slam strike fired at impact');

// 10. Test Addendum 4: f.react('hit') alias
const f5 = new CF.Fighter({ x: 440, facing: -1 });
f5.react('hit');
assert(f5.currentMove().name === 'hurt', "f.react('hit') correctly aliases to 'hurt' move");

// 11. Test Shields and Shield Break
const f6 = new CF.Fighter({ x: 440, facing: -1 });
f6.setShield(true);
assert(f6.hasShield === true, 'Shield active after setShield(true)');
let shieldBreakFired = false;
f6.on('shieldBreak', () => {
  shieldBreakFired = true;
});
f6.shieldBreak();
assert(f6.hasShield === false, 'Shield inactive after shieldBreak()');
assert(shieldBreakFired === true, 'shieldBreak event emitted');
assert(f6.currentMove().name === 'stumble', 'Fighter plays stumble on shieldBreak');

// 12. Benchmark Performance (Must be well under 2ms per frame)
console.log('\n--- Benchmarking Performance: 1,000 Simulation Frames ---');
const benchFighter = new CF.Fighter({ x: 200, facing: 1 });
benchFighter.play('slash');
const startTime = Date.now();
const frames = 1000;
for (let i = 0; i < frames; i++) {
  benchFighter.update(16.6);
  CF.computeJoints(benchFighter.x, benchFighter.currentPose, benchFighter.facing, benchFighter.groundY);
}
const elapsed = Date.now() - startTime;
const msPerFrame = elapsed / frames;
console.log(`Executed ${frames} update+joint frames in ${elapsed}ms -> ${msPerFrame.toFixed(3)}ms per frame`);
assert(msPerFrame < 2.0, `Per-frame cost (${msPerFrame.toFixed(3)}ms) is well under 2.0ms`);

// 13. Test Coordinate Rounding Helper r05
assert(CF.r05(10.2) === 10.0, 'r05(10.2) is 10.0');
assert(CF.r05(10.3) === 10.5, 'r05(10.3) is 10.5');
assert(CF.r05(10.7) === 10.5, 'r05(10.7) is 10.5');
assert(CF.r05(10.8) === 11.0, 'r05(10.8) is 11.0');

console.log('\n=== ALL AUTOMATED VERIFICATIONS & BENCHMARKS PASSED SUCCESSFULLY (13/13) ===\n');
