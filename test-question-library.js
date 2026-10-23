/**
 * test-question-library.js
 * 
 * Comprehensive Unit and Integration Test Suite for the Python Question Library.
 * 
 * Verifies:
 * 1. Strict JSON question schema validation (valid & invalid structures).
 * 2. Registry integrity: all 12 initial challenges present, unique IDs, all 6 topics covered.
 * 3. Safe challenge retrieval and deep-clone mutation isolation.
 * 4. Graceful handling of unknown, missing, and malformed challenge IDs.
 * 5. Filtering by topic, difficulty, and unlockable combat move.
 * 6. Sequential/progressive challenge navigation.
 * 7. Deterministic unit-test grading across all 12 challenges (zero AI dependency).
 * 8. Regression verification of the existing Special Slam challenge.
 * 9. ChallengeController dynamic challenge loading and switching.
 */

import assert from 'node:assert';
import { questionRegistry, QuestionRegistry, ALLOWED_TOPICS, ALLOWED_DIFFICULTIES, ALLOWED_ACTIONS } from './src/question-registry.js';
import { CHALLENGES } from './src/challenges-data.js';
import { ChallengeController } from './src/challenge-controller.js';

console.log('=== STARTING QUESTION LIBRARY & REGISTRY TEST SUITE ===');

// ----------------------------------------------------------------------------
// Test 1: Question Schema Validation (Strict Rules)
// ----------------------------------------------------------------------------
{
  const registry = new QuestionRegistry([]);

  // Valid challenge
  const validChallenge = {
    id: "test-challenge-1",
    title: "Test Challenge",
    topic: "variables",
    difficulty: "beginner",
    instructions: "Do something simple.",
    signature: "def test_func(x: int) -> int",
    entrypoint: "test_func",
    starterCode: "def test_func(x):\n    pass",
    solutionCode: "def test_func(x):\n    return x * 2",
    hints: ["Use multiplication"],
    testCases: [{ input: "test_func(5)", args: [5], expected: 10 }],
    unlockAction: "slash"
  };

  const validResult = registry.validateSchema(validChallenge);
  assert.strictEqual(validResult.valid, true, 'Valid challenge should pass schema validation');
  assert.strictEqual(validResult.errors.length, 0, 'Valid challenge should have 0 errors');

  // Invalid: missing ID, bad topic, bad difficulty, bad entrypoint, empty testCases
  const invalidChallenge = {
    id: "",
    title: "",
    topic: "quantum_physics",
    difficulty: "impossible",
    instructions: "",
    signature: "",
    entrypoint: "123-bad-name!",
    starterCode: 123,
    solutionCode: "",
    hints: "not-an-array",
    testCases: [],
    unlockAction: "teleport"
  };

  const invalidResult = registry.validateSchema(invalidChallenge);
  assert.strictEqual(invalidResult.valid, false, 'Invalid challenge must fail validation');
  assert.ok(invalidResult.errors.length >= 8, 'Multiple schema errors must be detected');

  // Verify graceful rejection in register()
  const registerResult = registry.register(invalidChallenge);
  assert.strictEqual(registerResult, false, 'register() must return false for malformed challenge');
  assert.strictEqual(registry.count(), 0, 'Registry count must remain 0 after failed registration');

  console.log('PASS: Test 1 - Schema validation strictly enforces required types and rejects malformed challenges');
}

// ----------------------------------------------------------------------------
// Test 2: Library Integrity (12 Initial Challenges & Topic Coverage)
// ----------------------------------------------------------------------------
{
  assert.strictEqual(questionRegistry.count(), 12, 'Question registry must contain exactly 12 initial challenges');
  assert.strictEqual(CHALLENGES.length, 12, 'CHALLENGES dataset must contain 12 items');

  const seenIds = new Set();
  const seenTopics = new Set();
  const seenActions = new Set();

  for (const c of questionRegistry.getAll()) {
    // 1. Validate schema for every single registered challenge
    const result = questionRegistry.validateSchema(c);
    assert.strictEqual(result.valid, true, `Challenge '${c.id}' must be 100% valid schema: ${result.errors.join(', ')}`);

    // 2. No duplicate IDs
    assert.strictEqual(seenIds.has(c.id), false, `Challenge ID '${c.id}' must be unique`);
    seenIds.add(c.id);

    // 3. Track topics & actions
    seenTopics.add(c.topic);
    seenActions.add(c.unlockAction);
  }

  // Verify all 6 required topics are represented
  const requiredTopics = ['variables', 'conditionals', 'loops', 'functions', 'lists', 'debugging'];
  for (const topic of requiredTopics) {
    assert.ok(seenTopics.has(topic), `Required topic '${topic}' must be represented in library`);
  }

  // Verify all 4 combat moves are represented
  const requiredActions = ['special', 'slash', 'block', 'duck'];
  for (const act of requiredActions) {
    assert.ok(seenActions.has(act), `Unlock action '${act}' must be represented in library`);
  }

  console.log('PASS: Test 2 - Question library contains 12 verified challenges covering all 6 topics and 4 combat moves');
}

