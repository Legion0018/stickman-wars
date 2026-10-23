// anim/test_group4.js - Code Fighters Group 4 Verification Test Suite
// Verifies Contact Sheet and Pose Tweaker mechanics
const fs = require('fs');

global.window = global;
global.CF = {};

// Load modules
eval(fs.readFileSync(__dirname + '/rig.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/poses.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/effects.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/moves.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/fighter.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/lab.js', 'utf8'));

function assert(cond, msg) {
  if (!cond) {
    console.error('[FAIL] ' + msg);
    process.exit(1);
  } else {
    console.log('[PASS] ' + msg);
  }
}

console.log('=== Running Code Fighters Group 4 Automated Tests ===\n');

// 1. Test Fighter.prototype.setPose
const f = new CF.Fighter({ x: 200, facing: 1 });
const customPose = {
  lean: 35, drop: 12,
  au: 90, al: 85, sw: 120,
  bau: -30, bal: 10,
  flu: 45, fll: 15,
  blu: -35, bll: -10,
  dx: 20, dy: -10, rot: 15,
  airborne: true
};

f.setPose(customPose);
assert(f.currentPose.lean === 35, 'f.setPose updates lean to 35');
assert(f.currentPose.sw === 120, 'f.setPose updates sw to 120');
assert(f.currentPose.rot === 15, 'f.setPose updates rot to 15');
assert(f.currentPose.airborne === true, 'f.setPose updates airborne to true');

// 2. Test generatePoseJsCode
const code = CF.Lab.generatePoseJsCode('myCustomPose', customPose);
assert(typeof code === 'string', 'generatePoseJsCode returns a string');
assert(code.includes('myCustomPose: {'), 'code has pose name header');
assert(code.includes('lean: 35'), 'code contains lean: 35');
assert(code.includes('sw: 120'), 'code contains sw: 120');
assert(code.includes('airborne: true'), 'code contains airborne: true');

// Verify generated code evaluates as a valid JS object
const evaluated = eval('({' + code + '})');
assert(evaluated.myCustomPose.lean === 35, 'Evaluated pose code preserves lean');
assert(evaluated.myCustomPose.sw === 120, 'Evaluated pose code preserves sw');

// 3. Test that all 22 contract moves can be resolved for Contact Sheet preview
const all22Moves = [
  'idle', 'stepLeft', 'stepRight', 'jump', 'duck', 'block',
  'slash', 'weakSlash', 'strongSlash', 'comboHeavy', 'stumble',
  'hurt', 'knockdown', 'victory', 'enemyAttack', 'feint', 'special',
  'riposte', 'spinSlash', 'backflipEvade', 'dashThrust', 'focus'
];

for (const name of all22Moves) {
  const resolved = CF.resolveMove(name, { dir: 'h', tellMs: 2000, windupMs: 3000 });
  assert(resolved && typeof resolved.totalMs === 'number' && resolved.totalMs > 0, `Move ${name} resolves with positive totalMs (${resolved.totalMs}ms)`);
  assert(Array.isArray(resolved.keyframes) && resolved.keyframes.length >= 2, `Move ${name} has at least 2 keyframes for contact sheet sampling`);
}

// 4. Test all named poses in CF.Poses have valid numeric fields
for (const [pName, pose] of Object.entries(CF.Poses)) {
  assert(typeof pose.lean === 'number', `Pose ${pName} has numeric lean`);
  assert(typeof pose.drop === 'number', `Pose ${pName} has numeric drop`);
  assert(typeof pose.au === 'number', `Pose ${pName} has numeric au`);
  assert(typeof pose.al === 'number', `Pose ${pName} has numeric al`);
  assert(typeof pose.sw === 'number', `Pose ${pName} has numeric sw`);
}

console.log('\n=== ALL GROUP 4 TESTS PASSED SUCCESSFULLY ===');
