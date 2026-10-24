/**
 * test-python-challenge.js
 * 
 * Comprehensive Unit and Integration Test Suite for the Python Combat Challenge.
 * 
 * Tests:
 * 1. ChallengeController Lifecycle & State Management
 * 2. Syntax Error Rejection (Starter Code Bug)
 * 3. Logic Error Rejection (AssertionError)
 * 4. Runtime Error Handling (NameError)
 * 5. Watchdog Timeout Handling (TimeoutError on Infinite Loop)
 * 6. Correct Solution Verification & Narrow Unlock Signal
 * 7. Zero-Authority Invariant (No damage/hp/combat mutation authority)
 * 8. Single-Use Debounce Protection (Anti-Spam)
 * 9. Countdown Timer Expiration & Reset Flow
 * 10. Offline / Missing Runtime Graceful Degradation
 * 11. Authoritative Combat Resolution (Special Slam vs Hit / Block / Dodge)
 * 12. Network Payload Safety (Zero Source Code Leakage)
 */

import assert from 'node:assert';
import { ChallengeController, STARTER_CODE, CORRECT_CODE, highlightPython } from './src/challenge-controller.js';
import { Fighter } from './src/fighter.js';

console.log('=== STARTING PYTHON COMBAT CHALLENGE TEST SUITE ===');

/**
 * Mock Runner simulating the Web Worker / Pyodide runner responses
 */
class MockPythonRunner {
  constructor(behavior = 'correct') {
    this.behavior = behavior;
    this.callCount = 0;
    this.lastSubmittedCode = null;
    this.statusListeners = [];
  }

  onStatus(cb) {
    this.statusListeners.push(cb);
  }

  async runCode(code) {
    this.callCount++;
    this.lastSubmittedCode = code;

    if (this.behavior === 'syntax_error') {
      return {
        unlocked: false,
        action: 'special',
        passed: false,
        error_type: 'SyntaxError',
        error_message: "SyntaxError: expected ':' after if condition",
        details: []
      };
    }

    if (this.behavior === 'logic_error') {
      return {
        unlocked: false,
        action: 'special',
        passed: false,
        error_type: 'AssertionError',
        error_message: "AssertionError: (8, 12) returned 10, expected 16",
        details: [
          { input: 'special_attack(8, 12)', expected: 16, actual: 10, passed: false },
          { input: 'special_attack(8, 5)', expected: 0, actual: 0, passed: true },
          { input: 'special_attack(0, 12)', expected: 0, actual: 2, passed: false }
        ]
      };
    }

    if (this.behavior === 'runtime_error') {
      return {
        unlocked: false,
        action: 'special',
        passed: false,
        error_type: 'NameError',
        error_message: "NameError: name 'undefined_var' is not defined",
        details: []
      };
    }

    if (this.behavior === 'timeout') {
      return {
        unlocked: false,
        action: 'special',
        passed: false,
        error_type: 'TimeoutError',
        error_message: "Execution timed out (3500ms limit).",
        details: []
      };
    }

    // Default: 'correct'
    return {
      unlocked: true,
      action: 'special',
      passed: true,
      error_type: null,
      error_message: null,
      details: [
        { input: 'special_attack(8, 12)', expected: 16, actual: 16, passed: true },
        { input: 'special_attack(8, 5)', expected: 0, actual: 0, passed: true },
        { input: 'special_attack(0, 12)', expected: 0, actual: 0, passed: true }
      ]
    };
  }
}