// ----------------------------------------------------------------------------
// Test 3: Deep Cloning & Mutation Isolation
// ----------------------------------------------------------------------------
{
  const c1 = questionRegistry.get('special-slam-1');
  assert.ok(c1, 'Should find special-slam-1');

  // Mutate retrieved object
  c1.title = "MUTATED_TITLE";
  c1.testCases.push({ input: "bad", args: [], expected: 999 });

  // Fetch fresh copy from registry
  const c2 = questionRegistry.get('special-slam-1');
  assert.notStrictEqual(c2.title, "MUTATED_TITLE", 'Registry must not leak internal mutations');
  assert.strictEqual(c2.testCases.length, 3, 'Registry test cases must remain pristine');

  console.log('PASS: Test 3 - Deep cloning preserves registry immutability against caller mutations');
}

// ----------------------------------------------------------------------------
// Test 4: Graceful Handling of Unknown and Malformed IDs
// ----------------------------------------------------------------------------
{
  assert.strictEqual(questionRegistry.get(null), null, 'get(null) must return null');
  assert.strictEqual(questionRegistry.get(''), null, 'get("") must return null');
  assert.strictEqual(questionRegistry.get('non_existent_challenge_xyz'), null, 'get(unknown) must return null without crashing');
  assert.strictEqual(questionRegistry.has('non_existent_challenge_xyz'), false, 'has(unknown) returns false');
  assert.strictEqual(questionRegistry.has('special-slam-1'), true, 'has(known) returns true');

  const defaultChallenge = questionRegistry.getDefault();
  assert.ok(defaultChallenge, 'getDefault() must return a valid default challenge');
  assert.strictEqual(defaultChallenge.id, 'special-slam-1', 'Default challenge must be special-slam-1');

  console.log('PASS: Test 4 - Unknown, null, and empty challenge IDs fail gracefully');
}

// ----------------------------------------------------------------------------
// Test 5: Filtering & Progressive Navigation
// ----------------------------------------------------------------------------
{
  // Filter by topic
  const listChallenges = questionRegistry.list({ topic: 'lists' });
  assert.strictEqual(listChallenges.length, 3, 'Should find 3 list challenges');
  assert.ok(listChallenges.every((c) => c.topic === 'lists'), 'All returned must have topic lists');

  // Filter by difficulty
  const intermediateChallenges = questionRegistry.list({ difficulty: 'intermediate' });
  assert.ok(intermediateChallenges.length >= 4, 'Should find intermediate challenges');
  assert.ok(intermediateChallenges.every((c) => c.difficulty === 'intermediate'));

  // Filter by unlock action
  const blockChallenges = questionRegistry.list({ unlockAction: 'block' });
  assert.strictEqual(blockChallenges.length, 4, 'Should find 4 block challenges');

  // Progressive navigation (getNext)
  const next1 = questionRegistry.getNext('special-slam-1');
  assert.strictEqual(next1.id, 'strike-power-1', 'Next challenge after special-slam-1 is strike-power-1');

  // Wrap around from last challenge
  const all = questionRegistry.getAll();
  const lastId = all[all.length - 1].id;
  const wrapped = questionRegistry.getNext(lastId);
  assert.strictEqual(wrapped.id, all[0].id, 'getNext() on last challenge wraps to first challenge');

  console.log('PASS: Test 5 - Filtering by topic/difficulty/action and progressive sequential navigation verified');
}

