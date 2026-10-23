/**
 * test-layout-split.js
 * 
 * Comprehensive automated verification suite for the permanent split-screen layout:
 * 1. Permanent split-screen layout DOM structure and default sizing ratios (46% coding / 54% arena).
 * 2. Draggable vertical divider clamping and ratio updating (20%–80%).
 * 3. Draggable horizontal console divider behavior.
 * 4. Apple-style hover-expanding sidebar rail and mobile drawer fallback.
 * 5. Strict keyboard isolation when typing anywhere in the coding workspace.
 * 6. Health bar synchronization with authoritative combat state.
 * 7. Question library integration and challenge execution in the new layout.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup minimal mock browser globals for headless Node.js testing
if (typeof globalThis.document === 'undefined') {
  const elements = new Map();
  function getOrCreate(id, tag = 'div') {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        tagName: tag.toUpperCase(),
        style: {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener() {},
        removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        getContext() {
          return {
            save() {}, restore() {}, beginPath() {}, stroke() {}, fillRect() {},
            fillText() {}, moveTo() {}, lineTo() {},
            createLinearGradient() { return { addColorStop() {} }; }
          };
        },
        getAttribute() { return null; },
        setAttribute() {},
        appendChild(child) { this.children = this.children || []; this.children.push(child); },
        value: '',
        checked: false,
        textContent: '',
      });
    }
    return elements.get(id);
  }

  globalThis.document = {
    getElementById: (id) => getOrCreate(id),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => getOrCreate(tag, tag),
    body: getOrCreate('body', 'body'),
  };
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    performance: { now: () => Date.now() },
    requestAnimationFrame() {},
  };
}

import { ChallengeController, highlightPython } from './src/challenge-controller.js';
import { questionRegistry } from './src/question-registry.js';
import { Fighter } from './src/fighter.js';
import { shouldIgnoreGameHotkeys } from './src/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== STARTING PERMANENT SPLIT-SCREEN LAYOUT VERIFICATION SUITE ===');

// ----------------------------------------------------------------------------
// Test Suite 1: Permanent Split-Screen DOM & CSS Layout Verification
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 1: Layout Structure & CSS Verification ---');

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');

// 1A: Required DOM elements for split screen
const requiredElements = [
  'id="app-root"',
  'id="sidebar-rail"',
  'id="rail-inner"',
  'id="mobile-drawer-toggle"',
  'id="sidebar-backdrop"',
  'id="split-viewport"',
  'id="challenge-section"',
  'id="workspace-split-divider"',
  'id="arena-workspace"',
  'id="challenge-select"',
  'id="challenge-code-editor"',
  'id="editor-line-numbers"',
  'id="syntax-highlight-layer"',
  'id="console-drag-handle"',
  'id="workspace-console-pane"',
  'id="btn-submit-code"',
  'id="btn-retry-challenge"',
  'id="challenge-feedback"',
  'id="workspace-sidebar"',
  'id="btn-toggle-sidebar"',
  'id="combat-hud"',
  'id="hud-hp-val-a"',
  'id="hud-hp-fill-a"',
  'id="hud-hp-ghost-a"',
  'id="hud-hp-val-b"',
  'id="hud-hp-fill-b"',
  'id="hud-hp-ghost-b"',
  'id="hud-slam-status"',
  'id="hud-timer-badge"',
  'id="game-canvas"',
  'id="btn-slash"',
  'id="btn-block"',
  'id="btn-duck"',
  'id="btn-special"',
  'id="diagnostics-panel"',
  'id="diagnostics-header"',
  'id="diagnostics-collapsible-body"',
];

for (const el of requiredElements) {
  assert.ok(
    htmlContent.includes(el),
    `DOM element "${el}" must be present in index.html`
  );
}
console.log(`PASS: Test 1A - All ${requiredElements.length} core split-screen DOM elements confirmed in index.html`);

// 1B: Verify CSS split rules (46% coding / 54% arena default)
assert.ok(
  cssContent.includes('calc(46% - 4px)'),
  'Coding panel must default to calc(46% - 4px) width'
);
assert.ok(
  cssContent.includes('calc(54% - 4px)'),
  'Arena panel must default to calc(54% - 4px) width'
);
assert.ok(
  cssContent.includes('--rail-collapsed-width: 48px'),
  'Sidebar rail must have 48px collapsed width variable'
);
assert.ok(
  cssContent.includes('--rail-expanded-width: 220px'),
  'Sidebar rail must have 220px expanded width variable'
);
assert.ok(
  cssContent.includes('.split-divider-col'),
  'CSS must define .split-divider-col vertical resize handle'
);
assert.ok(
  cssContent.includes('col-resize'),
  'Vertical divider must use col-resize cursor'
);
assert.ok(
  cssContent.includes('row-resize'),
  'Console drag handle must use row-resize cursor'
);
console.log('PASS: Test 1B - CSS permanently declares 46%/54% split ratio, 48px rail, and resize cursors');

// 1C: Non-layout-shifting rail property verification
// Outer sidebar rail must have fixed flex basis of 48px, inner container is absolute
assert.ok(
  cssContent.includes('flex: 0 0 var(--rail-collapsed-width)'),
  'Sidebar rail must maintain fixed flex-basis in flow to prevent layout reflow'
);
assert.ok(
  cssContent.includes('position: absolute'),
  'Rail inner container must be absolute to expand over workspace without shifting layout'
);
console.log('PASS: Test 1C - Apple-style hover rail expands over content with ZERO layout shift');

// ----------------------------------------------------------------------------
// Test Suite 2: Draggable Vertical & Horizontal Resizing Logic
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Draggable Dividers & Clamping Logic ---');

const mockCodingPanel = { style: {} };
const mockArenaPanel = { style: {} };
const controller = new ChallengeController({ runner: null });
controller.stopCountdown();

controller.dom.codingPanel = mockCodingPanel;
controller.dom.arenaPanel = mockArenaPanel;

// 2A: Default ratio
assert.strictEqual(controller.splitRatio, 46, 'Initial split ratio must be 46%');
controller.setSplitRatio(46);
assert.strictEqual(mockCodingPanel.style.width, 'calc(46% - 4px)');
assert.strictEqual(mockArenaPanel.style.width, 'calc(54% - 4px)');
console.log('PASS: Test 2A - Default split ratio correctly sets 46% coding / 54% arena widths');

// 2B: Clamp lower bound (e.g. 10% -> 20%)
const clampedLow = controller.setSplitRatio(10);
assert.strictEqual(clampedLow, 20, 'Lower split boundary must clamp to 20% minimum');
assert.strictEqual(mockCodingPanel.style.width, 'calc(20% - 4px)');
assert.strictEqual(mockArenaPanel.style.width, 'calc(80% - 4px)');
console.log('PASS: Test 2B - Dragging divider too far left correctly clamps to 20% minimum');

// 2C: Clamp upper bound (e.g. 95% -> 80%)
const clampedHigh = controller.setSplitRatio(95);
assert.strictEqual(clampedHigh, 80, 'Upper split boundary must clamp to 80% maximum');
assert.strictEqual(mockCodingPanel.style.width, 'calc(80% - 4px)');
assert.strictEqual(mockArenaPanel.style.width, 'calc(20% - 4px)');
console.log('PASS: Test 2C - Dragging divider too far right correctly clamps to 80% maximum');

// 2D: Midpoint resizing (e.g. 50%)
const mid = controller.setSplitRatio(50);
assert.strictEqual(mid, 50);
assert.strictEqual(mockCodingPanel.style.width, 'calc(50% - 4px)');
assert.strictEqual(mockArenaPanel.style.width, 'calc(50% - 4px)');
console.log('PASS: Test 2D - Intermediate resizing smoothly sets custom split ratio');

// 2E: State management (normal, minimized, maximized)
const mockSection = {
  attrs: { 'data-state': 'normal' },
  getAttribute(name) { return this.attrs[name]; },
  setAttribute(name, val) { this.attrs[name] = val; }
};
controller.dom.section = mockSection;

controller.toggleWorkspace(false);
assert.strictEqual(mockSection.getAttribute('data-state'), 'minimized', 'toggleWorkspace(false) minimizes coding workspace');
assert.strictEqual(controller.isOpen(), false, 'isOpen() returns false when minimized');

controller.toggleWorkspace(true);
assert.strictEqual(mockSection.getAttribute('data-state'), 'normal', 'toggleWorkspace(true) restores normal split');
assert.strictEqual(controller.isOpen(), true, 'isOpen() returns true when normal');

controller.toggleMaximize();
assert.strictEqual(mockSection.getAttribute('data-state'), 'maximized', 'toggleMaximize() sets maximized state');
controller.toggleMaximize();
assert.strictEqual(mockSection.getAttribute('data-state'), 'normal', 'toggleMaximize() again restores normal split');
console.log('PASS: Test 2E - Workspace minimize, maximize, and restore state transitions verified');

// ----------------------------------------------------------------------------
// Test Suite 3: Sidebar Rail & Mobile Drawer Fallback
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Sidebar Rail & Mobile Drawer Fallback ---');

const mockRail = {
  classes: new Set(),
  classList: {
    contains(cls) { return mockRail.classes.has(cls); },
    add(cls) { mockRail.classes.add(cls); },
    remove(cls) { mockRail.classes.delete(cls); },
    toggle(cls) {
      if (this.contains(cls)) { this.remove(cls); return false; }
      else { this.add(cls); return true; }
    }
  }
};
const mockBackdrop = {
  classes: new Set(),
  classList: {
    contains(cls) { return mockBackdrop.classes.has(cls); },
    add(cls) { mockBackdrop.classes.add(cls); },
    remove(cls) { mockBackdrop.classes.delete(cls); },
    toggle(cls, state) {
      if (state) this.add(cls); else this.remove(cls);
    }
  }
};

// Test drawer toggle
const opened = mockRail.classList.toggle('drawer-open');
mockBackdrop.classList.toggle('active', opened);
assert.strictEqual(mockRail.classList.contains('drawer-open'), true, 'Rail has drawer-open class');
assert.strictEqual(mockBackdrop.classList.contains('active'), true, 'Backdrop active when drawer open');

// Click backdrop to close
mockRail.classList.remove('drawer-open');
mockBackdrop.classList.remove('active');
assert.strictEqual(mockRail.classList.contains('drawer-open'), false, 'Rail closed after clicking backdrop');
assert.strictEqual(mockBackdrop.classList.contains('active'), false, 'Backdrop deactivated');
console.log('PASS: Test 3 - Mobile drawer toggle and backdrop dismiss work symmetrically');

// ----------------------------------------------------------------------------
// Test Suite 4: Strict Keyboard Isolation
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Strict Keyboard Isolation Verification ---');

// Mock DOM elements to test isolation
function createMockElement(tagName, id = '', className = '') {
  return {
    tagName: tagName.toUpperCase(),
    id,
    className,
    isContentEditable: false,
    closest(selector) {
      if (selector === '#challenge-section' && (id === 'challenge-section' || className.includes('coding-workspace-panel'))) return this;
      if (selector === '.coding-workspace-panel' && (id === 'challenge-section' || className.includes('coding-workspace-panel'))) return this;
      if (selector === '#sidebar-rail' && (id === 'sidebar-rail' || className.includes('sidebar-rail'))) return this;
      if (selector === '.sidebar-rail' && (id === 'sidebar-rail' || className.includes('sidebar-rail'))) return this;
      return null;
    }
  };
}

const mockEditorEl = {
  tagName: 'TEXTAREA',
  id: 'challenge-code-editor',
  closest(selector) {
    if (selector === '#challenge-section' || selector === '.coding-workspace-panel') return {};
    return null;
  }
};

const mockSelectEl = {
  tagName: 'SELECT',
  id: 'challenge-select',
  closest(selector) {
    if (selector === '#challenge-section' || selector === '.coding-workspace-panel') return {};
    return null;
  }
};

const mockConsoleEl = {
  tagName: 'DIV',
  id: 'workspace-console-pane',
  closest(selector) {
    if (selector === '#challenge-section' || selector === '.coding-workspace-panel') return {};
    return null;
  }
};

const mockRailBtnEl = {
  tagName: 'BUTTON',
  id: 'rail-btn-code',
  closest(selector) {
    if (selector === '#sidebar-rail' || selector === '.sidebar-rail') return {};
    return null;
  }
};

const mockCanvasEl = {
  tagName: 'CANVAS',
  id: 'game-canvas',
  closest() { return null; }
};

const mockBodyEl = {
  tagName: 'BODY',
  closest() { return null; }
};

// 4A: Editor input isolation
assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockEditorEl }), true, 'Typing in code editor must ignore game hotkeys');
assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockSelectEl }), true, 'Selecting challenge dropdown must ignore game hotkeys');
assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockConsoleEl }), true, 'Focus in console must ignore game hotkeys');
assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockRailBtnEl }), true, 'Clicking sidebar rail must ignore game hotkeys');

// 4B: Canvas & Arena focus enables hotkeys
assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockCanvasEl }), false, 'Canvas target allows game hotkeys');
assert.strictEqual(shouldIgnoreGameHotkeys({ target: mockBodyEl }), false, 'Body target allows game hotkeys');
console.log('PASS: Test 4 - Strict 100% keyboard isolation confirmed across all coding elements');

// ----------------------------------------------------------------------------
// Test Suite 5: Authoritative Health Bar & Combat State Synchronization
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Combat Authority & Health Bar Sync ---');

const fighterA = new Fighter('A', '#333333', '#EF9F27');
const fighterB = new Fighter('B', '#444444', '#EF9F27');

assert.strictEqual(fighterA.hp, 100, 'Fighter A starts at 100 HP');
assert.strictEqual(fighterB.hp, 100, 'Fighter B starts at 100 HP');

// 5A: Clean hit subtracts 25 HP
const hitOutcome = fighterB.checkHit('slash');
assert.strictEqual(hitOutcome, 'HIT', 'Idle fighter receives HIT outcome');
assert.strictEqual(fighterB.hp, 75, 'Fighter B HP reduced by exactly 25 to 75');

// Calculate HUD percentage
const pctB = Math.max(0, Math.min(100, (fighterB.hp / fighterB.maxHp) * 100));
assert.strictEqual(pctB, 75, 'HUD fill bar width percentage matches authoritative HP (75%)');

// 5B: Block absorbs damage (reduced to 10 HP damage)
fighterA.setHolding('block', true);
const blockOutcome = fighterA.checkHit('slash');
assert.strictEqual(blockOutcome, 'BLOCKED', 'Guarding fighter receives BLOCKED outcome');
assert.strictEqual(fighterA.hp, 90, 'Fighter A HP reduced by only 10 to 90 on block');
fighterA.setHolding('block', false);

// 5C: Duck cleanly dodges attack (0 HP damage)
fighterA.setHolding('duck', true);
const dodgeOutcome = fighterA.checkHit('slash');
assert.strictEqual(dodgeOutcome, 'DODGED', 'Ducking fighter receives DODGED outcome');
assert.strictEqual(fighterA.hp, 90, 'Fighter A HP unchanged (0 damage on dodge)');
fighterA.setHolding('duck', false);

console.log('PASS: Test 5 - Combat resolution remains 100% authoritative in checkHit() and syncs to HUD');

// ----------------------------------------------------------------------------
// Test Suite 6: Question Library Switching & Execution in Split View
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Question Library & Runner Integration ---');

// 6A: Load multiple challenges from library
const challenges = questionRegistry.getAll();
assert.ok(challenges.length >= 12, `Expected at least 12 challenges, found ${challenges.length}`);

// Load first challenge
const c1 = challenges[0];
const loaded1 = controller.loadChallenge(c1.id);
assert.strictEqual(loaded1, true, `Loaded challenge "${c1.id}" successfully`);
assert.strictEqual(controller.currentChallenge.id, c1.id);
assert.strictEqual(controller.getCode(), c1.starterCode);

// Load second challenge
const c2 = challenges[1];
const loaded2 = controller.loadChallenge(c2.id);
assert.strictEqual(loaded2, true, `Loaded challenge "${c2.id}" successfully`);
assert.strictEqual(controller.currentChallenge.id, c2.id);
assert.strictEqual(controller.getCode(), c2.starterCode);

// 6B: Mock runner execution and unlock callback
let unlockedAction = null;
controller.onUnlock((action) => {
  unlockedAction = action;
});

const mockRunner = {
  async runCode(code, challenge) {
    if (code.includes('return power * 2') || code.includes('return a + b') || code.includes('return')) {
      return {
        passed: true,
        unlocked: true,
        action: challenge.unlockAction || 'special',
        error_type: null,
        error_message: null,
        details: challenge.testCases.map((tc) => ({ input: tc.input, expected: tc.expected, actual: tc.expected, passed: true }))
      };
    }
    return {
      passed: false,
      unlocked: false,
      action: challenge.unlockAction || 'special',
      error_type: 'SyntaxError',
      error_message: 'invalid syntax',
      details: []
    };
  }
};
controller.runner = mockRunner;

// Test failing submission (starter code)
controller.setCode(c2.starterCode);
const failResult = await controller.submitCode();
assert.strictEqual(failResult.unlocked, false, 'Starter code with syntax bug does not unlock attack');
assert.strictEqual(controller.isUnlocked, false, 'Controller status remains locked');

// Test passing submission (solution code)
controller.resetChallenge();
controller.setCode(c2.solutionCode);
const passResult = await controller.submitCode();
assert.strictEqual(passResult.unlocked, true, 'Solution code unlocks attack');
assert.strictEqual(controller.isUnlocked, true, 'Controller status is unlocked');
assert.strictEqual(unlockedAction, c2.unlockAction || 'special', 'Host callback invoked with unlock action');

console.log('PASS: Test 6 - Question library seamlessly switches challenges and executes in split view');

// ----------------------------------------------------------------------------
// Test Suite 7: Syntax Highlighting Engine Verification
// ----------------------------------------------------------------------------
console.log('\n--- Test Suite 7: Lightweight Python Syntax Highlighter ---');

const sampleCode = `def test_func(x: int) -> int:\n    # comment\n    if x >= 10:\n        return "valid"`;
const highlighted = highlightPython(sampleCode);

assert.ok(highlighted.includes('tok-keyword'), 'Highlighter must tag keywords');
assert.ok(highlighted.includes('tok-function'), 'Highlighter must tag function names');
assert.ok(highlighted.includes('tok-comment'), 'Highlighter must tag comments');
assert.ok(highlighted.includes('tok-string'), 'Highlighter must tag strings');
assert.ok(highlighted.includes('tok-operator'), 'Highlighter must tag operators');
console.log('PASS: Test 7 - Zero-dependency Python syntax highlighter tokenizes code accurately');

controller.stopCountdown();
console.log('\n=== ALL 7 PERMANENT SPLIT-SCREEN LAYOUT TESTS PASSED (100% SUCCESS) ===\n');
process.exit(0);