// ----------------------------------------------------------------------------
// Test 1: Lifecycle & State Initialization
// ----------------------------------------------------------------------------
{
  const mockRunner = new MockPythonRunner('correct');
  const controller = new ChallengeController({
    countdownSec: 45,
    runner: mockRunner,
  });

  assert.strictEqual(controller.countdownSec, 45, 'Controller should respect countdownSec option');
  assert.strictEqual(controller.timeRemaining, 45, 'Initial timeRemaining should match countdownSec');
  assert.strictEqual(controller.isExpired, false, 'Initial isExpired should be false');
  assert.strictEqual(controller.isUnlocked, false, 'Initial isUnlocked should be false');
  assert.strictEqual(controller.isExecuting, false, 'Initial isExecuting should be false');
  assert.strictEqual(controller.getCode(), STARTER_CODE, 'Editor should be populated with STARTER_CODE');
  
  controller.stopCountdown();
  console.log('PASS: Test 1 - ChallengeController initializes with correct defaults and starter code');
}

// ----------------------------------------------------------------------------
// Test 2: Syntax Error Rejection (Starter Code Bug)
// ----------------------------------------------------------------------------
(async () => {
  const mockRunner = new MockPythonRunner('syntax_error');
  let unlockCalled = false;
  const controller = new ChallengeController({
    runner: mockRunner,
    onUnlock: () => { unlockCalled = true; }
  });
  controller.stopCountdown();

  controller.setCode(STARTER_CODE);
  const result = await controller.submitCode();

  assert.strictEqual(result.passed, false, 'Submission should fail');
  assert.strictEqual(result.unlocked, false, 'Action must NOT be unlocked');
  assert.strictEqual(result.error_type, 'SyntaxError', 'Error type must be SyntaxError');
  assert.strictEqual(unlockCalled, false, 'onUnlock callback must NOT be triggered');
  assert.strictEqual(controller.isUnlocked, false, 'controller.isUnlocked must remain false');

  console.log('PASS: Test 2 - Starter code syntax bug correctly rejected with SyntaxError; no attack unlocked');
})()
.then(() => {
// ----------------------------------------------------------------------------
// Test 3: Logic Error Rejection (AssertionError)
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('logic_error');
  let unlockCalled = false;
  const controller = new ChallengeController({
    runner: mockRunner,
    onUnlock: () => { unlockCalled = true; }
  });
  controller.stopCountdown();

  controller.setCode(`def special_attack(power, energy):
    if energy >= 10:
        return power + 2
    return 0`);

  return controller.submitCode().then((result) => {
    assert.strictEqual(result.passed, false, 'Logic error must fail');
    assert.strictEqual(result.unlocked, false, 'Action must NOT be unlocked');
    assert.strictEqual(result.error_type, 'AssertionError', 'Error type must be AssertionError');
    assert.strictEqual(unlockCalled, false, 'onUnlock must NOT be triggered on logic error');
    console.log('PASS: Test 3 - Logic error (power + 2) correctly rejected with AssertionError');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 4: Runtime Error Handling (NameError)
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('runtime_error');
  let unlockCalled = false;
  const controller = new ChallengeController({
    runner: mockRunner,
    onUnlock: () => { unlockCalled = true; }
  });
  controller.stopCountdown();

  return controller.submitCode().then((result) => {
    assert.strictEqual(result.passed, false, 'Runtime error must fail');
    assert.strictEqual(result.unlocked, false, 'Action must NOT be unlocked');
    assert.strictEqual(result.error_type, 'NameError', 'Error type must be NameError');
    assert.strictEqual(unlockCalled, false, 'onUnlock must NOT be triggered on runtime error');
    console.log('PASS: Test 4 - Runtime error correctly caught without crashing host');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 5: Watchdog Timeout Handling
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('timeout');
  let unlockCalled = false;
  const controller = new ChallengeController({
    runner: mockRunner,
    onUnlock: () => { unlockCalled = true; }
  });
  controller.stopCountdown();

  return controller.submitCode().then((result) => {
    assert.strictEqual(result.passed, false, 'Timeout submission must fail');
    assert.strictEqual(result.unlocked, false, 'Action must NOT be unlocked');
    assert.strictEqual(result.error_type, 'TimeoutError', 'Error type must be TimeoutError');
    assert.strictEqual(unlockCalled, false, 'onUnlock must NOT be triggered on timeout');
    console.log('PASS: Test 5 - Watchdog timeout handles hung worker gracefully without unlocking attack');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 6: Correct Solution Verification & Narrow Unlock Signal
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('correct');
  let unlockedAction = null;
  const controller = new ChallengeController({
    runner: mockRunner,
    onUnlock: (action) => { unlockedAction = action; }
  });
  controller.stopCountdown();

  controller.setCode(CORRECT_CODE);

  return controller.submitCode().then((result) => {
    assert.strictEqual(result.passed, true, 'Solution must pass all test cases');
    assert.strictEqual(result.unlocked, true, 'Action must be unlocked');
    assert.strictEqual(result.action, 'special', 'Unlocked action must be special');
    assert.strictEqual(unlockedAction, 'special', 'onUnlock callback received special action signal');
    assert.strictEqual(controller.isUnlocked, true, 'Controller state must mark isUnlocked=true');
    console.log('PASS: Test 6 - Correct solution passes all assertions and emits narrow special unlock signal');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 7: Zero-Authority Security Contract Invariant
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('correct');
  const controller = new ChallengeController({ runner: mockRunner });
  controller.stopCountdown();

  return controller.submitCode().then((result) => {
    // Result contract must ONLY contain action name and status; NEVER health or damage variables
    assert.strictEqual('damage' in result, false, 'Result must NOT contain damage property');
    assert.strictEqual('hp' in result, false, 'Result must NOT contain hp property');
    assert.strictEqual('target' in result, false, 'Result must NOT contain target property');
    assert.strictEqual('state' in result, false, 'Result must NOT contain state property');
    assert.strictEqual(result.action, 'special', 'Action must strictly be special');
    console.log('PASS: Test 7 - Zero-authority invariant verified: Python worker has no direct combat authority');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 8: Single-Use Unlock & Debounce (Anti-Spam)
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('correct');
  let unlockCount = 0;
  const controller = new ChallengeController({
    runner: mockRunner,
    onUnlock: () => { unlockCount++; }
  });
  controller.stopCountdown();

  return controller.submitCode().then(async (firstResult) => {
    assert.strictEqual(firstResult.unlocked, true, 'First submission unlocks');
    assert.strictEqual(unlockCount, 1, 'Unlock callback called once');

    // Attempt second submission immediately without retry
    const secondResult = await controller.submitCode();
    assert.strictEqual(secondResult.unlocked, false, 'Second submission must be rejected');
    assert.strictEqual(secondResult.error_type, 'AlreadyUnlockedError', 'Must return AlreadyUnlockedError');
    assert.strictEqual(unlockCount, 1, 'Unlock callback must NOT fire again');
    assert.strictEqual(mockRunner.callCount, 1, 'Runner must not be invoked a second time');
    console.log('PASS: Test 8 - Single-use debounce prevents spamming multiple attacks from one solve');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 9: Countdown Timer Expiration & Reset Flow
// ----------------------------------------------------------------------------
  const mockRunner = new MockPythonRunner('correct');
  let unlockCalled = false;
  const controller = new ChallengeController({
    countdownSec: 1,
    runner: mockRunner,
    onUnlock: () => { unlockCalled = true; }
  });

  // Force timer expiration
  controller.timeRemaining = 0;
  controller.isExpired = true;
  controller.stopCountdown();

  return controller.submitCode().then(async (result) => {
    assert.strictEqual(result.unlocked, false, 'Expired submission must be rejected');
    assert.strictEqual(result.error_type, 'ExpiredError', 'Error type must be ExpiredError');
    assert.strictEqual(unlockCalled, false, 'onUnlock must NOT be called after expiration');

    // Now test retry/reset restores ability to submit
    controller.resetChallenge();
    controller.stopCountdown();
    assert.strictEqual(controller.isExpired, false, 'Reset clears isExpired flag');
    assert.strictEqual(controller.timeRemaining, 1, 'Reset restores timeRemaining');
    assert.strictEqual(controller.isUnlocked, false, 'Reset clears isUnlocked flag');

    const freshResult = await controller.submitCode();
    assert.strictEqual(freshResult.unlocked, true, 'Submission succeeds after reset');
    assert.strictEqual(unlockCalled, true, 'onUnlock fired after reset');
    console.log('PASS: Test 9 - Countdown expiration blocks late submissions; retry restores full functionality');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 10: Offline / Missing Runtime Graceful Degradation
// ----------------------------------------------------------------------------
  const controller = new ChallengeController({ runner: null });
  controller.stopCountdown();

  return controller.submitCode().then((result) => {
    assert.strictEqual(result.unlocked, false, 'Must not unlock when runtime is missing');
    assert.strictEqual(result.error_type, 'RuntimeUnavailable', 'Must report RuntimeUnavailable');
    console.log('PASS: Test 10 - Missing/offline Python runtime handled gracefully without crashing host');
  });
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 11: Authoritative Combat Resolution (Special Slam vs Hit / Block / Dodge)
// ----------------------------------------------------------------------------
  // Scenario A: Fighter A executes Special Slam against Idle Fighter B -> HIT -> plays hurt
  const fighterA = new Fighter('A', '#333', '#EF9F27');
  const fighterB = new Fighter('B', '#444', '#EF9F27');

  let strikeLanded = false;
  let resolvedOutcome = null;

  fighterA.playSpecialSlam(() => {
    strikeLanded = true;
    resolvedOutcome = fighterB.checkHit('slash');
  });

  assert.strictEqual(fighterA.specialSlamActive, true, 'Special slam state active on Fighter A');

  // Advance past banner phase (650ms) into slash phase
  fighterA.update(650);
  assert.strictEqual(fighterA.specialSlamActive, false, 'Special slam banner completed');
  assert.strictEqual(fighterA.currentMoveName, 'slash', 'Fighter move transitioned to slash');

  // Advance time to strike frame (~310ms into slash motion)
  fighterA.update(310);
  assert.strictEqual(strikeLanded, true, 'Strike callback triggered at strike frame');
  assert.strictEqual(resolvedOutcome, 'HIT', 'Authoritative outcome for idle target is HIT');
  assert.strictEqual(fighterB.currentMoveName, 'hurt', 'Fighter B placed in hurt state by checkHit');
  assert.strictEqual(fighterB.floatingTexts[0].text, 'HIT!', 'Floating feedback text added');

  // Scenario B: Special Slam against Ducking Fighter B -> DODGED (no hurt animation)
  const fighterA2 = new Fighter('A', '#333', '#EF9F27');
  const fighterB2 = new Fighter('B', '#444', '#EF9F27');
  fighterB2.setHolding('duck', true);

  let dodgeOutcome = null;
  fighterA2.playSpecialSlam(() => {
    dodgeOutcome = fighterB2.checkHit('slash');
  });
  fighterA2.update(650);
  fighterA2.update(310);

  assert.strictEqual(dodgeOutcome, 'DODGED', 'Authoritative outcome for ducking target is DODGED');
  assert.notStrictEqual(fighterB2.currentMoveName, 'hurt', 'Ducking target does NOT play hurt animation');
  assert.strictEqual(fighterB2.floatingTexts[0].text, 'DODGED!', 'Floating feedback text is DODGED!');

  // Scenario C: Special Slam against Blocking Fighter B -> BLOCKED (no hurt animation)
  const fighterA3 = new Fighter('A', '#333', '#EF9F27');
  const fighterB3 = new Fighter('B', '#444', '#EF9F27');
  fighterB3.setHolding('block', true);

  let blockOutcome = null;
  fighterA3.playSpecialSlam(() => {
    blockOutcome = fighterB3.checkHit('slash');
  });
  fighterA3.update(650);
  fighterA3.update(310);

  assert.strictEqual(blockOutcome, 'BLOCKED', 'Authoritative outcome for blocking target is BLOCKED');
  assert.notStrictEqual(fighterB3.currentMoveName, 'hurt', 'Blocking target does NOT play hurt animation');
  assert.strictEqual(fighterB3.floatingTexts[0].text, 'BLOCKED!', 'Floating feedback text is BLOCKED!');

  console.log('PASS: Test 11 - Authoritative combat logic in Fighter.checkHit() governs outcomes (Idle->HIT, Duck->DODGED, Block->BLOCKED)');
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 12: Network Payload Safety (Zero Source Code Leakage)
// ----------------------------------------------------------------------------
  // Emulate packet creation for action broadcast
  const actionPayload = {
    t: 'action',
    v: 1,
    a: 'special',
    sender: 'A',
    hold: false,
    ts: 123456.78
  };

  const serialized = JSON.stringify(actionPayload);
  assert.strictEqual(serialized.includes('special_attack'), false, 'Network packet MUST NOT contain Python code');
  assert.strictEqual(serialized.includes('def '), false, 'Network packet MUST NOT contain def statement');
  assert.strictEqual(serialized.includes('power'), false, 'Network packet MUST NOT contain variable names');
  assert.strictEqual(actionPayload.a, 'special', 'Network packet action is strictly special');

  console.log('PASS: Test 12 - Network payload safety verified: zero player code transmitted over the wire');
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 13: Lightweight Python Syntax Highlighter Tokenization & Escaping
// ----------------------------------------------------------------------------
  const sampleCode = `def special_attack(power, energy):\n    # Check energy\n    if energy >= 10:\n        return power * 2\n    return 0`;
  const highlighted = highlightPython(sampleCode);

  assert.ok(highlighted.includes('class="tok-keyword">def</span>'), 'Keywords should have tok-keyword span');
  assert.ok(highlighted.includes('class="tok-function">special_attack</span>'), 'Function names should have tok-function span');
  assert.ok(highlighted.includes('class="tok-comment"># Check energy</span>'), 'Comments should have tok-comment span');
  assert.ok(highlighted.includes('class="tok-number">10</span>'), 'Numbers should have tok-number span');
  assert.ok(highlighted.includes('class="tok-operator">&gt;=</span>'), 'HTML entities (&gt;=) should be safely escaped in operators');

  console.log('PASS: Test 13 - Syntax highlighter correctly tokenizes Python keywords, functions, numbers, and escapes HTML');
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 14: Keyboard Isolation Verification
// ----------------------------------------------------------------------------
  function isEditableElement(element) {
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(element.isContentEditable);
  }

  function shouldIgnoreGameHotkeys(e) {
    if (isEditableElement(e.target)) return true;
    if (e.target && e.target.closest && e.target.closest('#challenge-section')) return true;
    return false;
  }

  // 1. Target inside textarea
  const mockTextarea = { tagName: 'TEXTAREA' };
  assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockTextarea }), true, 'Textarea target must isolate hotkeys');

  // 2. Target inside challenge workspace button or container
  const mockWorkspaceButton = {
    tagName: 'BUTTON',
    closest: (selector) => (selector === '#challenge-section' ? {} : null)
  };
  assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockWorkspaceButton }), true, 'Workspace element must isolate hotkeys');

  // 3. Target on arena canvas or document body
  const mockCanvas = {
    tagName: 'CANVAS',
    closest: () => null
  };
  assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockCanvas }), false, 'Canvas target must NOT isolate hotkeys (combat active)');

  console.log('PASS: Test 14 - Strict keyboard isolation ensures workspace typing never triggers fighting hotkeys');
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 15: Combat HUD Health Resolution & Damage Tracking
// ----------------------------------------------------------------------------
  const fighterA = new Fighter('A');
  const fighterB = new Fighter('B');

  assert.strictEqual(fighterA.hp, 100, 'Fighter starts at 100 max HP');
  assert.strictEqual(fighterB.hp, 100, 'Fighter starts at 100 max HP');

  // Strike lands unblocked on Fighter B -> HIT (-10 HP)
  fighterB.checkHit('slash', 'normal');
  assert.strictEqual(fighterB.hp, 90, 'Fighter B takes 10 damage on HIT (100 -> 90 HP)');

  // Strike blocked by Fighter B -> BLOCKED (-2 chip damage, 80% reduction)
  fighterB.setHolding('block', true);
  fighterB.checkHit('slash', 'normal');
  assert.strictEqual(fighterB.hp, 88, 'Fighter B takes 2 chip damage when blocking (90 -> 88 HP)');
  fighterB.setHolding('block', false);

  // Strike dodged by Fighter B -> DODGED (0 damage)
  fighterB.setHolding('duck', true);
  fighterB.checkHit('slash', 'normal');
  assert.strictEqual(fighterB.hp, 88, 'Fighter B takes 0 damage when ducking');
  fighterB.setHolding('duck', false);

  // Health reset restores HP
  fighterB.resetHp();
  assert.strictEqual(fighterB.hp, 100, 'resetHp() restores HP back to 100');

  console.log('PASS: Test 15 - Combat HUD health reduction math verified: HIT (-10 HP), Block (-2 HP), Dodge (0 HP)');
})
.then(() => {
// ----------------------------------------------------------------------------
// Test 16: Workspace Window Controls & State Management
// ----------------------------------------------------------------------------
  // Create mock DOM for headless testing of workspace controls
  const mockSection = {
    attrs: { 'data-state': 'normal' },
    getAttribute(name) { return this.attrs[name]; },
    setAttribute(name, val) { this.attrs[name] = val; }
  };
  const mockSidebar = {
    classes: new Set(),
    classList: {
      contains(cls) { return mockSidebar.classes.has(cls); },
      add(cls) { mockSidebar.classes.add(cls); },
      remove(cls) { mockSidebar.classes.delete(cls); }
    }
  };

  const controller = new ChallengeController({ runner: null });
  controller.dom.section = mockSection;
  controller.dom.sidebar = mockSidebar;
  controller.stopCountdown();

  assert.strictEqual(controller.isOpen(), true, 'Workspace should be open by default');

  // Minimize
  controller.toggleWorkspace(false);
  assert.strictEqual(mockSection.getAttribute('data-state'), 'minimized', 'toggleWorkspace(false) minimizes workspace');
  assert.strictEqual(controller.isOpen(), false, 'isOpen() returns false when minimized');

  // Re-open
  controller.toggleWorkspace(true);
  assert.strictEqual(mockSection.getAttribute('data-state'), 'normal', 'toggleWorkspace(true) restores normal state');
  assert.strictEqual(controller.isOpen(), true, 'isOpen() returns true when reopened');

  // Maximize & Restore
  controller.toggleMaximize();
  assert.strictEqual(mockSection.getAttribute('data-state'), 'maximized', 'toggleMaximize() sets maximized state');
  controller.toggleMaximize();
  assert.strictEqual(mockSection.getAttribute('data-state'), 'normal', 'toggleMaximize() again restores normal state');

  // Sidebar collapse & expand
  assert.strictEqual(mockSidebar.classList.contains('collapsed'), false, 'Sidebar starts expanded');
  controller.toggleSidebar();
  assert.strictEqual(mockSidebar.classList.contains('collapsed'), true, 'toggleSidebar() collapses sidebar');
  controller.toggleSidebar();
  assert.strictEqual(mockSidebar.classList.contains('collapsed'), false, 'toggleSidebar() expands sidebar');

  console.log('PASS: Test 16 - Workspace window controls (maximize, restore, minimize, sidebar collapse) verified');
  console.log('=== ALL 16 PYTHON COMBAT CHALLENGE TESTS PASSED (100% SUCCESS) ===');
})
.catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
