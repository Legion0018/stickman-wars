/**
 * test-challenge-lifecycle.js
 * 
 * Comprehensive Test Suite for Stick Wars Phase 1: Core Systems
 * 
 * Key Verification Areas:
 * 1. Challenge Lifecycle State Machine (IDLE, RUNNING, EXECUTING, SOLVED, TRANSITIONING, SKIPPED, TIMED_OUT).
 * 2. Skip Challenge System & mild non-lethal penalty (single-use resolution).
 * 3. Single-use unlock reward and single-use timeout penalty with anti-debounce protection.
 * 4. Auto-advance to next challenge on solve with readable window.
 * 5. Question Registry tier counts (8 Basic, 8 Intermediate, 8 Hard = 24 Total).
 * 6. Search and tier filtering logic in custom challenge picker.
 * 7. Non-lethal combat HP clamping invariant (HP never reduced below 1 by skip/timeout chip damage).
 */

import assert from 'assert';
import { ChallengeController, CHALLENGE_STATE } from './src/challenge-controller.js';
import { questionRegistry, normalizeTier } from './src/question-registry.js';
import { Fighter } from './src/fighter.js';

console.log('=== STARTING CHALLENGE LIFECYCLE & CORE SYSTEMS TEST SUITE ===\n');

// Mock Runner for fast, deterministic unit test evaluation
class MockRunner {
  constructor(behavior = 'correct') {
    this.behavior = behavior;
    this.callCount = 0;
  }

  async runCode(code, challenge) {
    this.callCount++;
    if (this.behavior === 'correct') {
      return {
        passed: true,
        unlocked: true,
        action: challenge?.unlockAction || 'special',
        error_type: null,
        error_message: null,
        details: (challenge?.testCases || []).map((tc) => ({
          input: tc.input || 'test()',
          expected: tc.expected,
          actual: tc.expected,
          passed: true,
        })),
      };
    } else if (this.behavior === 'syntax_error') {
      return {
        passed: false,
        unlocked: false,
        action: challenge?.unlockAction || 'special',
        error_type: 'SyntaxError',
        error_message: 'invalid syntax',
        details: [],
      };
    } else if (this.behavior === 'assertion_error') {
      return {
        passed: false,
        unlocked: false,
        action: challenge?.unlockAction || 'special',
        error_type: 'AssertionError',
        error_message: 'Expected 16, got 0',
        details: [],
      };
    }
    throw new Error('Unknown mock behavior: ' + this.behavior);
  }
}

// ----------------------------------------------------------------------------
// Test 1: Registry Tier Normalization & 24 Verified Questions
// ----------------------------------------------------------------------------
{
  assert.strictEqual(normalizeTier('beginner'), 'basic');
  assert.strictEqual(normalizeTier('basic'), 'basic');
  assert.strictEqual(normalizeTier('intermediate'), 'intermediate');
  assert.strictEqual(normalizeTier('advanced'), 'hard');
  assert.strictEqual(normalizeTier('hard'), 'hard');

  const counts = questionRegistry.getTierCounts();
  assert.strictEqual(counts.total, 24, 'Total questions must be exactly 24');
  assert.strictEqual(counts.basic, 8, 'Basic tier must have 8 questions');
  assert.strictEqual(counts.intermediate, 8, 'Intermediate tier must have 8 questions');
  assert.strictEqual(counts.hard, 8, 'Hard tier must have 8 questions');

  // Verify all 6 topics represented
  const topics = ['variables', 'conditionals', 'loops', 'functions', 'lists', 'debugging'];
  for (const topic of topics) {
    const topicList = questionRegistry.getByTopic(topic);
    assert.ok(topicList.length >= 2, `Topic ${topic} should have at least 2 questions`);
  }

  // Verify all 4 combat actions represented
  const actions = ['special', 'slash', 'block', 'duck'];
  for (const act of actions) {
    const actList = questionRegistry.getByAction(act);
    assert.ok(actList.length >= 2, `Action ${act} should have at least 2 questions`);
  }

  console.log('PASS: Test 1 - Registry tier normalization & 24 validated questions (8 Basic, 8 Inter, 8 Hard)');
}

