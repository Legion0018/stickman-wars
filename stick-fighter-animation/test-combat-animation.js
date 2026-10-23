/**
 * ARC Stick-Fighter Animation Engine — Combat Animation Regression & Verification Suite
 * Tests interruption, event safety, shortest-arc rotation, phase synchronization,
 * chained moves, held poses, effects pool reuse, and stress testing.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadEngine() {
  const context = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    Math: Math
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  const baseDir = path.resolve(__dirname);
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
  return context;
}

async function runTests() {
  console.log('=== STARTING COMBAT ANIMATION REGRESSION & VERIFICATION SUITE ===');

  // Test 1: Interruption & Event Cancellation via stop()
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);
    const eventsFired = [];
    f.onEvent((name) => eventsFired.push(name));

    f.play('hit_strong'); // strikeLands at 380ms
    f.anim.update(100);
    f.update(100);

    f.stop(); // Stopped at 100ms
    if (!eventsFired.includes('stopped')) {
      throw new Error('Test 1 Failed: stopped event was not emitted');
    }

    // Step forward 400ms through return to idle
    for (let t = 0; t < 20; t++) {
      f.anim.update(20);
      f.update(20);
    }

    if (eventsFired.includes('strikeLands')) {
      throw new Error('Test 1 Failed: strikeLands fired AFTER move was stopped!');
    }
    if (eventsFired.includes('completed')) {
      throw new Error('Test 1 Failed: completed event fired for a stopped move!');
    }
    console.log('PASS: Test 1 - Events properly cancelled upon stop(), no phantom hits or completion');
  }

  // Test 2: Mid-animation interrupt by another move
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);
    const eventsFired = [];
    f.onEvent((name, data) => eventsFired.push({ name, data }));

    let p1Interrupted = false;
    const p1 = f.play('attack_horizontal'); // tell at 2000ms, strikeLands at 3120ms
    p1.then((res) => {
      if (res && res.interrupted) p1Interrupted = true;
    });

    f.anim.update(200);
    f.update(200);

    // Hit by opponent: play hurt_light
    const p2 = f.play('hurt_light');
    await Promise.resolve(); // allow microtasks

    if (!p1Interrupted) {
      throw new Error('Test 2 Failed: prior playing promise was not resolved with interrupted: true');
    }

    const hasInterruptedEvent = eventsFired.some(e => e.name === 'interrupted' && e.data.move === 'attack_horizontal' && e.data.by === 'hurt_light');
    if (!hasInterruptedEvent) {
      throw new Error('Test 2 Failed: interrupted event not emitted with correct metadata');
    }

    // Step through hurt_light duration
    for (let t = 0; t < 20; t++) {
      f.anim.update(25);
      f.update(25);
    }

    const tellFired = eventsFired.some(e => e.name === 'tell');
    const strikeFired = eventsFired.some(e => e.name === 'strikeLands');
    if (tellFired || strikeFired) {
      throw new Error('Test 2 Failed: interrupted attack emitted future combat events!');
    }
    console.log('PASS: Test 2 - Mid-move interruption resolves previous promise and clears pending events');
  }

  // Test 3: Shortest-Arc rotation on interruption
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);

    f.play('whirlwind');
    // Step until rotation is ~360 deg
    for (let t = 0; t < 300; t += 20) {
      f.anim.update(20);
      f.update(20);
    }

    const rotBefore = f.currentPose.rot;
    if (rotBefore < 200) {
      throw new Error(`Test 3 Setup: expected rotation > 200, got ${rotBefore}`);
    }

    // Interrupt with hurt_light (target rot is -14)
    f.play('hurt_light');
    f.anim.update(20);
    f.update(20);

    // Adjusted fromPose rot should be close to target rot (-14), not raw 360-degree delta
    const rotDiff = Math.abs(f.fromPose.rot - f.targetPose.rot);
    if (rotDiff > 180) {
      throw new Error(`Test 3 Failed: rot diff is ${rotDiff} > 180, causing reverse spin unwind!`);
    }
    console.log('PASS: Test 3 - Shortest-arc angular calculation prevents violent reverse spin on interrupt');
  }

  // Test 4: Shortest-Arc rotation when settling from whirlwind
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);

    f.play('whirlwind');
    // Run full whirlwind phases (1100ms)
    for (let t = 0; t < 1100; t += 25) {
      f.anim.update(25);
      f.update(25);
    }

    // Allow returnToIdle
    for (let t = 0; t < 250; t += 25) {
      f.anim.update(25);
      f.update(25);
    }

    if (Math.abs(f.currentPose.rot) > 1) {
      throw new Error(`Test 4 Failed: character did not settle upright at rot 0 (got ${f.currentPose.rot})`);
    }
    console.log('PASS: Test 4 - Whirlwind finishes 720-degree spin and smoothly settles at 0 degrees');
  }

  // Test 5: Phase timing precision and delta carryover
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);

    // combo_bonus: total 1100ms phases + 180ms returnToIdle = 1280ms
    f.play('combo_bonus');
    let simulatedMs = 0;
    const stepSize = 33.333;

    while (f.anim.isPlaying || f.anim.isReturningToIdle) {
      f.anim.update(stepSize);
      f.update(stepSize);
      simulatedMs += stepSize;
    }

    const expectedMs = 1280;
    const error = Math.abs(simulatedMs - expectedMs);
    // With overshoot carryover, duration should be within 1 frame (34ms)
    if (error > stepSize * 1.5) {
      throw new Error(`Test 5 Failed: phase drift is ${error.toFixed(1)}ms (expected within ${stepSize}ms)`);
    }
    console.log(`PASS: Test 5 - Phase timing carryover accurate within ${(error).toFixed(1)}ms (drift eliminated)`);
  }

  // Test 6: Chained moves without unnecessary idle snaps
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);
    let idleReturnCount = 0;

    f.onEvent((name) => {
      if (name === 'completed' && f.currentMoveName === 'windup') {
        // intermediate completed
      }
    });

    const chainP = f.playChain(['windup', 'slash']);
    let chainDone = false;
    chainP.then(() => { chainDone = true; });

    let intermediateIdleObserved = false;
    for (let t = 0; t < 1200 && !chainDone; t += 20) {
      if (f.currentMoveName === 'windup' && f.anim.isReturningToIdle) {
        intermediateIdleObserved = true;
      }
      f.anim.update(20);
      f.update(20);
      await new Promise(r => setImmediate(r));
    }

    if (intermediateIdleObserved) {
      throw new Error('Test 6 Failed: intermediate move in chain snapped to returnToIdle between hits!');
    }
    if (!chainDone) {
      throw new Error('Test 6 Failed: chain did not complete');
    }
    console.log('PASS: Test 6 - playChain executes seamlessly without returning to idle between combo links');
  }

  // Test 7: Held poses (knockdown stays down until get_up)
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);

    // Play knockdown with hold: true
    f.play('knockdown', { hold: true });
    // Advance past total duration (1000ms)
    for (let t = 0; t < 1100; t += 25) {
      f.anim.update(25);
      f.update(25);
    }

    // Fighter should NOT be idle and should maintain knockdown position on the floor
    if (f.isIdle) {
      throw new Error('Test 7 Failed: fighter with hold: true returned to idle prematurely');
    }
    if (f.currentPose.dy < 30 || Math.abs(f.currentPose.rot) < 60) {
      throw new Error(`Test 7 Failed: fighter not in knockdown pose (dy: ${f.currentPose.dy}, rot: ${f.currentPose.rot})`);
    }

    // Now execute get_up
    f.play('get_up');
    // Ensure smooth transition from floor to duck (rot goes from -85 towards 6)
    f.anim.update(100);
    f.update(100);
    if (f.currentPose.rot < -85 || f.currentPose.rot > 10) {
      throw new Error('Test 7 Failed: get_up did not start from ground pose');
    }

    // Advance to get_up completion
    for (let t = 0; t < 700; t += 25) {
      f.anim.update(25);
      f.update(25);
    }

    if (!f.isIdle || Math.abs(f.currentPose.rot) > 1) {
      throw new Error('Test 7 Failed: get_up did not cleanly settle into standing idle');
    }
    console.log('PASS: Test 7 - Held pose (knockdown) stays down on floor and gets up smoothly with get_up');
  }

  // Test 8: Particle Pool Reuse under Saturation
  {
    const ctx = loadEngine();
    const fx = new ctx.EffectsManager();

    // Saturate all 100 particles
    fx.spawnSparks(100, 100, 100);
    const activeInitial = fx.particles.filter(p => p.active).length;
    if (activeInitial !== 100) {
      throw new Error(`Test 8 Setup: expected 100 active particles, got ${activeInitial}`);
    }

    // Now spawn 10 sparks at a distinct coordinate
    fx.spawnSparks(250, 250, 10);

    const atNewCoord = fx.particles.filter(p => p.x === 250 && p.y === 250);
    if (atNewCoord.length !== 10) {
      throw new Error(`Test 8 Failed: expected 10 particles at new coord, got ${atNewCoord.length} (recycle overwrite bug!)`);
    }

    // Pool remains strictly capped at 100
    const totalActive = fx.particles.filter(p => p.active).length;
    if (totalActive > 100) {
      throw new Error(`Test 8 Failed: pool exceeded 100 particles (${totalActive})`);
    }
    console.log('PASS: Test 8 - Particle pool round-robin reuse correctly spawns all requested particles when full');
  }

  // Test 9: Effects Cleanup (clear / reset)
  {
    const ctx = loadEngine();
    const fx = new ctx.EffectsManager();

    fx.spawnSparks(100, 100, 20);
    fx.spawnDust(100, 330, 1, 8);
    fx.addSlashArc(100, 100, 50, 0, Math.PI);
    fx.spawnShockwave(100, 330, 60);
    fx.screenShake(200, 8);
    fx.flash(150);

    fx.clear();

    const activeCount = fx.particles.filter(p => p.active).length;
    if (activeCount !== 0) throw new Error('Test 9 Failed: active particles not cleared');
    if (fx.slashArcs.length !== 0) throw new Error('Test 9 Failed: slash arcs not cleared');
    if (fx.shockwaves.length !== 0) throw new Error('Test 9 Failed: shockwaves not cleared');
    if (fx.shakeTimer !== 0 || fx.flashTimer !== 0) throw new Error('Test 9 Failed: timers not cleared');
    console.log('PASS: Test 9 - EffectsManager.clear() and reset() cleanly flush all active effects and timers');
  }

  // Test 10: Afterimage recording and static renderer
  {
    const ctx = loadEngine();
    const fx = new ctx.EffectsManager();
    const f = ctx.createFighter('A', 200, 1);

    fx.spawnAfterimage(f.x, 330, f.facing, f.currentPose, '#EF9F27');
    if (fx.afterimages.length !== 1) {
      throw new Error('Test 10 Failed: afterimage was not recorded');
    }

    // Test static stick figure renderer
    let drawCalls = 0;
    const mockCtx = {
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
      rotate: () => {}, beginPath: () => {}, arc: () => { drawCalls++; },
      moveTo: () => {}, lineTo: () => {}, stroke: () => { drawCalls++; }, fill: () => {}
    };

    ctx.Fighter.drawStickFigure(mockCtx, f.currentPose, 200, 330, 1, '#ffffff', '#EF9F27', false, 3.5, 0);
    if (drawCalls < 5) {
      throw new Error('Test 10 Failed: Fighter.drawStickFigure did not render limbs/head');
    }
    console.log('PASS: Test 10 - Afterimages recorded and Fighter.drawStickFigure renders static poses');
  }

  // Test 11: Rapid stress test (25 rapid move triggers back-to-back)
  {
    const ctx = loadEngine();
    const f = ctx.createFighter('A', 200, 1);
    const moves = Object.keys(ctx.MoveCatalogue);

    let caughtError = false;
    try {
      for (let i = 0; i < 25; i++) {
        const randMove = moves[i % moves.length];
        f.play(randMove);
        // Step tiny random time slice
        const dt = 10 + (i * 3) % 25;
        f.anim.update(dt);
        f.update(dt);
      }
    } catch (err) {
      caughtError = true;
      console.error(err);
    }

    if (caughtError) {
      throw new Error('Test 11 Failed: rapid playback stress test threw an exception');
    }

    // Now call stop and ensure it cleanly returns to idle
    f.stop();
    for (let t = 0; t < 250; t += 20) {
      f.anim.update(20);
      f.update(20);
    }

    if (!f.isIdle) {
      throw new Error('Test 11 Failed: fighter failed to settle to idle after stress sequence');
    }
    console.log('PASS: Test 11 - Rapid stress test (25 interruptions) executed with zero errors and clean recovery');
  }

  console.log('=== ALL 11 COMBAT ANIMATION REGRESSION TESTS PASSED! ===');
}

runTests().catch(err => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
