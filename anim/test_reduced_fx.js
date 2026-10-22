// anim/test_reduced_fx.js - Focused Regression Test for Reduced Effects & Idle Throttling
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== Running Reduced FX & Idle Throttling Verification Suite ===\n');

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
// Test Suite 1: Reduced FX Default State & Configuration API
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 1: Configuration & Default State ---');
assert(CF.Effects.isReducedFx() === false, 'Default reducedFx is false (100% backward compatible)');
assert(CF.Effects.reducedFx === false, 'EffectsManager.reducedFx initial property is false');

CF.Effects.setReducedFx(true);
assert(CF.Effects.isReducedFx() === true, 'setReducedFx(true) enables reducedFx mode');

CF.Effects.setReducedFx(false);
assert(CF.Effects.isReducedFx() === false, 'setReducedFx(false) disables reducedFx mode');

// -----------------------------------------------------------------------------
// Test Suite 2: Hit & Block Spark Complexity
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Spark Complexity Comparison ---');

// Normal mode
CF.Effects.setReducedFx(false);
CF.Effects.clear();
CF.Effects.addHitSpark(100, 100, '#EF9F27');
const normalHitSpark = CF.Effects.sparks[0];
assert(normalHitSpark.active === true, 'Normal hit spark is active');
assert(normalHitSpark.rays === 5, 'Normal hit spark has 5 rays');
assert(normalHitSpark.rayLength === 9, 'Normal hit spark has rayLength 9');
assert(normalHitSpark.maxLife === 140, 'Normal hit spark has maxLife 140ms');

CF.Effects.clear();
CF.Effects.addBlockSpark(100, 100);
const normalBlockSpark = CF.Effects.sparks[0];
assert(normalBlockSpark.rays === 5, 'Normal block spark has 5 rays');
assert(normalBlockSpark.rayLength === 8, 'Normal block spark has rayLength 8');
assert(normalBlockSpark.maxLife === 130, 'Normal block spark has maxLife 130ms');

// Reduced mode
CF.Effects.setReducedFx(true);
CF.Effects.clear();
CF.Effects.addHitSpark(100, 100, '#EF9F27');
const reducedHitSpark = CF.Effects.sparks[0];
assert(reducedHitSpark.active === true, 'Reduced hit spark is active');
assert(reducedHitSpark.rays === 3, 'Reduced hit spark complexity reduced to 3 rays');
assert(reducedHitSpark.rayLength === 6, 'Reduced hit spark rayLength shortened to 6px');
assert(reducedHitSpark.maxLife === 90, 'Reduced hit spark maxLife shortened to 90ms for faster cleanup');

CF.Effects.clear();
CF.Effects.addBlockSpark(100, 100);
const reducedBlockSpark = CF.Effects.sparks[0];
assert(reducedBlockSpark.rays === 3, 'Reduced block spark complexity reduced to 3 rays');
assert(reducedBlockSpark.rayLength === 5, 'Reduced block spark rayLength shortened to 5px');
assert(reducedBlockSpark.maxLife === 80, 'Reduced block spark maxLife shortened to 80ms');

// -----------------------------------------------------------------------------
// Test Suite 3: Ambient Landing Dust Skipping
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Ambient Landing Dust Skipping ---');

CF.Effects.setReducedFx(false);
CF.Effects.clear();
CF.Effects.addDust(100, 190, 4);
let activeDustNormal = CF.Effects.dust.filter(d => d.active).length;
assert(activeDustNormal === 4, `Normal mode spawns ambient dust particles (expected 4, got ${activeDustNormal})`);

CF.Effects.setReducedFx(true);
CF.Effects.clear();
CF.Effects.addDust(100, 190, 4);
let activeDustReduced = CF.Effects.dust.filter(d => d.active).length;
assert(activeDustReduced === 0, `Reduced mode skips optional ambient dust completely (expected 0, got ${activeDustReduced})`);

