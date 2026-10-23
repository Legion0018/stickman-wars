/**
 * test-anim-bridge.js
 * 
 * Focused Unit & Integration Tests for src/anim-bridge.js
 * 
 * Tests:
 * 1. Graceful degradation when Animation Engine (CF) is missing
 * 2. Successful integration and initialization with CF
 * 3. Action mappings: slash, block (hold), duck (hold), special, hurt
 * 4. Hold & release synchronization returning to idle
 * 5. Authoritative combat resolution mapping (HIT, BLOCKED, DODGED, knockdown)
 * 6. Non-invasive cosmetic invariant (damage/authority remains untouched)
 * 7. Mock rendering pipeline execution (camera, background, fighters, foreground)
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { AnimationBridge } from './src/anim-bridge.js';
import { Fighter } from './src/fighter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== STARTING ANIMATION BRIDGE ADAPTER TESTS ===\n');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

// -----------------------------------------------------------------------------
// Test Suite 1: Graceful Degradation (CF is Absent)
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Graceful Degradation Without CF ---');
const nullBridge = new AnimationBridge({ cf: null });

assert(nullBridge.isAvailable() === false, 'Test 1A - isAvailable() is false when CF is null');
assert(nullBridge.isEnabled() === false, 'Test 1B - isEnabled() is false when CF is null');
assert(nullBridge.getFighter('A') === null, 'Test 1C - getFighter("A") returns null safely');
assert(nullBridge.getFighter('B') === null, 'Test 1D - getFighter("B") returns null safely');

// Ensure no throws when calling any bridge methods in degraded mode
let threw = false;
try {
  nullBridge.onAction('A', 'slash', false);
  nullBridge.onAction('B', 'block', true);
  nullBridge.onRelease('B', 'block');
  nullBridge.onCombatResolution('A', 'B', 'HIT');
  nullBridge.onCombatResolution('A', 'B', 'BLOCKED');
  nullBridge.onCombatResolution('A', 'B', 'DODGED');
  nullBridge.onDefeat('B');
  nullBridge.update(16.7);
  nullBridge.applyCamera({});
  nullBridge.restoreCamera({});
  nullBridge.drawBackgroundEffects({});
  nullBridge.drawForegroundEffects({}, 640, 360);
  const drawSuccess = nullBridge.drawFighters({});
  assert(drawSuccess === false, 'Test 1E - drawFighters returns false safely');
} catch (err) {
  threw = true;
  console.error(err);
}
assert(!threw, 'Test 1F - Degraded mode handles all methods safely with zero errors');

// -----------------------------------------------------------------------------
// Test Suite 2: Full Integration with Live CF Animation Engine
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Integration with Live CF Animation Engine ---');

// Build vm context simulating classic scripts loaded in browser
const mockWindow = {
  CF: {},
  Math: Math,
  performance: { now: () => Date.now() },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
};
mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);

function loadAnimScript(filename) {
  const filePath = path.join(__dirname, 'anim', filename);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename });
}

loadAnimScript('rig.js');
loadAnimScript('poses.js');
loadAnimScript('effects.js');
loadAnimScript('moves.js');
loadAnimScript('fighter.js');

const CF = mockWindow.CF;
assert(CF && CF.Fighter && CF.Effects && CF.Poses && (CF.resolveMove || CF.MOVES), 'Test 2A - Loaded all 5 anim engine scripts successfully into CF');

const liveBridge = new AnimationBridge({ cf: CF });
assert(liveBridge.isAvailable() === true, 'Test 2B - liveBridge.isAvailable() is true');
assert(liveBridge.isEnabled() === true, 'Test 2C - liveBridge.isEnabled() is true');

const animA = liveBridge.getFighter('A');
const animB = liveBridge.getFighter('B');
assert(animA !== null && animB !== null, 'Test 2D - Animated fighters A and B initialized');
assert(animA.x === 200 && animA.facing === 1, 'Test 2E - Fighter A starts at x=200 facing right (1)');
assert(animB.x === 440 && animB.facing === -1, 'Test 2F - Fighter B starts at x=440 facing left (-1)');
assert(animA.groundY === 190 && animB.groundY === 190, 'Test 2G - Ground lines locked to y=190 in both fighters');

// -----------------------------------------------------------------------------
// Test Suite 3: Action Dispatching & Hold/Release Synchronization
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Action Mappings & Hold/Release ---');

// 3A: Slash action
liveBridge.onAction('A', 'slash', false);
assert(animA.currentMove().name === 'slash', 'Test 3A - Fighter A plays "slash"');

// 3B: Sustained block hold
liveBridge.onAction('B', 'block', true);
assert(animB.currentMove().name === 'block', 'Test 3B - Fighter B plays sustained "block"');

// Advance time 200ms
for (let t = 0; t < 200; t += 20) {
  liveBridge.update(20);
}
assert(animB.currentMove().name === 'block', 'Test 3C - Sustained block hold keeps Fighter B in block beyond 180ms');

// Release block
liveBridge.onRelease('B', 'block');
assert(animB.currentMove().name === 'idle', 'Test 3D - Releasing block returns Fighter B smoothly to idle');

// 3C: Duck hold and release
liveBridge.onAction('B', 'duck', true);
assert(animB.currentMove().name === 'duck', 'Test 3E - Fighter B enters "duck" pose');
liveBridge.onRelease('B', 'duck');
assert(animB.currentMove().name === 'idle', 'Test 3F - Releasing duck returns Fighter B to idle');

// 3D: Special Slam action
liveBridge.onAction('A', 'special', false);
assert(animA.currentMove().name === 'special', 'Test 3G - Fighter A triggers "special" move');
assert(CF.Effects.isBannerActive(), 'Test 3H - Special Slam banner activated in EffectsManager');

// -----------------------------------------------------------------------------
// Test Suite 4: Authoritative Combat Resolution & Reaction Mapping
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Authoritative Combat Resolution ---');

// Clean slate
CF.Effects.clear();
animA.reset();
animB.reset();

const authFighterB = new Fighter('B');

// Scenario A: Slash vs. Hit
// Authoritative checkHit says HIT:
const outcomeHit = authFighterB.checkHit('slash'); // Auth fighter is idle, so HIT
assert(outcomeHit === 'HIT', 'Test 4A - Authoritative checkHit resolved HIT');
liveBridge.onCombatResolution('A', 'B', outcomeHit);
assert(animB.currentMove().name === 'hurt', 'Test 4B - Bridge cosmetic reaction transitions Fighter B to "hurt" whiplash');
assert(CF.Effects.isHitStopActive(), 'Test 4C - Hit-stop freeze frame triggered on impact');

// Scenario B: Slash vs. Block
authFighterB.setHolding('block', true);
const outcomeBlock = authFighterB.checkHit('slash');
assert(outcomeBlock === 'BLOCKED', 'Test 4D - Authoritative checkHit resolved BLOCKED');
liveBridge.onCombatResolution('A', 'B', outcomeBlock);
assert(animB.currentMove().name === 'blockRecoil', 'Test 4E - Bridge cosmetic reaction plays "blockRecoil" with blue sparks');

// Scenario C: Slash vs. Duck
authFighterB.setHolding('block', false);
authFighterB.setHolding('duck', true);
const outcomeDuck = authFighterB.checkHit('slash');
assert(outcomeDuck === 'DODGED', 'Test 4F - Authoritative checkHit resolved DODGED');
liveBridge.onCombatResolution('A', 'B', outcomeDuck);

// Scenario D: Defeat / Knockdown
liveBridge.onDefeat('B');
assert(animB.currentMove().name === 'knockdown', 'Test 4G - Defeat triggers persistent knockdown collapse');

// -----------------------------------------------------------------------------
// Test Suite 5: Cosmetic Invariance Guarantee
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Cosmetic Invariance Guarantee ---');

// Verify bridge has no damage/HP mutation authority
assert(typeof liveBridge.calculateDamage === 'undefined', 'Test 5A - Bridge has no calculateDamage API');
assert(typeof liveBridge.decideOutcome === 'undefined', 'Test 5B - Bridge has no decideOutcome API');
assert(typeof liveBridge.applyDamage === 'undefined', 'Test 5C - Bridge has no applyDamage API');

// -----------------------------------------------------------------------------
// Test Suite 6: Mock Canvas Rendering Pipeline
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Mock Canvas Rendering Pipeline ---');

const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  beginPath: () => {},
  arc: () => {},
  ellipse: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fill: () => {},
  fillRect: () => {},
  fillText: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  setLineDash: () => {},
  lineWidth: 1,
  strokeStyle: '#000',
  fillStyle: '#000',
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
};

let renderThrew = false;
try {
  liveBridge.applyCamera(mockCtx);
  liveBridge.drawBackgroundEffects(mockCtx);
  const ok = liveBridge.drawFighters(mockCtx);
  assert(ok === true, 'Test 6A - drawFighters renders kinematic stick figures successfully');
  liveBridge.drawForegroundEffects(mockCtx, 640, 360);
  liveBridge.restoreCamera(mockCtx);
} catch (err) {
  renderThrew = true;
  console.error(err);
}
assert(!renderThrew, 'Test 6B - Complete kinematic rendering pipeline executed with mock canvas');

console.log('\n=== ALL ANIMATION BRIDGE TESTS PASSED (100% GREEN) ===');