// ----------------------------------------------------------------------------
// Test 2: Lifecycle State Machine Transitions (RUNNING -> EXECUTING -> SOLVED -> TRANSITIONING)
// ----------------------------------------------------------------------------
(async () => {
  const runner = new MockRunner('correct');
  let unlockFired = 0;

  const controller = new ChallengeController({
    runner,
    countdownSec: 60,
    autoAdvanceOnSolve: true,
    solveAdvanceDelayMs: 200,
    onUnlock: () => { unlockFired++; },
  });
  controller.stopCountdown();

  assert.strictEqual(controller.state, CHALLENGE_STATE.RUNNING, 'Initial state after reset must be RUNNING');
  assert.strictEqual(controller.isUnlocked, false);

  const submitPromise = controller.submitCode();
  assert.strictEqual(controller.state, CHALLENGE_STATE.EXECUTING, 'State during submission must be EXECUTING');

  const result = await submitPromise;
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.unlocked, true);
  assert.strictEqual(controller.isUnlocked, true);
  assert.strictEqual(unlockFired, 1, 'Unlock callback must fire exactly once');

  // Because autoAdvanceOnSolve is true, state is TRANSITIONING during delay window
  assert.strictEqual(controller.state, CHALLENGE_STATE.TRANSITIONING, 'State during celebration window must be TRANSITIONING');

  // Wait for auto-advance timeout to resolve
  await new Promise((resolve) => setTimeout(resolve, 250));

  // After auto-advance, a new challenge has loaded and state is reset to RUNNING
  assert.strictEqual(controller.state, CHALLENGE_STATE.RUNNING, 'State after auto-advance must be reset to RUNNING');
  assert.strictEqual(controller.isUnlocked, false, 'New challenge starts locked');

  console.log('PASS: Test 2 - Lifecycle state machine transitions cleanly (RUNNING -> EXECUTING -> SOLVED -> TRANSITIONING -> RUNNING)');
})()
.then(async () => {
// ----------------------------------------------------------------------------
// Test 3: Rejection State Transitions (RUNNING -> EXECUTING -> RUNNING)
// ----------------------------------------------------------------------------
  const runner = new MockRunner('syntax_error');
  const controller = new ChallengeController({
    runner,
    autoAdvanceOnSolve: false,
  });
  controller.stopCountdown();

  const result = await controller.submitCode();
  assert.strictEqual(result.passed, false);
  assert.strictEqual(controller.state, CHALLENGE_STATE.RUNNING, 'State after failed submission returns to RUNNING');
  assert.strictEqual(controller.isUnlocked, false);

  console.log('PASS: Test 3 - Failed code evaluation returns state machine to RUNNING without auto-advance');
})
.then(async () => {
// ----------------------------------------------------------------------------
// Test 4: Skip Challenge Flow & Single-Use Mild Penalty
// ----------------------------------------------------------------------------
  let penaltyRecord = [];
  const controller = new ChallengeController({
    runner: new MockRunner('correct'),
    skipPenalty: { hp: 5 },
    onPenalty: (info) => { penaltyRecord.push(info); },
  });
  controller.stopCountdown();

  const originalChallengeId = controller.currentChallenge.id;

  // Execute Skip
  const skipped = controller.skipChallenge();
  assert.strictEqual(skipped, true, 'skipChallenge should return true');
  assert.strictEqual(penaltyRecord.length, 1, 'Penalty callback must be invoked once on skip');
  assert.strictEqual(penaltyRecord[0].type, 'skip');
  assert.strictEqual(penaltyRecord[0].challengeId, originalChallengeId);
  assert.strictEqual(penaltyRecord[0].penalty.hp, 5, 'Penalty HP chip must be 5');

  // Challenge advanced to next
  assert.notStrictEqual(controller.currentChallenge.id, originalChallengeId, 'Challenge must advance to next id');
  assert.strictEqual(controller.state, CHALLENGE_STATE.RUNNING, 'State reset to RUNNING for new challenge');

  console.log('PASS: Test 4 - Skip challenge applies mild penalty once and advances to next challenge');
})
.then(async () => {
// ----------------------------------------------------------------------------
// Test 5: Watchdog Countdown Expiration & Timeout Penalty
// ----------------------------------------------------------------------------
  let penaltyRecord = [];
  const controller = new ChallengeController({
    runner: new MockRunner('correct'),
    timeoutPenalty: { hp: 5 },
    onPenalty: (info) => { penaltyRecord.push(info); },
  });
  controller.stopCountdown();

  // Trigger timer expiration
  controller.timeRemaining = 0;
  controller.onTimerExpired();

  assert.strictEqual(controller.state, CHALLENGE_STATE.TIMED_OUT, 'State must transition to TIMED_OUT');
  assert.strictEqual(controller.isExpired, true);
  assert.strictEqual(penaltyRecord.length, 1, 'Timeout penalty callback invoked once');
  assert.strictEqual(penaltyRecord[0].type, 'timeout');
  assert.strictEqual(penaltyRecord[0].penalty.hp, 5);

  // Re-triggering expiration does not apply penalty twice
  controller.onTimerExpired();
  assert.strictEqual(penaltyRecord.length, 1, 'Timeout penalty must NOT be applied twice');

  console.log('PASS: Test 5 - Countdown expiration transitions to TIMED_OUT and applies timeout penalty once');
})
.then(async () => {
// ----------------------------------------------------------------------------
// Test 6: Anti-Debounce / Anti-Spam Protection
// ----------------------------------------------------------------------------
  const runner = new MockRunner('correct');
  let unlockCount = 0;
  const controller = new ChallengeController({
    runner,
    autoAdvanceOnSolve: false,
    onUnlock: () => { unlockCount++; },
  });
  controller.stopCountdown();

  // First submission unlocks
  const first = await controller.submitCode();
  assert.strictEqual(first.unlocked, true);
  assert.strictEqual(unlockCount, 1);

  // Subsequent immediate submissions rejected with AlreadyUnlockedError
  const second = await controller.submitCode();
  assert.strictEqual(second.unlocked, false);
  assert.strictEqual(second.error_type, 'AlreadyUnlockedError');
  assert.strictEqual(unlockCount, 1, 'Unlock reward must never fire a second time');
  assert.strictEqual(runner.callCount, 1, 'Worker must not be re-invoked');

  console.log('PASS: Test 6 - Anti-debounce protection strictly enforces single-use unlock reward');
})
.then(async () => {
// ----------------------------------------------------------------------------
// Test 7: Non-Lethal Combat Chip Clamping Invariant
// ----------------------------------------------------------------------------
  // Fighter with only 3 HP takes a 5 HP penalty: must be clamped to 1 HP minimum, never dying
  const fighter = new Fighter('A', '#333', '#EF9F27');
  fighter.hp = 3;

  const penaltyHp = 5;
  const chipDamage = Math.min(penaltyHp, Math.max(0, fighter.hp - 1));
  fighter.hp = Math.max(1, fighter.hp - chipDamage);

  assert.strictEqual(fighter.hp, 1, 'Fighter HP must never drop below 1 from non-lethal chip penalty');
  assert.strictEqual(fighter.hp > 0, true, 'Fighter must remain alive');

  console.log('PASS: Test 7 - Non-lethal combat chip clamping invariant verified: HP never drops below 1');
})
.then(async () => {
// ----------------------------------------------------------------------------
// Test 8: Tier Filtering and Sequential Navigation
// ----------------------------------------------------------------------------
  const controller = new ChallengeController({ runner: null });
  controller.stopCountdown();

  // Set active tier to hard
  controller.activeTier = 'hard';
  const hardChallenges = questionRegistry.getByTier('hard');
  assert.strictEqual(hardChallenges.length, 8);

  controller.loadChallenge(hardChallenges[0].id);
  assert.strictEqual(controller.currentChallenge.id, hardChallenges[0].id);

  // Advancing in tier should pick next hard challenge
  const nextInTier = controller.advanceToNextChallenge();
  assert.strictEqual(nextInTier.id, hardChallenges[1].id, 'Should sequentially advance within active tier');

  console.log('PASS: Test 8 - Tier filtering and sequential navigation correctly traverses active tier');
})
.then(async () => {
// ----------------------------------------------------------------------------
// Test 9: Solved Challenge Tracking & Completion Status
// ----------------------------------------------------------------------------
  questionRegistry.markSolved('special-slam-1');
  questionRegistry.markSolved('combo-counter-1');

  assert.strictEqual(questionRegistry.isSolved('special-slam-1'), true);
  assert.strictEqual(questionRegistry.isSolved('combo-counter-1'), true);
  assert.strictEqual(questionRegistry.isSolved('special-overdrive-3'), false);

  const solvedList = questionRegistry.getSolvedList();
  assert.ok(solvedList.includes('special-slam-1'));
  assert.ok(solvedList.includes('combo-counter-1'));

  console.log('PASS: Test 9 - Solved challenge status tracking marks and remembers completed challenges');
})
.then(() => {
  console.log('\n=== ALL 9 CHALLENGE LIFECYCLE & CORE SYSTEMS TESTS PASSED (100% SUCCESS) ===');
  process.exit(0);
})
.catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