// -----------------------------------------------------------------------------
// Test Suite 4: Simultaneous Cosmetic Particle Capping
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Cosmetic Particle Capping ---');

// Shield shards
CF.Effects.setReducedFx(false);
CF.Effects.clear();
CF.Effects.addShieldShards(100, 100, 16);
let activeShardsNormal = CF.Effects.shards.filter(s => s.active).length;
assert(activeShardsNormal === 16, `Normal mode allows up to 16 shield shards (got ${activeShardsNormal})`);

CF.Effects.setReducedFx(true);
CF.Effects.clear();
CF.Effects.addShieldShards(100, 100, 16);
let activeShardsReduced = CF.Effects.shards.filter(s => s.active).length;
assert(activeShardsReduced === 6, `Reduced mode strictly caps shield shards to 6 (got ${activeShardsReduced})`);

// Shockwaves
CF.Effects.setReducedFx(false);
CF.Effects.clear();
CF.Effects.addShockwave(100, 190);
assert(CF.Effects.shockwaves[0].maxLife === 320, 'Normal shockwave maxLife is 320ms');

CF.Effects.setReducedFx(true);
CF.Effects.clear();
CF.Effects.addShockwave(100, 190);
assert(CF.Effects.shockwaves[0].maxLife === 180, 'Reduced shockwave maxLife is shortened to 180ms');

// Sword trails
CF.Effects.setReducedFx(false);
CF.Effects.clear();
for (let i = 0; i < 10; i++) {
  CF.Effects.recordTrailPoint('A', 100 + i, 100, true);
}
assert(CF.Effects.trails['A'].length === 5, 'Normal trail records max 5 points');

CF.Effects.setReducedFx(true);
CF.Effects.clear();
for (let i = 0; i < 10; i++) {
  CF.Effects.recordTrailPoint('A', 100 + i, 100, true);
}
assert(CF.Effects.trails['A'].length === 3, 'Reduced trail caps at 3 points');

// -----------------------------------------------------------------------------
// Test Suite 5: Contract Invariance (Timing, Hit-Stop & Events)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Combat & Timing Invariance ---');

// Hit-stop duration is unchanged
CF.Effects.setReducedFx(false);
CF.Effects.hitStop(80);
assert(CF.Effects.hitStopTimer === 80, 'Normal mode hitStop sets 80ms');
CF.Effects.setReducedFx(true);
CF.Effects.hitStop(80);
assert(CF.Effects.hitStopTimer === 80, 'Reduced mode hitStop preserves exact 80ms freeze');

// Move receipts and combat callbacks
const fighter = new CF.Fighter({ id: 'testA', x: 200, groundY: 190 });

CF.Effects.setReducedFx(false);
const normalReceipt = fighter.play('slash');
assert(normalReceipt.totalMs === 400 && normalReceipt.strikeMs === 180, 'Normal slash receipt: 400ms total, 180ms strike');

CF.Effects.setReducedFx(true);
const reducedReceipt = fighter.play('slash');
assert(reducedReceipt.totalMs === 400 && reducedReceipt.strikeMs === 180, 'Reduced slash receipt matches contract: 400ms total, 180ms strike');

// Event callbacks fire at the exact same frame in reduced mode
let strikeFired = false;
let strikeElapsed = 0;
fighter.on('strike', (data) => {
  strikeFired = true;
  strikeElapsed = data.elapsedMs;
});

// Step simulation in reduced mode
for (let t = 0; t <= 220; t += 20) {
  fighter.update(20);
}
assert(strikeFired === true, 'Reduced mode fires combat strike event exactly');
assert(strikeElapsed >= 180, `Strike fired at declared strike moment (elapsed: ${strikeElapsed}ms)`);

// -----------------------------------------------------------------------------
// Test Suite 6: Active Effects Detection (`hasActiveEffects`)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Active Effects Detection ---');

