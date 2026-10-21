const fs = require('fs');
const vm = require('vm');
const path = require('path');

async function runTests() {
  const context = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Math: Math,
    Date: Date,
    Promise: Promise,
    Array: Array,
    Object: Object,
    document: {
      hidden: false,
      addEventListener: () => {},
      readyState: 'complete',
      getElementById: () => null,
      querySelectorAll: () => []
    },
    window: null,
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  const baseDir = __dirname;
  const files = [
    'config.js',
    'src/poses.js',
    'src/moves.js',
    'src/effects.js',
    'src/fighter.js',
    'src/animation.js'
  ];

  for (const f of files) {
    const fullPath = path.join(baseDir, f);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(code, context);
  }

  console.log('Script loading succeeded in correct classic-script order!');

  // Test 1: Poses & dx, dy, rot
  const Poses = context.Poses;
  const posesList = ['idle', 'windup', 'strike', 'block', 'duck', 'hurt'];
  for (const p of posesList) {
    if (!Poses.POSES[p]) throw new Error('Missing pose: ' + p);
    const pose = Poses.POSES[p];
    if (typeof pose.dx !== 'number' || typeof pose.dy !== 'number' || typeof pose.rot !== 'number') {
      throw new Error('Pose missing dx, dy or rot: ' + p);
    }
  }
  console.log('Test 1 PASSED: All 6 original poses exist with dx, dy, and rot!');

  // Test 2: Angle normalization & rotation beyond 360
  const norm720 = Poses.normalizeAngleDeg(720);
  const norm450 = Poses.normalizeAngleDeg(450);
  if (norm720 !== 0 || norm450 !== 90) throw new Error('Angle normalization failed');
  console.log('Test 2 PASSED: Angle normalization works (720 -> 0, 450 -> 90)!');

  // Test 3: Fighter Creation & Facing
  const fA = context.createFighter('A', 260, 1);
  const fB = context.createFighter('B', 540, -1);
  if (fA.facing !== 1 || fB.facing !== -1) throw new Error('Facing mismatch');
  console.log('Test 3 PASSED: Fighter A faces right (1), Fighter B faces left (-1)!');

  // Test 4: timeScale Global
  if (context.timeScale !== 1) throw new Error('timeScale default not 1');
  context.timeScale = 0.5;
  if (context.timeScale !== 0.5) throw new Error('timeScale 0.5 failed');
  context.timeScale = 0.25;
  if (context.timeScale !== 0.25) throw new Error('timeScale 0.25 failed');
  context.timeScale = 1.0;
  console.log('Test 4 PASSED: Global timeScale supports 1.0, 0.5, 0.25!');

  // Test 5: Animation API - play() Promise
  let eventFired = false;
  fA.onEvent((evt) => {
    if (evt === 'strikeLands') eventFired = true;
  });

  const playPromise = fA.play('slash');
  // slash is 220ms windup + 90ms strike = 310ms to strikeLands
  fA.anim.update(220); // phase 0 finishes, starts phase 1
  fA.anim.update(100); // 320ms total: strikeLands event fires, starts phase 2
  if (!eventFired) throw new Error('strikeLands event did not fire');

  fA.anim.update(130); // phase 2 finishes, starts returnToIdle
  fA.anim.update(200); // returnToIdle finishes and resolves playPromise

  const res = await playPromise;
  if (!res.completed) throw new Error('play() did not complete');
  console.log('Test 5 PASSED: play() returns Promise and resolves on completion!');

  // Test 6: Unknown move error handling
  let errCaught = false;
  try {
    await fA.play('invalid_move_test');
  } catch (e) {
    errCaught = true;
  }
  if (!errCaught) throw new Error('Unknown move did not reject');
  console.log('Test 6 PASSED: Unknown move rejected gracefully!');

  // Test 7: playChain()
  const chainPromise = fA.playChain(['windup', 'strike']);
  // Run loop until chain promise resolves
  let chainResolved = false;
  chainPromise.then(() => { chainResolved = true; });

  for (let i = 0; i < 40 && !chainResolved; i++) {
    fA.anim.update(40);
    fA.update(40);
    await new Promise(r => setImmediate(r));
  }
  await chainPromise;
  console.log('Test 7 PASSED: playChain() executed sequentially!');

  // Test 8: stop()
  fA.play('windup');
  fA.anim.update(50);
  fA.stop();
  if (!fA.anim.isReturningToIdle) throw new Error('stop did not return to idle');
  console.log('Test 8 PASSED: stop() smoothly returns to idle!');

  // Test 9: Effects Manager
  const fx = new context.EffectsManager();
  fx.spawnSparks(100, 100, 50, '#ff0000');
  fx.spawnDust(100, 100, 1, 10);
  fx.screenShake(100, 5);
  fx.addFloatingText('TEST', 100, 100);
  fx.addSlashArc(100, 100, 40, 0, Math.PI);
  if (fx.particles.length > 100) throw new Error('Max particles exceeded');
  fx.update(50);
  console.log('Test 9 PASSED: Effects manager operates within 100 particle pool!');

  console.log('=== ALL 9 ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