// ----------------------------------------------------------------------------
// Test 6: Deterministic Grading Simulation Across All 12 Challenges (No AI)
// ----------------------------------------------------------------------------
{
  /**
   * Pure JS deterministic grader that executes challenge solution functions against testCases
   */
  function evaluateDeterministic(func, testCases) {
    for (const tc of testCases) {
      const actual = func(...tc.args);
      // Strict equality comparison for primitives and arrays
      if (Array.isArray(tc.expected)) {
        assert.deepStrictEqual(actual, tc.expected, `Input ${tc.input} failed deepStrictEqual`);
      } else {
        assert.strictEqual(actual, tc.expected, `Input ${tc.input}: expected ${tc.expected}, got ${actual}`);
      }
    }
    return true;
  }

  // Challenge 1: special-slam-1
  evaluateDeterministic((power, energy) => (energy >= 10 ? power * 2 : 0), questionRegistry.get('special-slam-1').testCases);

  // Challenge 2: strike-power-1
  evaluateDeterministic((base, vel) => base + vel * 3, questionRegistry.get('strike-power-1').testCases);

  // Challenge 3: guard-defense-1
  evaluateDeterministic((dmg, isBlock) => (isBlock ? Math.floor(dmg / 2) : dmg), questionRegistry.get('guard-defense-1').testCases);

  // Challenge 4: evasion-check-1
  evaluateDeterministic((agil, spd) => agil > spd, questionRegistry.get('evasion-check-1').testCases);

  // Challenge 5: combo-counter-1
  evaluateDeterministic((hits, base) => {
    let t = 0;
    for (let h = 1; h <= hits; h++) t += base + h;
    return t;
  }, questionRegistry.get('combo-counter-1').testCases);

  // Challenge 6: stamina-recovery-1
  evaluateDeterministic((cur, max, rounds) => {
    let s = cur;
    for (let i = 0; i < rounds; i++) s = Math.min(max, s + 5);
    return s;
  }, questionRegistry.get('stamina-recovery-1').testCases);

  // Challenge 7: critical-hit-1
  evaluateDeterministic((dmg, isCrit, mult) => (isCrit ? Math.floor(dmg * mult) : dmg), questionRegistry.get('critical-hit-1').testCases);

  // Challenge 8: potion-inventory-1
  evaluateDeterministic((potions) => potions.reduce((a, b) => a + b, 0), questionRegistry.get('potion-inventory-1').testCases);

  // Challenge 9: max-threat-1
  evaluateDeterministic((powers) => (powers.length ? Math.max(...powers) : 0), questionRegistry.get('max-threat-1').testCases);

  // Challenge 10: filter-alive-1
  evaluateDeterministic((healths) => healths.filter((h) => h > 0).length, questionRegistry.get('filter-alive-1').testCases);

  // Challenge 11: debug-indent-1
  evaluateDeterministic((gauge, delta) => Math.min(100, gauge + delta), questionRegistry.get('debug-indent-1').testCases);

  // Challenge 12: debug-typo-1
  evaluateDeterministic((speed, duration) => speed * duration, questionRegistry.get('debug-typo-1').testCases);

  console.log('PASS: Test 6 - 100% of the 12 challenges passed deterministic evaluation with exact inputs and outputs');
}

// ----------------------------------------------------------------------------
// Test 7: Regression of Existing Special Slam Challenge
// ----------------------------------------------------------------------------
{
  const specialSlam = questionRegistry.get('special-slam-1');
  assert.strictEqual(specialSlam.id, 'special-slam-1');
  assert.strictEqual(specialSlam.entrypoint, 'special_attack');
  assert.strictEqual(specialSlam.unlockAction, 'special');
  assert.strictEqual(specialSlam.testCases.length, 3);
  assert.deepStrictEqual(specialSlam.testCases[0], { input: 'special_attack(8, 12)', args: [8, 12], expected: 16 });
  assert.deepStrictEqual(specialSlam.testCases[1], { input: 'special_attack(8, 5)', args: [8, 5], expected: 0 });
  assert.deepStrictEqual(specialSlam.testCases[2], { input: 'special_attack(0, 12)', args: [0, 12], expected: 0 });

  console.log('PASS: Test 7 - Special Slam challenge regression verified: entrypoint, test cases, and action identical');
}

// ----------------------------------------------------------------------------
// Test 8: ChallengeController Dynamic Loading and Switching
// ----------------------------------------------------------------------------
{
  const controller = new ChallengeController({ runner: null });
  controller.stopCountdown();

  // 1. Initial state is special-slam-1
  assert.strictEqual(controller.currentChallenge.id, 'special-slam-1');
  assert.strictEqual(controller.getCode().includes('special_attack'), true);

  // 2. Switch to strike-power-1
  const loadedStrike = controller.loadChallenge('strike-power-1');
  assert.strictEqual(loadedStrike, true, 'loadChallenge(strike-power-1) should succeed');
  assert.strictEqual(controller.currentChallenge.id, 'strike-power-1');
  assert.strictEqual(controller.currentChallenge.entrypoint, 'calc_strike');
  assert.strictEqual(controller.currentChallenge.unlockAction, 'slash');
  assert.strictEqual(controller.getCode(), controller.currentChallenge.starterCode);

  // 3. Switch to evasion-check-1
  const loadedEvasion = controller.loadChallenge('evasion-check-1');
  assert.strictEqual(loadedEvasion, true);
  assert.strictEqual(controller.currentChallenge.id, 'evasion-check-1');
  assert.strictEqual(controller.currentChallenge.unlockAction, 'duck');

  // 4. Attempt to load unknown ID -> graceful false return without crashing
  const loadedUnknown = controller.loadChallenge('non-existent-challenge-id');
  assert.strictEqual(loadedUnknown, false, 'Loading unknown challenge returns false');
  assert.strictEqual(controller.currentChallenge.id, 'evasion-check-1', 'Challenge remains unchanged on failed load');

  // 5. Attempt to load malformed object -> graceful false return
  const loadedMalformed = controller.loadChallenge({ id: "bad" });
  assert.strictEqual(loadedMalformed, false, 'Loading malformed challenge returns false');
  assert.strictEqual(controller.currentChallenge.id, 'evasion-check-1', 'Challenge remains unchanged on malformed load');

  controller.stopCountdown();
  console.log('PASS: Test 8 - ChallengeController safely loads, switches, and protects against malformed challenges');
  console.log('=== ALL 8 QUESTION LIBRARY TESTS PASSED (100% SUCCESS) ===');
}