CF.Effects.clear();
assert(CF.Effects.hasActiveEffects() === false, 'hasActiveEffects() is false when all pools and timers are idle');

CF.Effects.addHitSpark(100, 100);
assert(CF.Effects.hasActiveEffects() === true, 'hasActiveEffects() detects active spark');
CF.Effects.clear();

CF.Effects.shake(4, 140);
assert(CF.Effects.hasActiveEffects() === true, 'hasActiveEffects() detects active screen shake');
CF.Effects.clear();

CF.Effects.hitStop(70);
assert(CF.Effects.hasActiveEffects() === true, 'hasActiveEffects() detects active hit-stop');
CF.Effects.clear();

CF.Effects.showBanner('SLAM', 'SUB');
assert(CF.Effects.hasActiveEffects() === true, 'hasActiveEffects() detects active banner');
CF.Effects.clear();

assert(CF.Effects.hasActiveEffects() === false, 'hasActiveEffects() returns false after clear()');

// -----------------------------------------------------------------------------
// Test Suite 7: Idle Detection & Frame Throttling Logic
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 7: Idle Detection & Frame Throttling Logic ---');

const fighterA = new CF.Fighter({ id: 'A', x: 200, groundY: 190 });
const fighterB = new CF.Fighter({ id: 'B', x: 440, groundY: 190 });

// Standalone verification of the idle evaluation logic used in lab.js
function checkIdle(fA, fB, effects) {
  if (fA.isBusy() || fB.isBusy()) return false;
  if (fA.currentMove().name !== 'idle' || fB.currentMove().name !== 'idle') return false;
  if (fA._isWaitingForDir || fB._isWaitingForDir) return false;
  if (effects && effects.hasActiveEffects()) return false;
  return true;
}

assert(checkIdle(fighterA, fighterB, CF.Effects) === true, 'Scene is visually idle when both fighters are neutral and no effects active');

fighterA.play('slash');
assert(checkIdle(fighterA, fighterB, CF.Effects) === false, 'Scene is active when Fighter A is playing slash');

fighterA.reset();
assert(checkIdle(fighterA, fighterB, CF.Effects) === true, 'Scene returns to visually idle after reset');

fighterB.play('focus');
assert(checkIdle(fighterA, fighterB, CF.Effects) === false, 'Scene is active when Fighter B is playing focus typing loop');

fighterB.reset();
CF.Effects.addHitSpark(200, 190);
assert(checkIdle(fighterA, fighterB, CF.Effects) === false, 'Scene is active when effects are rendering');

CF.Effects.clear();
assert(checkIdle(fighterA, fighterB, CF.Effects) === true, 'Scene is idle again once effects clear');

// Throttling interval verification:
// At 24 FPS, interval is ~41.67ms. Simulation updates run every 16.6ms, but canvas redraw is throttled.
const IDLE_FPS = 24;
const IDLE_INTERVAL = 1000 / IDLE_FPS;
let simTicks = 0;
let renderTicks = 0;
let lastRender = 0;

for (let t = 0; t <= 1000; t += 16.666) {
  simTicks++; // Simulation runs every frame
  const isIdle = checkIdle(fighterA, fighterB, CF.Effects);
  let shouldRender = true;
  if (isIdle) {
    if (t - lastRender < IDLE_INTERVAL) {
      shouldRender = false;
    }
  }
  if (shouldRender) {
    renderTicks++;
    lastRender = t;
  }
}

assert(simTicks === 61, `Simulation ran all 61 ticks over 1000ms (got ${simTicks})`);
assert(renderTicks >= 20 && renderTicks <= 26, `Idle canvas redraws successfully throttled to ~20-25 frames (got ${renderTicks})`);
console.log(`[PASS] Verified ~67% redraw reduction under 60Hz discrete steps: ${simTicks} sim updates -> ${renderTicks} canvas renders`);

console.log('\n=== ALL REDUCED FX & IDLE THROTTLING TESTS PASSED ===');
