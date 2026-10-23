// anim/test_combat_upgrade.js - Verification Suite for Combat Animation Quality Pass
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== Running Combat Animation Quality Pass Verification ===\n');

// 1. Setup Node Window environment for classic scripts
const window = {
  CF: {},
  Math: Math,
  performance: { now: () => Date.now() },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
window.window = window;

const context = vm.createContext(window);

function loadScript(filename) {
  const filePath = path.join(__dirname, filename);
  const code = fs.readFileSync(filePath, 'utf8');

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

// -----------------------------------------------------------------------------
// Test Suite 1: Upgraded Slash Kinematics & Timing
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 1: Upgraded Slash Kinematics ---');
const slashInfo = CF.getMoveInfo('slash');
assert(slashInfo.totalMs === 400, `Slash totalMs preserved at 400ms (got ${slashInfo.totalMs})`);
assert(slashInfo.strikeMs === 180, `Slash strikeMs preserved at 180ms (got ${slashInfo.strikeMs})`);

const pWindup = CF.Poses.slashWindup;
assert(pWindup.lean === -16, 'slashWindup has deep anticipation lean (-16°)');
assert(pWindup.dx === -10, 'slashWindup coils backward (dx: -10)');
assert(pWindup.sw === 210, 'slashWindup sword cocked high and back (sw: 210°)');

const pStrike = CF.Poses.slashStrike;
assert(pStrike.lean === 28, 'slashStrike drives forward into full-body lunge (lean: 28°)');
assert(pStrike.dx === 28, 'slashStrike lunges forward (dx: +28)');
assert(pStrike.sw === 85, 'slashStrike sweeps through horizontal cutting plane (sw: 85°)');

const pOvershoot = CF.Poses.slashOvershoot;
assert(pOvershoot.sw === 65, 'slashOvershoot continues follow-through arc across body (sw: 65°)');
assert(pOvershoot.dx === 30, 'slashOvershoot reaches peak forward extension (dx: +30)');

const pRecover = CF.Poses.slashRecover;
assert(pRecover.lean === 12, 'slashRecover returns toward ready stance (lean: 12°)');
assert(pRecover.sw === 140, 'slashRecover sword resets toward guard angle (sw: 140°)');

// Verify bone lengths invariant across all 4 slash poses
const slashPoses = [pWindup, pStrike, pOvershoot, pRecover];
slashPoses.forEach((pose, i) => {
  const j = CF.computeJoints(200, pose, 1, 190);
  const torsoLen = Math.hypot(j.shoulder[0] - j.hip[0], j.shoulder[1] - j.hip[1]);
  const upperArmLen = Math.hypot(j.frontElbow[0] - j.shoulder[0], j.frontElbow[1] - j.shoulder[1]);
  const forearmLen = Math.hypot(j.frontHand[0] - j.frontElbow[0], j.frontHand[1] - j.frontElbow[1]);
  const swordLen = Math.hypot(j.swordTip[0] - j.frontHand[0], j.swordTip[1] - j.frontHand[1]);
  assert(Math.abs(torsoLen - 40) < 0.001, `Slash pose ${i}: Torso invariant (40px)`);
  assert(Math.abs(upperArmLen - 20) < 0.001, `Slash pose ${i}: Upper arm invariant (20px)`);
  assert(Math.abs(forearmLen - 20) < 0.001, `Slash pose ${i}: Forearm invariant (20px)`);
  assert(Math.abs(swordLen - 34) < 0.001, `Slash pose ${i}: Sword invariant (34px)`);
});

// -----------------------------------------------------------------------------
// Test Suite 2: Upgraded Duck & Sidestep Dodges
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Upgraded Duck & Sidestep Kinematics ---');
const duckInfo = CF.getMoveInfo('duck');
assert(duckInfo.totalMs === 900, `Duck totalMs preserved at 900ms (got ${duckInfo.totalMs})`);

const pDuck = CF.Poses.duck;
assert(pDuck.drop === 28, 'Duck has deep center-of-mass drop (drop: 28px)');
assert(pDuck.lean === 36, 'Duck has full-body torso crouch (lean: 36°)');
const jDuck = CF.computeJoints(200, pDuck, 1, 190);
const footSepDuck = Math.abs(jDuck.frontFoot[0] - jDuck.backFoot[0]);
assert(footSepDuck > 55, `Duck maintains wide athletic base (footSep: ${footSepDuck.toFixed(1)}px > 55px)`);
const jIdle = CF.computeJoints(200, CF.Poses.idle, 1, 190);
assert(jDuck.head[1] - jIdle.head[1] > 20, `Duck head drops significantly lower than idle (drop: ${(jDuck.head[1] - jIdle.head[1]).toFixed(1)}px > 20px)`);

const pStepL = CF.Poses.stepLeftOut;
assert(pStepL.dx === -65, 'stepLeftOut preserves -65px evasion displacement');
assert(pStepL.lean === -12, 'stepLeftOut transfers weight onto back leg (lean: -12°)');
assert(pStepL.drop === 6, 'stepLeftOut catches momentum in knee flex (drop: 6px)');

const pStepR = CF.Poses.stepRightOut;
assert(pStepR.dx === 65, 'stepRightOut preserves +65px displacement');
assert(pStepR.lean === 16, 'stepRightOut drives aggressively forward (lean: 16°)');

// -----------------------------------------------------------------------------
// Test Suite 3: Upgraded Hurt Recoil & Knockdown Defeat
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Upgraded Hurt Recoil & Knockdown Defeat ---');
const hurtInfo = CF.getMoveInfo('hurt');
assert(hurtInfo.totalMs === 350, `Hurt totalMs preserved at 350ms (got ${hurtInfo.totalMs})`);

const pHurt = CF.Poses.hurt;
assert(pHurt.lean === -32, 'Hurt has violent backward chest whiplash (lean: -32°)');
assert(pHurt.dx === -24, 'Hurt has sharp pushback displacement (dx: -24)');
assert(pHurt.sw === 20, 'Hurt sword knocked loose and wide (sw: 20°)');

const pHurtRecover = CF.Poses.hurtRecover;
assert(pHurtRecover.dx === -14, 'hurtRecover shows staggered foot replant (dx: -14)');

const knockdownInfo = CF.getMoveInfo('knockdown');
assert(knockdownInfo.totalMs === 900, `Knockdown totalMs is 900ms (got ${knockdownInfo.totalMs})`);
assert(knockdownInfo.persistent === true, 'Knockdown is marked persistent');

const pKnockFlat = CF.Poses.knockdownFlat;
assert(pKnockFlat.lean === -90, 'knockdownFlat torso rests flat horizontally on floor (lean: -90°)');
assert(pKnockFlat.rot === -90, 'knockdownFlat full body rotated -90°');
assert(pKnockFlat.airborne === true, 'knockdownFlat airborne flag enabled for ground resting');

// -----------------------------------------------------------------------------
// Test Suite 4: Fighter Event Emitter API (on, once, off)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Fighter Event API Enhancements ---');
const testFighter = new CF.Fighter({ id: 'testEmitter', x: 200, groundY: 190 });

let onceTriggeredCount = 0;
testFighter.once('strike', () => {
  onceTriggeredCount++;
});

testFighter.emit('strike', { strikeIndex: 0 });
testFighter.emit('strike', { strikeIndex: 1 });
assert(onceTriggeredCount === 1, `once('strike') fired exactly once (count: ${onceTriggeredCount})`);

let offTriggeredCount = 0;
function testOffListener() {
  offTriggeredCount++;
}
testFighter.on('end', testOffListener);
testFighter.emit('end', { move: 'slash' });
assert(offTriggeredCount === 1, 'Listener triggered before off()');
testFighter.off('end', testOffListener);
testFighter.emit('end', { move: 'slash' });
assert(offTriggeredCount === 1, 'Listener not triggered after off()');

// -----------------------------------------------------------------------------
// Test Suite 5: Combat Clash Simulation (Slash vs Duck, Hit, Knockdown)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Combat Clash Scenarios ---');

const fighterA = new CF.Fighter({ id: 'A', x: 200, groundY: 190 });
const fighterB = new CF.Fighter({ id: 'B', x: 440, groundY: 190, facing: -1 });

// Scenario A: Slash vs Duck Evasion
fighterA.reset();
fighterB.reset();
fighterB.play('duck'); // 900ms duck started (active window: [150, 750]ms)
// Step 30ms, then A plays slash
fighterB.update(30);
fighterA.play('slash'); // strike lands at 180ms
// Advance 180ms
let clashEventOutcome = null;
fighterA.on('strike', () => {
  const bMove = fighterB.currentMove();
  const inside = (bMove.elapsedMs >= 150 && bMove.elapsedMs <= 750);
  if (inside) {
    fighterB.react('dodged');
    clashEventOutcome = 'DODGED';
  } else {
    fighterB.react('hit');
    clashEventOutcome = 'HIT';
  }
});

for (let t = 0; t < 180; t += 20) {
  fighterA.update(20);
  fighterB.update(20);
}
assert(clashEventOutcome === 'DODGED', `Slash vs. Duck: Defender successfully evaded strike in hold window (outcome: ${clashEventOutcome})`);

// Scenario B: Slash vs Hit Reaction
fighterA.reset();
fighterB.reset();
fighterA.play('slash');
fighterA.once('strike', () => {
  fighterB.react('hit');
});
for (let t = 0; t < 180; t += 20) {
  fighterA.update(20);
  fighterB.update(20);
}
assert(fighterB.currentMove().name === 'hurt', `Slash vs. Hit: Defender immediately transitions to 'hurt' recoil (currentMove: ${fighterB.currentMove().name})`);

// Scenario C: Slash vs Knockdown Collapse
fighterA.reset();
fighterB.reset();
fighterA.play('slash');
fighterA.once('strike', () => {
  fighterB.play('knockdown');
});
for (let t = 0; t < 180; t += 20) {
  fighterA.update(20);
  fighterB.update(20);
}
assert(fighterB.currentMove().name === 'knockdown', `Slash vs. Knockdown: Defender enters knockdown defeat sequence (currentMove: ${fighterB.currentMove().name})`);
// Advance 720ms to reach full grounded state
for (let t = 0; t < 720; t += 30) {
  fighterB.update(30);
}
assert(fighterB.currentMove().name === 'knockdown', 'Defender remains persistently in knockdown');

console.log('\n=== ALL COMBAT ANIMATION QUALITY TESTS PASSED (100% GREEN) ===');
