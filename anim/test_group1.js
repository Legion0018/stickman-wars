// anim/test_group1.js - Automated Verification for Group 1 & Contract Adherence
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== Running Code Fighters Group 1 Automated Verification ===\n');

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

// 6. Test enemyAttack with Pending Direction Resolution (Addendum 3)
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

// 7. Test Feint never fires strike
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

// 8. Test Special Attack (Special Slam)
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

// 9. Test Addendum 4: f.react('hit') alias
const f5 = new CF.Fighter({ x: 440, facing: -1 });
f5.react('hit');
assert(f5.currentMove().name === 'hurt', "f.react('hit') correctly aliases to 'hurt' move");

// 10. Test Shields and Shield Break
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

console.log('\n=== ALL AUTOMATED VERIFICATIONS PASSED SUCCESSFULLY (10/10) ===\n');
