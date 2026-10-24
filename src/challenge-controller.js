/**
 * src/challenge-controller.js
 *
 * Manages the Python Combat Challenge Permanent Split-Screen Workspace, Editor UX,
 * Question Selection, Draggable Dividers, Apple-Style Rail, and Host Combat Integration.
 *
 * Key Responsibilities:
 * 1. Question Registry integration: dynamic selection of challenges across topics & difficulties.
 * 2. Permanent Split-Screen layout with default 46% coding / 54% arena widths.
 * 3. Draggable vertical divider (workspace resize with 20%–80% clamping).
 * 4. Apple-style hover-expanding sidebar rail navigation without layout shifts.
 * 5. Bottom debugging & output console with draggable horizontal divider.
 * 6. Professional editor UX: Tab indentation (4 spaces), dynamic line numbers,
 *    and lightweight Python syntax highlighting overlay.
 * 7. Combat HUD synchronization: countdown timer, Special Slam locked/unlocked state.
 * 8. Single-use unlock semantics, watchdog timeout protection, and anti-spam debounce.
 * 9. Zero-Authority Invariant: Only emits narrow action signal; never calculates damage or HP directly.
 */

import { PythonSpecialAttackRunner } from '../python-poc/runner.js';
import { questionRegistry, normalizeTier } from './question-registry.js';

export const STARTER_CODE = `def special_attack(power, energy):
    if energy >= 10
        return power * 2
    return 0`;

export const CORRECT_CODE = `def special_attack(power, energy):
    if energy >= 10:
        return power * 2
    return 0`;

/**
 * Challenge lifecycle state machine enumeration
 */
export const CHALLENGE_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  EXECUTING: 'executing',
  SOLVED: 'solved',
  TRANSITIONING: 'transitioning',
  SKIPPED: 'skipped',
  TIMED_OUT: 'timed_out',
};

/**
 * Lightweight, zero-dependency Python syntax highlighter for the preview layer
 * @param {string} code
 * @returns {string} escaped HTML with syntax token spans
 */
export function highlightPython(code) {
  if (!code) return '';
  const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Regex captures: comments, strings, keywords, function names, numbers, operators
  const regex = /(#.*?$)|(".*?"|'.*?')|(\b(?:def|return|if|else|elif|for|while|in|and|or|not|is|None|True|False|import|from|as|pass|break|continue|try|except|raise|class|lambda|with)\b)|(\b[a-zA-Z_]\w*(?=\s*\())|(\b\d+(?:\.\d+)?\b)|(>=|<=|==|!=|\+|\-|\*|\/|%|=|<|>)/gm;

  let lastIndex = 0;
  let match;
  let out = '';

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      out += escapeHtml(code.slice(lastIndex, match.index));
    }
    const [full, comment, string, keyword, func, number, operator] = match;
    if (comment) {
      out += `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    } else if (string) {
      out += `<span class="tok-string">${escapeHtml(string)}</span>`;
    } else if (keyword) {
      out += `<span class="tok-keyword">${escapeHtml(keyword)}</span>`;
    } else if (func) {
      out += `<span class="tok-function">${escapeHtml(func)}</span>`;
    } else if (number) {
      out += `<span class="tok-number">${escapeHtml(number)}</span>`;
    } else if (operator) {
      out += `<span class="tok-operator">${escapeHtml(operator)}</span>`;
    } else {
      out += escapeHtml(full);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < code.length) {
    out += escapeHtml(code.slice(lastIndex));
  }
  return out;
}

export class ChallengeController {
  /**
   * @param {object} [options]
   * @param {number} [options.countdownSec=60]
   * @param {Function} [options.onUnlock] - (actionName) => void
   * @param {object} [options.runner] - Optional injected runner for testing
   * @param {object} [options.runnerOptions]
   * @param {string} [options.challengeId]
   * @param {object} [options.challenge]
   */
  constructor(options = {}) {
    this.countdownSec = options.countdownSec || 60;
    this.timeRemaining = this.countdownSec;
    this.timerInterval = null;
    this.isExpired = false;
    this.isUnlocked = false;
    this.isExecuting = false;
    this.onUnlockCallback = options.onUnlock || null;
    this.splitRatio = 46; // Default: 46% coding / 54% arena

    // Phase 1: State machine, penalties, and auto-advance configuration
    this.state = CHALLENGE_STATE.IDLE;
    this.skipPenalty = options.skipPenalty !== undefined ? options.skipPenalty : { hp: 5 };
    this.timeoutPenalty = options.timeoutPenalty !== undefined ? options.timeoutPenalty : { hp: 0 };
    this.onPenaltyCallback = options.onPenalty || null;
    this.autoAdvanceOnSolve = options.autoAdvanceOnSolve !== undefined ? options.autoAdvanceOnSolve : true;
    this.solveAdvanceDelayMs = options.solveAdvanceDelayMs !== undefined ? options.solveAdvanceDelayMs : 1500;
    this._advanceTimeoutId = null;
    this._penaltyApplied = false;
    this._rewardGranted = false;
    this.activeTier = options.activeTier || 'all';
    this.searchQuery = '';
    this.solvedChallenges = new Set();

    // Resolve initial challenge
    const initialChallenge = options.challenge ||
      questionRegistry.get(options.challengeId || 'special-slam-1') ||
      questionRegistry.getDefault();

    this.currentChallenge = initialChallenge;

    // Use injected runner or instantiate PythonSpecialAttackRunner
    if (options.runner) {
      this.runner = options.runner;
    } else {
      const runnerOpts = options.runnerOptions || {
        workerUrl: './python-poc/worker.js',
        timeoutMs: 3500,
      };
      if (typeof Worker !== 'undefined') {
        this.runner = new PythonSpecialAttackRunner(runnerOpts);
      } else {
        this.runner = null; // Headless / unsupported environment
      }
    }

    // Cache DOM elements if running in browser
    const hasDoc = typeof document !== 'undefined';
    this.dom = {
      section: hasDoc ? document.getElementById('challenge-section') : null,
      editor: hasDoc ? document.getElementById('challenge-code-editor') : null,
      submitBtn: hasDoc ? document.getElementById('btn-submit-code') : null,
      retryBtn: hasDoc ? document.getElementById('btn-retry-challenge') : null,
      btnSkip: hasDoc ? document.getElementById('btn-code-skip') : null,
      feedback: hasDoc ? document.getElementById('challenge-feedback') : null,
      timer: hasDoc ? document.getElementById('challenge-timer') : null,
      badge: hasDoc ? document.getElementById('challenge-status-badge') : null,
      btnStarter: hasDoc ? document.getElementById('btn-code-starter') : null,
      btnSolution: hasDoc ? document.getElementById('btn-code-solution') : null,
      btnReset: hasDoc ? document.getElementById('btn-code-reset') : null,
      tc1: hasDoc ? document.getElementById('tc-1') : null,
      tc2: hasDoc ? document.getElementById('tc-2') : null,
      tc3: hasDoc ? document.getElementById('tc-3') : null,

      // Upgraded Workspace & Layout Controls
      sidebar: hasDoc ? document.getElementById('workspace-sidebar') : null,
      btnToggleSidebar: hasDoc ? document.getElementById('btn-toggle-sidebar') : null,
      btnCloseSidebar: hasDoc ? document.getElementById('btn-close-sidebar') : null,
      btnMaximize: hasDoc ? document.getElementById('btn-workspace-maximize') : null,
      btnMinimize: hasDoc ? document.getElementById('btn-workspace-minimize') : null,
      btnToggleWorkspace: hasDoc ? document.getElementById('btn-toggle-workspace') : null,
      consoleHandle: hasDoc ? document.getElementById('console-drag-handle') : null,
      consolePane: hasDoc ? document.getElementById('workspace-console-pane') : null,
      lineNumbers: hasDoc ? document.getElementById('editor-line-numbers') : null,
      highlightLayer: hasDoc ? document.getElementById('syntax-highlight-layer') : null,
      hudSlamStatus: hasDoc ? document.getElementById('hud-slam-status') : null,
      hudTimerBadge: hasDoc ? document.getElementById('hud-timer-badge') : null,
      workspaceSlamIndicator: hasDoc ? document.getElementById('workspace-slam-indicator') : null,

      // Challenge Selection & Dynamic Header DOM
      select: hasDoc ? document.getElementById('challenge-select') : null,
      title: hasDoc ? document.querySelector('.workspace-title') : null,
      instructions: hasDoc ? document.querySelector('.briefing-card p') : null,
      signature: hasDoc ? document.querySelector('.code-signature code') : null,
      testCasesList: hasDoc ? document.querySelector('.test-cases-list') : null,

      // Permanent Split Layout & Navigation DOM
      splitDivider: hasDoc ? document.getElementById('workspace-split-divider') : null,
      splitViewport: hasDoc ? document.getElementById('split-viewport') : null,
      codingPanel: hasDoc ? document.getElementById('challenge-section') : null,
      arenaPanel: hasDoc ? document.getElementById('arena-workspace') : null,
      sidebarRail: hasDoc ? document.getElementById('sidebar-rail') : null,
      mobileDrawerToggle: hasDoc ? document.getElementById('mobile-drawer-toggle') : null,
      sidebarBackdrop: hasDoc ? document.getElementById('sidebar-backdrop') : null,
      railBtnArena: hasDoc ? document.getElementById('rail-btn-arena') : null,
      railBtnCode: hasDoc ? document.getElementById('rail-btn-code') : null,
      railBtnBriefing: hasDoc ? document.getElementById('rail-btn-briefing') : null,
      railBtnTelemetry: hasDoc ? document.getElementById('rail-btn-telemetry') : null,
      tabBtnCode: hasDoc ? document.getElementById('tab-btn-code') : null,
      tabBtnArena: hasDoc ? document.getElementById('tab-btn-arena') : null,
      viewportTabBar: hasDoc ? document.getElementById('viewport-tab-bar') : null,

      // Custom Game-Native Challenge Selector DOM
      customPicker: hasDoc ? document.getElementById('custom-challenge-picker') : null,
      pickerTrigger: hasDoc ? document.getElementById('challenge-picker-trigger') : null,
      pickerMenu: hasDoc ? document.getElementById('challenge-picker-menu') : null,
      pickerTitle: hasDoc ? document.getElementById('picker-current-title') : null,
      pickerDiff: hasDoc ? document.getElementById('picker-current-diff') : null,
      pickerChevron: hasDoc ? document.getElementById('picker-chevron') : null,
      pickerOptionsContainer: null,
      pickerSearchInput: null,
    };

    this.pickerOpen = false;
    this.pickerOptionElements = [];
    this.highlightedOptionIndex = -1;

    this.code = this.currentChallenge ? this.currentChallenge.starterCode : STARTER_CODE;
    this.populateChallengeSelector();
    this.bindEvents();
    this.initCustomPicker();
    this.initEditorEnhancements();
    this.initConsoleResize();
    this.initSplitResize();
    this.initSidebarRail();
    this.initMobileTabs();
    this.updateChallengeUI();
    this.resetChallenge();
  }

  /**
   * Populate question selector: native hidden select + custom grouped listbox
   */
  populateChallengeSelector() {
    const challenges = questionRegistry.getAll();

    // 1. Native select for backwards compatibility with tests and form submissions
    if (this.dom.select) {
      this.dom.select.innerHTML = '';
      for (const c of challenges) {
        const opt = document.createElement('option');
        opt.value = c.id;
        const normTier = normalizeTier(c.difficulty);
        const diffTag = normTier.toUpperCase();
        opt.textContent = `[${diffTag}] ${c.title}`;
        if (this.currentChallenge && this.currentChallenge.id === c.id) {
          opt.selected = true;
        }
        this.dom.select.appendChild(opt);
      }
    }

    // 2. Custom game-native listbox menu with category grouping, tier tabs, and search
    if (this.dom.pickerMenu) {
      this.dom.pickerMenu.innerHTML = '';
      const counts = questionRegistry.getTierCounts();

      // Header controls: Search & Tier filter tabs
      const headerControls = document.createElement('div');
      headerControls.className = 'picker-header-controls';
      headerControls.innerHTML = `
        <div class="picker-search-box">
          <span class="picker-search-icon" aria-hidden="true">🔍</span>
          <input type="text"
                 id="picker-search-input"
                 class="picker-search-input"
                 placeholder="Search challenges..."
                 value="${this.searchQuery || ''}"
                 aria-label="Filter challenges by title, topic, or id"
                 autocomplete="off"
                 spellcheck="false" />
        </div>
        <div class="picker-tier-tabs" role="tablist" aria-label="Filter by tier">
          <button type="button" class="tier-tab-btn ${this.activeTier === 'all' ? 'active' : ''}" data-tier="all">All (${counts.total})</button>
          <button type="button" class="tier-tab-btn ${this.activeTier === 'basic' ? 'active' : ''}" data-tier="basic">Basic (${counts.basic})</button>
          <button type="button" class="tier-tab-btn ${this.activeTier === 'intermediate' ? 'active' : ''}" data-tier="intermediate">Inter (${counts.intermediate})</button>
          <button type="button" class="tier-tab-btn ${this.activeTier === 'hard' ? 'active' : ''}" data-tier="hard">Hard (${counts.hard})</button>
        </div>
      `;

      this.dom.pickerMenu.appendChild(headerControls);

      const searchInput = headerControls.querySelector('#picker-search-input');
      this.dom.pickerSearchInput = searchInput;
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = (e.target.value || '').trim().toLowerCase();
          this.renderPickerOptions();
        });
        searchInput.addEventListener('click', (e) => e.stopPropagation());
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.pickerOptionElements.length > 0) {
              this.highlightOptionByIndex(0);
              if (typeof this.pickerOptionElements[0].focus === 'function') {
                this.pickerOptionElements[0].focus();
              }
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.closePicker();
            if (this.dom.pickerTrigger && typeof this.dom.pickerTrigger.focus === 'function') {
              this.dom.pickerTrigger.focus();
            }
          }
        });
      }

      const tierButtons = headerControls.querySelectorAll('.tier-tab-btn');
      tierButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tier = btn.getAttribute('data-tier') || 'all';
          this.activeTier = tier;
          tierButtons.forEach((b) => b.classList.toggle('active', b === btn));
          this.renderPickerOptions();
        });
      });

      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'picker-options-list';
      optionsContainer.id = 'picker-options-list';
      this.dom.pickerOptionsContainer = optionsContainer;
      this.dom.pickerMenu.appendChild(optionsContainer);

      this.renderPickerOptions();
    }
  }

  /**
   * Render challenge items inside the custom picker based on activeTier and searchQuery
   */
  renderPickerOptions() {
    if (!this.dom.pickerOptionsContainer) return;
    const container = this.dom.pickerOptionsContainer;
    container.innerHTML = '';
    this.pickerOptionElements = [];

    let challenges = this.activeTier === 'all'
      ? questionRegistry.getAll()
      : questionRegistry.getByTier(this.activeTier);

    if (this.searchQuery) {
      const q = this.searchQuery;
      challenges = challenges.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.unlockAction.toLowerCase().includes(q) ||
        (c.instructions && c.instructions.toLowerCase().includes(q))
      );
    }

    if (challenges.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'picker-empty-message';
      emptyEl.textContent = 'No challenges match your filter.';
      container.appendChild(emptyEl);
      return;
    }

    const TOPIC_CONFIG = {
      conditionals: { label: 'Conditionals & Branching', icon: '🔀' },
      variables: { label: 'Variables & Kinetics', icon: '💡' },
      loops: { label: 'Loops & Accumulators', icon: '🔁' },
      functions: { label: 'Functions & Logic', icon: '⚙️' },
      lists: { label: 'Lists & Inventories', icon: '📦' },
      debugging: { label: 'Syntax & Bug Fixes', icon: '🐛' },
    };

    const ACTION_ICONS = {
      special: '⚡',
      slash: '🗡️',
      block: '🛡️',
      duck: '💨',
    };

    const topicOrder = ['conditionals', 'variables', 'loops', 'functions', 'lists', 'debugging'];

    for (const topic of topicOrder) {
      const groupChallenges = challenges.filter((c) => c.topic === topic);
      if (!groupChallenges.length) continue;

      const topicMeta = TOPIC_CONFIG[topic] || { label: topic.toUpperCase(), icon: '⚔️' };

      const groupEl = document.createElement('div');
      groupEl.className = 'picker-group';
      groupEl.setAttribute('role', 'group');
      groupEl.setAttribute('aria-label', topicMeta.label);

      const headerEl = document.createElement('div');
      headerEl.className = 'picker-group-header';
      headerEl.innerHTML = `
        <span class="picker-group-icon" aria-hidden="true">${topicMeta.icon}</span>
        <span class="picker-group-title">${topicMeta.label}</span>
      `;
      groupEl.appendChild(headerEl);

      for (const c of groupChallenges) {
        const isSelected = Boolean(this.currentChallenge && this.currentChallenge.id === c.id);
        const isSolved = this.solvedChallenges.has(c.id) || questionRegistry.isSolved(c.id);

        const optEl = document.createElement('div');
        optEl.className = 'picker-option' + (isSelected ? ' selected' : '') + (isSolved ? ' solved' : '');
        optEl.id = `picker-opt-${c.id}`;
        optEl.setAttribute('role', 'option');
        optEl.setAttribute('data-id', c.id);
        optEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        optEl.setAttribute('tabindex', '-1');

        const actionIcon = ACTION_ICONS[c.unlockAction] || '⚔️';
        const normTier = normalizeTier(c.difficulty);
        const diffShort = normTier === 'basic' ? 'BAS' : normTier === 'intermediate' ? 'INT' : 'HRD';

        optEl.innerHTML = `
          <div class="picker-opt-main">
            <span class="picker-opt-action" title="Unlocks ${c.unlockAction}">${actionIcon}</span>
            <span class="picker-opt-title">${c.title}</span>
            ${isSolved ? '<span class="picker-solved-tag" title="Completed">✓ DONE</span>' : ''}
          </div>
          <div class="picker-opt-meta">
            <span class="picker-action-tag">${c.unlockAction}</span>
            <span class="picker-diff-badge diff-${normTier}">${diffShort}</span>
            <span class="picker-check" aria-hidden="true">${isSelected ? '✓' : ''}</span>
          </div>
        `;

        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.loadChallenge(c.id);
          this.closePicker();
          if (this.dom.pickerTrigger && typeof this.dom.pickerTrigger.focus === 'function') {
            this.dom.pickerTrigger.focus();
          }
        });

        groupEl.appendChild(optEl);
        this.pickerOptionElements.push(optEl);
      }

      container.appendChild(groupEl);
    }
  }

  /**
   * Bind UI event listeners
   */
  bindEvents() {
    if (this.dom.submitBtn) {
      this.dom.submitBtn.addEventListener('click', () => this.submitCode());
    }
    if (this.dom.retryBtn) {
      this.dom.retryBtn.addEventListener('click', () => this.resetChallenge());
    }
    if (this.dom.btnSkip) {
      this.dom.btnSkip.addEventListener('click', () => this.skipChallenge());
    }
    if (this.dom.btnStarter) {
      this.dom.btnStarter.addEventListener('click', () => {
        const code = this.currentChallenge ? this.currentChallenge.starterCode : STARTER_CODE;
        this.setCode(code);
      });
    }
    if (this.dom.btnSolution) {
      this.dom.btnSolution.addEventListener('click', () => {
        const code = this.currentChallenge ? this.currentChallenge.solutionCode : CORRECT_CODE;
        this.setCode(code);
      });
    }
    if (this.dom.btnReset) {
      this.dom.btnReset.addEventListener('click', () => this.resetChallenge());
    }

    // Challenge selector change listener
    if (this.dom.select) {
      this.dom.select.addEventListener('change', (e) => {
        this.loadChallenge(e.target.value);
      });
    }

    // Window controls
    if (this.dom.btnMaximize) {
      this.dom.btnMaximize.addEventListener('click', () => this.toggleMaximize());
    }
    if (this.dom.btnMinimize) {
      this.dom.btnMinimize.addEventListener('click', () => this.toggleWorkspace(false));
    }
    if (this.dom.btnToggleWorkspace) {
      this.dom.btnToggleWorkspace.addEventListener('click', () => this.toggleWorkspace());
    }
    if (this.dom.btnToggleSidebar) {
      this.dom.btnToggleSidebar.addEventListener('click', () => this.toggleSidebar());
    }
    if (this.dom.btnCloseSidebar) {
      this.dom.btnCloseSidebar.addEventListener('click', () => this.toggleSidebar(false));
    }

    if (this.runner && typeof this.runner.onStatus === 'function') {
      this.runner.onStatus((status, message) => {
        this.updateStatusBadge(status, message);
      });
    }
  }

  /**
   * Select and load a challenge by ID or object
   * @param {string|object} challengeOrId
   * @returns {boolean} true if loaded successfully
   */
  loadChallenge(challengeOrId) {
    if (this._advanceTimeoutId) {
      clearTimeout(this._advanceTimeoutId);
      this._advanceTimeoutId = null;
    }

    let challenge = null;
    if (typeof challengeOrId === 'string') {
      challenge = questionRegistry.get(challengeOrId);
    } else if (challengeOrId && typeof challengeOrId === 'object') {
      const check = questionRegistry.validateSchema(challengeOrId);
      if (check.valid) {
        challenge = JSON.parse(JSON.stringify(challengeOrId));
      } else {
        console.warn('Cannot load invalid challenge:', check.errors);
        return false;
      }
    }

    if (!challenge) {
      console.warn(`Challenge not found or malformed: ${challengeOrId}`);
      return false;
    }

    this.currentChallenge = challenge;
    this.updateChallengeUI();
    this.resetChallenge();
    return true;
  }

  /**
   * Synchronize DOM labels with currently loaded challenge
   */
  updateChallengeUI() {
    if (!this.currentChallenge) return;
    const c = this.currentChallenge;
    const normTier = normalizeTier(c.difficulty);
    const diffTag = normTier.toUpperCase();

    if (this.dom.title) {
      this.dom.title.textContent = c.title;
    }
    if (this.dom.badge) {
      this.dom.badge.textContent = `${c.topic.toUpperCase()} • ${diffTag}`;
    }
    if (this.dom.instructions) {
      this.dom.instructions.textContent = c.instructions;
    }
    if (this.dom.signature) {
      this.dom.signature.textContent = c.signature;
    }
    if (this.dom.select && this.dom.select.value !== c.id) {
      this.dom.select.value = c.id;
    }

    // Custom Challenge Picker updates
    if (this.dom.pickerTitle) {
      this.dom.pickerTitle.textContent = c.title;
    }
    if (this.dom.pickerDiff) {
      const diffShort = normTier === 'basic' ? 'BAS' : normTier === 'intermediate' ? 'INT' : 'HRD';
      this.dom.pickerDiff.textContent = diffShort;
      this.dom.pickerDiff.className = `picker-diff-badge diff-${normTier}`;
    }
    if (this.pickerOptionElements && this.pickerOptionElements.length) {
      for (const el of this.pickerOptionElements) {
        const isMatch = el.getAttribute('data-id') === c.id;
        el.classList.toggle('selected', isMatch);
        el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        const checkEl = el.querySelector('.picker-check');
        if (checkEl) checkEl.textContent = isMatch ? '✓' : '';
      }
    }

    // Dynamic test cases checklist
    if (this.dom.testCasesList && Array.isArray(c.testCases)) {
      this.dom.testCasesList.innerHTML = '';
      c.testCases.forEach((tc, idx) => {
        const li = document.createElement('li');
        li.id = `tc-${idx + 1}`;
        li.className = 'tc-item';
        const inputLabel = tc.input || `${c.entrypoint}(${(tc.args || []).map((a) => JSON.stringify(a)).join(', ')})`;
        li.innerHTML = `
          <div class="tc-desc">
            <span class="tc-call">${inputLabel}</span>
            <span class="tc-arrow">&rarr;</span>
            <span class="tc-exp">${JSON.stringify(tc.expected)}</span>
          </div>
          <span class="tc-status tc-pending">⏳</span>
        `;
        this.dom.testCasesList.appendChild(li);
        this.dom[`tc${idx + 1}`] = li;
      });
    }
  }

  /**
   * Initialize editor Tab indentation, line numbers, and shortcuts
   */
  initEditorEnhancements() {
    const editor = this.dom.editor;
    if (!editor) return;

    editor.addEventListener('keydown', (e) => {
      // 1. Tab indentation (4 spaces)
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;
        const tabSpaces = '    ';
        editor.value = value.substring(0, start) + tabSpaces + value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + tabSpaces.length;
        this.code = editor.value;
        this.syncEditorView();
        return;
      }

      // 2. Alt+Enter or Ctrl+Enter to Run
      if ((e.altKey && e.key === 'Enter') || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        this.submitCode();
        return;
      }

      // 3. Escape key minimizes to game
      if (e.key === 'Escape') {
        this.toggleWorkspace(false);
        return;
      }

      // 4. Alt+M toggles maximize
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        this.toggleMaximize();
        return;
      }
    });

    editor.addEventListener('input', () => {
      this.code = editor.value;
      this.syncEditorView();
    });

    editor.addEventListener('scroll', () => {
      this.syncScroll();
    });
  }

  /**
   * Synchronize scroll between textarea, line numbers gutter, and highlight layer
   */
  syncScroll() {
    const editor = this.dom.editor;
    if (!editor) return;

    if (this.dom.lineNumbers) {
      this.dom.lineNumbers.scrollTop = editor.scrollTop;
    }
    if (this.dom.highlightLayer) {
      this.dom.highlightLayer.scrollTop = editor.scrollTop;
      this.dom.highlightLayer.scrollLeft = editor.scrollLeft;
    }
  }

  /**
   * Update line numbers and syntax highlighting preview
   */
  syncEditorView() {
    const code = this.getCode();

    // 1. Line numbers
    if (this.dom.lineNumbers) {
      const lineCount = Math.max(1, code.split('\n').length);
      const lines = [];
      for (let i = 1; i <= lineCount; i++) {
        lines.push(i);
      }
      this.dom.lineNumbers.innerHTML = lines.join('<br>');
    }

    // 2. Syntax highlighting layer
    if (this.dom.highlightLayer) {
      const codeEl = this.dom.highlightLayer.querySelector('code');
      if (codeEl) {
        codeEl.innerHTML = highlightPython(code) + '\n ';
      }
    }
  }

  /**
   * Initialize draggable horizontal divider for console panel
   */
  initConsoleResize() {
    const handle = this.dom.consoleHandle;
    const consolePane = this.dom.consolePane;
    if (!handle || !consolePane) return;

    let isDragging = false;
    let startY = 0;
    let startHeight = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      startY = e.clientY;
      startHeight = consolePane.offsetHeight;
      handle.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY; // Dragging upwards increases height
      const newHeight = Math.max(70, Math.min(420, startHeight + deltaY));
      consolePane.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);
  }

  /**
   * Set split ratio between coding panel and arena panel
   * @param {number} pct - Percentage for coding panel (clamped 20% to 80%)
   * @returns {number} the applied percentage
   */
  setSplitRatio(pct) {
    const clamped = Math.max(20, Math.min(80, pct));
    this.splitRatio = clamped;

    if (this.dom.codingPanel) {
      this.dom.codingPanel.style.width = `calc(${clamped}% - 4px)`;
    }
    if (this.dom.arenaPanel) {
      this.dom.arenaPanel.style.width = `calc(${100 - clamped}% - 4px)`;
    }
    return clamped;
  }

  /**
   * Initialize draggable vertical divider between Coding Workspace and Arena
   */
  initSplitResize() {
    const divider = this.dom.splitDivider;
    const viewport = this.dom.splitViewport;
    if (!divider || !viewport) return;

    let isDragging = false;

    const onMouseDown = (e) => {
      isDragging = true;
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const rect = viewport.getBoundingClientRect();
      if (!rect.width) return;
      const relativeX = e.clientX - rect.left;
      const pct = (relativeX / rect.width) * 100;
      this.setSplitRatio(pct);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      divider.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    divider.addEventListener('mousedown', onMouseDown);

    // Touch support for tablets/hybrids
    divider.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      isDragging = true;
      divider.classList.add('dragging');
      const touch = e.touches[0];
      const onTouchMove = (te) => {
        if (!isDragging || te.touches.length !== 1) return;
        const rect = viewport.getBoundingClientRect();
        if (!rect.width) return;
        const pct = ((te.touches[0].clientX - rect.left) / rect.width) * 100;
        this.setSplitRatio(pct);
      };
      const onTouchEnd = () => {
        isDragging = false;
        divider.classList.remove('dragging');
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }, { passive: true });
  }

  /**
   * Initialize Apple-style sidebar rail and mobile drawer interactions
   */
  initSidebarRail() {
    const rail = this.dom.sidebarRail;
    const toggle = this.dom.mobileDrawerToggle;
    const backdrop = this.dom.sidebarBackdrop;

    if (toggle && rail) {
      toggle.addEventListener('click', () => {
        const isOpen = rail.classList.toggle('drawer-open');
        if (backdrop) {
          backdrop.classList.toggle('active', isOpen);
        }
      });
    }

    if (backdrop && rail) {
      backdrop.addEventListener('click', () => {
        rail.classList.remove('drawer-open');
        backdrop.classList.remove('active');
      });
    }

    if (this.dom.railBtnCode) {
      this.dom.railBtnCode.addEventListener('click', () => {
        this.toggleWorkspace(true);
        if (this.dom.editor) this.dom.editor.focus();
      });
    }

    if (this.dom.railBtnArena) {
      this.dom.railBtnArena.addEventListener('click', () => {
        const canvas = typeof document !== 'undefined' ? document.getElementById('game-canvas') : null;
        if (canvas) {
          canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof canvas.focus === 'function') canvas.focus();
        }
      });
    }

    if (this.dom.railBtnBriefing) {
      this.dom.railBtnBriefing.addEventListener('click', () => {
        this.toggleWorkspace(true);
        this.toggleSidebar(true);
      });
    }

    if (this.dom.railBtnTelemetry) {
      this.dom.railBtnTelemetry.addEventListener('click', () => {
        const diag = typeof document !== 'undefined' ? document.getElementById('diagnostics-panel') : null;
        if (diag) {
          diag.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  /**
   * Initialize responsive tab switcher for screens <= 900px
   */
  initMobileTabs() {
    const tabCode = this.dom.tabBtnCode;
    const tabArena = this.dom.tabBtnArena;
    const codingPanel = this.dom.section;
    const arenaPanel = this.dom.arenaPanel;

    if (!tabCode || !tabArena || !codingPanel || !arenaPanel) return;

    const selectTab = (activeTab) => {
      if (activeTab === 'code') {
        tabCode.classList.add('active');
        tabCode.setAttribute('aria-selected', 'true');
        tabArena.classList.remove('active');
        tabArena.setAttribute('aria-selected', 'false');
        codingPanel.classList.remove('tab-hidden');
        arenaPanel.classList.add('tab-hidden');
        if (this.dom.editor && typeof this.dom.editor.focus === 'function') {
          setTimeout(() => this.dom.editor.focus(), 50);
        }
      } else {
        tabArena.classList.add('active');
        tabArena.setAttribute('aria-selected', 'true');
        tabCode.classList.remove('active');
        tabCode.setAttribute('aria-selected', 'false');
        arenaPanel.classList.remove('tab-hidden');
        codingPanel.classList.add('tab-hidden');
        const canvas = typeof document !== 'undefined' ? document.getElementById('game-canvas') : null;
        if (canvas && typeof canvas.focus === 'function') canvas.focus();
      }
    };

    tabCode.addEventListener('click', () => selectTab('code'));
    tabArena.addEventListener('click', () => selectTab('arena'));

    if (this.dom.railBtnCode) {
      this.dom.railBtnCode.addEventListener('click', () => {
        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
          selectTab('code');
        }
      });
    }

    if (this.dom.railBtnArena) {
      this.dom.railBtnArena.addEventListener('click', () => {
        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
          selectTab('arena');
        }
      });
    }

    // Small screens: initialize single-active panel (default to Arena)
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      selectTab('arena');
    }
  }

  /**
   * Initialize custom accessible challenge listbox dropdown
   */
  initCustomPicker() {
    const trigger = this.dom.pickerTrigger;
    const menu = this.dom.pickerMenu;
    if (!trigger || !menu) return;

    this.pickerOpen = false;
    this.highlightedOptionIndex = -1;

    // Toggle on trigger button click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePicker();
    });

    // Keyboard trigger open from trigger button
    trigger.addEventListener('keydown', (e) => {
      if ([' ', 'Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        this.openPicker();
      }
    });

    // Click outside to dismiss menu
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('click', (e) => {
        if (this.pickerOpen && this.dom.customPicker && typeof this.dom.customPicker.contains === 'function' && !this.dom.customPicker.contains(e.target)) {
          this.closePicker();
        }
      });
    }

    // Keydown handling when open
    menu.addEventListener('keydown', (e) => {
      this.handlePickerKeydown(e);
    });

    // Also support arrow/esc navigation from trigger when open
    trigger.addEventListener('keydown', (e) => {
      if (this.pickerOpen && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', 'Tab'].includes(e.key)) {
        this.handlePickerKeydown(e);
      }
    });
  }

  /**
   * Open the custom challenge picker menu
   */
  openPicker() {
    if (!this.dom.pickerMenu || !this.dom.pickerTrigger) return;
    this.pickerOpen = true;
    this.dom.pickerMenu.classList.add('open');
    this.dom.pickerTrigger.setAttribute('aria-expanded', 'true');

    // Find and highlight currently selected challenge
    if (this.pickerOptionElements && this.pickerOptionElements.length) {
      const curId = this.currentChallenge ? this.currentChallenge.id : '';
      const idx = this.pickerOptionElements.findIndex((el) => el.getAttribute('data-id') === curId);
      this.highlightOptionByIndex(idx >= 0 ? idx : 0);
    }
  }

  /**
   * Close the custom challenge picker menu
   */
  closePicker() {
    if (!this.dom.pickerMenu || !this.dom.pickerTrigger) return;
    this.pickerOpen = false;
    this.dom.pickerMenu.classList.remove('open');
    this.dom.pickerTrigger.setAttribute('aria-expanded', 'false');
    this.clearPickerHighlights();
  }

  /**
   * Toggle custom challenge picker menu open/closed
   */
  togglePicker() {
    if (this.pickerOpen) {
      this.closePicker();
    } else {
      this.openPicker();
    }
  }

  /**
   * Handle listbox keyboard navigation
   */
  handlePickerKeydown(e) {
    if (!this.pickerOpen) return;
    const count = this.pickerOptionElements ? this.pickerOptionElements.length : 0;
    if (count === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (this.highlightedOptionIndex + 1) % count;
      this.highlightOptionByIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (this.highlightedOptionIndex - 1 + count) % count;
      this.highlightOptionByIndex(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.highlightOptionByIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.highlightOptionByIndex(count - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.highlightedOptionIndex >= 0 && this.highlightedOptionIndex < count) {
        const el = this.pickerOptionElements[this.highlightedOptionIndex];
        const id = el ? el.getAttribute('data-id') : null;
        if (id) {
          this.loadChallenge(id);
          this.closePicker();
          if (this.dom.pickerTrigger && typeof this.dom.pickerTrigger.focus === 'function') {
            this.dom.pickerTrigger.focus();
          }
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.closePicker();
      if (this.dom.pickerTrigger && typeof this.dom.pickerTrigger.focus === 'function') {
        this.dom.pickerTrigger.focus();
      }
    } else if (e.key === 'Tab') {
      this.closePicker();
    }
  }

  /**
   * Highlight option by index and scroll into view
   */
  highlightOptionByIndex(idx) {
    if (!this.pickerOptionElements || !this.pickerOptionElements.length) return;
    this.clearPickerHighlights();
    this.highlightedOptionIndex = idx;
    const el = this.pickerOptionElements[idx];
    if (el) {
      el.classList.add('focused');
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
      if (this.dom.pickerTrigger && typeof this.dom.pickerTrigger.setAttribute === 'function') {
        this.dom.pickerTrigger.setAttribute('aria-activedescendant', el.id || `picker-opt-${el.getAttribute('data-id')}`);
      }
    }
  }

  /**
   * Clear all focused highlight states
   */
  clearPickerHighlights() {
    if (!this.pickerOptionElements) return;
    for (const el of this.pickerOptionElements) {
      el.classList.remove('focused');
    }
    this.highlightedOptionIndex = -1;
    if (this.dom.pickerTrigger && typeof this.dom.pickerTrigger.removeAttribute === 'function') {
      this.dom.pickerTrigger.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Toggle workspace open/minimized state
   * @param {boolean} [forceState]
   */
  toggleWorkspace(forceState) {
    if (!this.dom.section) return;
    const currentState = this.dom.section.getAttribute('data-state') || 'normal';
    const isCurrentlyOpen = currentState !== 'minimized';
    const nextOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

    if (nextOpen) {
      this.dom.section.setAttribute('data-state', 'normal');
      this.setSplitRatio(this.splitRatio || 46);
      if (this.dom.btnToggleWorkspace) {
        this.dom.btnToggleWorkspace.innerHTML = '💻 Coding [Alt+C]';
        this.dom.btnToggleWorkspace.classList.add('active');
      }
      if (this.dom.editor && typeof this.dom.editor.focus === 'function') {
        setTimeout(() => {
          if (this.dom.editor && typeof this.dom.editor.focus === 'function') {
            this.dom.editor.focus();
          }
        }, 50);
      }
    } else {
      this.dom.section.setAttribute('data-state', 'minimized');
      if (this.dom.btnToggleWorkspace) {
        this.dom.btnToggleWorkspace.innerHTML = '💻 Open Code [Alt+C]';
        this.dom.btnToggleWorkspace.classList.remove('active');
      }
      // Return focus to arena canvas for uninterrupted fighting
      const canvas = typeof document !== 'undefined' ? document.getElementById('game-canvas') : null;
      if (canvas && typeof canvas.focus === 'function') canvas.focus();
    }
  }

  /**
   * Toggle maximize / restore layout
   */
  toggleMaximize() {
    if (!this.dom.section) return;
    const currentState = this.dom.section.getAttribute('data-state');
    if (currentState === 'maximized') {
      this.dom.section.setAttribute('data-state', 'normal');
      this.setSplitRatio(this.splitRatio || 46);
      if (this.dom.btnMaximize) {
        this.dom.btnMaximize.title = 'Maximize (Alt+M)';
        this.dom.btnMaximize.innerHTML = '<span class="icon-text">⛶</span>';
      }
    } else {
      this.dom.section.setAttribute('data-state', 'maximized');
      if (this.dom.btnMaximize) {
        this.dom.btnMaximize.title = 'Restore (Alt+M)';
        this.dom.btnMaximize.innerHTML = '<span class="icon-text">🗗</span>';
      }
    }
  }

  /**
   * Toggle instructions sidebar
   * @param {boolean} [forceState]
   */
  toggleSidebar(forceState) {
    if (!this.dom.sidebar) return;
    const isCollapsed = this.dom.sidebar.classList.contains('collapsed');
    const shouldCollapse = forceState !== undefined ? !forceState : !isCollapsed;

    if (shouldCollapse) {
      this.dom.sidebar.classList.add('collapsed');
      if (this.dom.btnToggleSidebar) {
        this.dom.btnToggleSidebar.innerHTML = '<span class="icon-text">📖 Brief</span>';
      }
    } else {
      this.dom.sidebar.classList.remove('collapsed');
      if (this.dom.btnToggleSidebar) {
        this.dom.btnToggleSidebar.innerHTML = '<span class="icon-text">◀ Hide</span>';
      }
    }
  }

  /**
   * Check if workspace is currently open
   * @returns {boolean}
   */
  isOpen() {
    if (!this.dom.section) return true;
    return this.dom.section.getAttribute('data-state') !== 'minimized';
  }

  /**
   * Set editor code value
   * @param {string} code
   */
  setCode(code) {
    this.code = code;
    if (this.dom.editor) {
      this.dom.editor.value = code;
    }
    this.syncEditorView();
  }

  /**
   * Get current code in editor
   * @returns {string}
   */
  getCode() {
    if (this.dom.editor) {
      return this.dom.editor.value;
    }
    return this.code || '';
  }

  /**
   * Update status badge UI
   */
  updateStatusBadge(status, message = '') {
    if (!this.dom.badge) return;
    const s = (status || 'READY').toUpperCase();
    this.dom.badge.textContent = s;
    this.dom.badge.className = `badge badge-${status.toLowerCase()}`;
    if (message) this.dom.badge.title = message;
  }

  /**
   * Reset challenge to initial state with starter code and fresh countdown
   */
  resetChallenge() {
    if (this._advanceTimeoutId) {
      clearTimeout(this._advanceTimeoutId);
      this._advanceTimeoutId = null;
    }
    this.stopCountdown();
    this.timeRemaining = this.countdownSec;
    this.isExpired = false;
    this.isUnlocked = false;
    this.isExecuting = false;
    this._penaltyApplied = false;
    this._rewardGranted = false;
    this.state = CHALLENGE_STATE.RUNNING;

    const initialCode = this.currentChallenge ? this.currentChallenge.starterCode : STARTER_CODE;
    this.setCode(initialCode);
    this.setSlamUnlockedState(false);
    this.updateTimerDisplay();
    this.startCountdown();

    if (this.dom.submitBtn) this.dom.submitBtn.disabled = false;
    if (this.dom.editor) this.dom.editor.disabled = false;

    const actionName = (this.currentChallenge && this.currentChallenge.unlockAction) || 'special';
    const actionLabel = actionName === 'special' ? 'Special Slam' : actionName.toUpperCase();
    this.setFeedback(`Complete the function to unleash ${actionLabel}.`, 'idle');
    this.resetTestCaseIndicators();
  }

  /**
   * Start or restart countdown timer
   */
  startCountdown() {
    this.stopCountdown();
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();

      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.isExpired = true;
        this.stopCountdown();
        this.onTimerExpired();
      }
    }, 1000);
  }

  /**
   * Stop countdown timer
   */
  stopCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update timer display in workspace and Combat HUD
   */
  updateTimerDisplay() {
    const text = `⏱️ ${this.timeRemaining}s`;

    if (this.dom.timer) {
      this.dom.timer.textContent = text;
      if (this.timeRemaining <= 10) {
        this.dom.timer.classList.add('timer-warning');
      } else {
        this.dom.timer.classList.remove('timer-warning');
      }
    }

    if (this.dom.hudTimerBadge) {
      this.dom.hudTimerBadge.textContent = text;
      if (this.timeRemaining <= 10) {
        this.dom.hudTimerBadge.classList.add('timer-warning');
      } else {
        this.dom.hudTimerBadge.classList.remove('timer-warning');
      }
    }
  }

  /**
   * Synchronize Special Slam locked/unlocked state with Combat HUD & Workspace
   * @param {boolean} isUnlocked
   */
  setSlamUnlockedState(isUnlocked) {
    this.isUnlocked = isUnlocked;

    if (this.dom.hudSlamStatus) {
      if (isUnlocked) {
        this.dom.hudSlamStatus.className = 'hud-slam-badge hud-slam-unlocked';
        this.dom.hudSlamStatus.innerHTML = '<span class="hud-slam-icon">⚡</span><span class="hud-slam-text">SPECIAL SLAM: READY! [F / ;]</span>';
      } else {
        this.dom.hudSlamStatus.className = 'hud-slam-badge hud-slam-locked';
        this.dom.hudSlamStatus.innerHTML = '<span class="hud-slam-icon">⚡</span><span class="hud-slam-text">SPECIAL SLAM: LOCKED [Solve Code]</span>';
      }
    }

    if (this.dom.workspaceSlamIndicator) {
      if (isUnlocked) {
        this.dom.workspaceSlamIndicator.className = 'workspace-slam-chip unlocked';
        this.dom.workspaceSlamIndicator.textContent = 'SLAM UNLOCKED';
      } else {
        this.dom.workspaceSlamIndicator.className = 'workspace-slam-chip locked';
        this.dom.workspaceSlamIndicator.textContent = 'SLAM LOCKED';
      }
    }
  }

  /**
   * Handle countdown expiration
   */
  onTimerExpired() {
    if (this.state === CHALLENGE_STATE.SOLVED || this.state === CHALLENGE_STATE.TRANSITIONING) {
      return;
    }
    this.state = CHALLENGE_STATE.TIMED_OUT;
    this.isExpired = true;
    if (this.dom.submitBtn) this.dom.submitBtn.disabled = true;
    if (this.dom.editor) this.dom.editor.disabled = true;

    // Apply single-use timeout penalty if configured
    if (!this._penaltyApplied) {
      this._penaltyApplied = true;
      if (typeof this.onPenaltyCallback === 'function' && this.timeoutPenalty && (this.timeoutPenalty.hp > 0 || this.timeoutPenalty.stamina > 0)) {
        this.onPenaltyCallback({
          type: 'timeout',
          challengeId: this.currentChallenge ? this.currentChallenge.id : null,
          penalty: this.timeoutPenalty,
        });
      }
    }

    this.setFeedback('⏱️ Time expired! Special attack failed to charge in time. Click "Retry Challenge" to try again or "Skip" to move forward.', 'error');
  }

  /**
   * Skip current challenge, apply mild non-lethal penalty (once), and advance to next challenge
   * @param {object} [options]
   * @returns {boolean} true if skipped
   */
  skipChallenge(options = {}) {
    if (this.state === CHALLENGE_STATE.EXECUTING || this.state === CHALLENGE_STATE.TRANSITIONING || this.isExecuting) {
      return false;
    }

    if (this._advanceTimeoutId) {
      clearTimeout(this._advanceTimeoutId);
      this._advanceTimeoutId = null;
    }

    this.stopCountdown();

    // Apply skip penalty once per challenge attempt
    if (!this._penaltyApplied) {
      this._penaltyApplied = true;
      if (typeof this.onPenaltyCallback === 'function' && this.skipPenalty && (this.skipPenalty.hp > 0 || this.skipPenalty.stamina > 0)) {
        this.onPenaltyCallback({
          type: 'skip',
          challengeId: this.currentChallenge ? this.currentChallenge.id : null,
          penalty: this.skipPenalty,
        });
      }
    }

    this.state = CHALLENGE_STATE.SKIPPED;
    const next = this.advanceToNextChallenge();
    const penaltyMsg = (this.skipPenalty && this.skipPenalty.hp) ? ` (-${this.skipPenalty.hp} HP chip)` : '';
    this.setFeedback(`⏭️ Challenge skipped${penaltyMsg}! Loaded "${next ? next.title : 'Next'}".`, 'warn');
    return true;
  }

  /**
   * Advance to next eligible challenge in current tier or sequence
   * @param {object} [options]
   * @returns {object|null} loaded challenge
   */
  advanceToNextChallenge(options = {}) {
    if (this._advanceTimeoutId) {
      clearTimeout(this._advanceTimeoutId);
      this._advanceTimeoutId = null;
    }
    const curId = this.currentChallenge ? this.currentChallenge.id : null;
    const tier = this.activeTier === 'all' ? null : this.activeTier;
    let next = questionRegistry.getNextInTier(curId, tier);
    if (!next) {
      next = questionRegistry.getNext(curId);
    }
    if (next) {
      this.loadChallenge(next.id);
    }
    return next;
  }

  /**
   * Submit Python code for validation
   * @returns {Promise<{ unlocked: boolean, action: string, passed: boolean, error_type: string|null, error_message: string|null }>}
   */
  async submitCode() {
    // 1. Guard against repeated submission of already-unlocked attack
    if (this.isUnlocked || this.state === CHALLENGE_STATE.SOLVED) {
      this.setFeedback('Attack already unlocked for this round! Click "Retry Challenge" to charge another.', 'warn');
      return { unlocked: false, error_type: 'AlreadyUnlockedError', error_message: 'Already unlocked' };
    }

    // 2. Guard against concurrent submissions
    if (this.isExecuting || this.state === CHALLENGE_STATE.EXECUTING || this.state === CHALLENGE_STATE.TRANSITIONING) {
      return { unlocked: false, error_type: 'BusyError', error_message: 'Execution in progress' };
    }

    // 3. Guard against expired countdown & timed-out state
    if (this.isExpired || this.timeRemaining <= 0 || this.state === CHALLENGE_STATE.TIMED_OUT) {
      this.setFeedback('Cannot submit: countdown has expired. Click "Retry Challenge".', 'error');
      return { unlocked: false, error_type: 'ExpiredError', error_message: 'Countdown expired' };
    }

    // 4. Guard against missing runtime
    if (!this.runner) {
      const msg = 'Python runtime unavailable in this environment. Regular controls (A/S/D/F) remain active.';
      this.setFeedback(msg, 'warn');
      return { unlocked: false, error_type: 'RuntimeUnavailable', error_message: msg };
    }

    const code = this.getCode();
    this.isExecuting = true;
    this.state = CHALLENGE_STATE.EXECUTING;
    if (this.dom.submitBtn) this.dom.submitBtn.disabled = true;
    this.setFeedback('Evaluating Python code in Web Worker...', 'loading');

    try {
      const result = await this.runner.runCode(code, this.currentChallenge);
      this.isExecuting = false;
      if (this.dom.submitBtn) this.dom.submitBtn.disabled = false;

      // Update test case checklist indicators
      this.updateTestCaseIndicators(result.details || []);

      if (result.passed && result.unlocked) {
        // Successful verification!
        this.state = CHALLENGE_STATE.SOLVED;
        this.setSlamUnlockedState(true);
        this.stopCountdown();
        if (this.dom.submitBtn) this.dom.submitBtn.disabled = true;
        if (this.dom.editor) this.dom.editor.disabled = true;

        if (this.currentChallenge && this.currentChallenge.id) {
          this.solvedChallenges.add(this.currentChallenge.id);
          questionRegistry.markSolved(this.currentChallenge.id);
          this.renderPickerOptions();
        }

        const actionName = result.action || (this.currentChallenge && this.currentChallenge.unlockAction) || 'special';
        const actionLabel = actionName === 'special' ? 'Special Slam' : actionName.toUpperCase();

        // Single-use reward gate
        if (!this._rewardGranted) {
          this._rewardGranted = true;
          if (typeof this.onUnlockCallback === 'function') {
            this.onUnlockCallback(actionName);
          }
        }

        if (this.autoAdvanceOnSolve) {
          this.state = CHALLENGE_STATE.TRANSITIONING;
          const advanceDelaySec = (this.solveAdvanceDelayMs / 1000).toFixed(1);
          this.setFeedback(`🎉 Solved! ${actionLabel} UNLEASHED! Next challenge in ${advanceDelaySec}s...`, 'success');
          const tid = setTimeout(() => {
            this._advanceTimeoutId = null;
            this.advanceToNextChallenge();
          }, this.solveAdvanceDelayMs);
          if (typeof tid.unref === 'function') {
            tid.unref();
          }
          this._advanceTimeoutId = tid;
        } else {
          const successMsg = `🎉 Challenge Solved! All test cases passed. ${actionLabel} UNLEASHED!`;
          this.setFeedback(successMsg, 'success');
        }

        return result;
      } else {
        // Rejection / verification error
        this.state = CHALLENGE_STATE.RUNNING;
        const errType = result.error_type || 'Rejected';
        const errDesc = result.error_message || 'Assertion failed';
        this.setFeedback(`❌ ${errType}: ${errDesc}`, 'error');
        return result;
      }
    } catch (err) {
      this.isExecuting = false;
      this.state = CHALLENGE_STATE.RUNNING;
      if (this.dom.submitBtn) this.dom.submitBtn.disabled = false;
      const errMsg = err.message || 'Worker execution error';
      this.setFeedback(`❌ Worker Error: ${errMsg}`, 'error');
      return {
        unlocked: false,
        action: (this.currentChallenge && this.currentChallenge.unlockAction) || 'special',
        passed: false,
        error_type: 'WorkerError',
        error_message: errMsg,
      };
    }
  }

  /**
   * Set feedback banner text and CSS state
   * @param {string} message
   * @param {'idle'|'loading'|'success'|'error'|'warn'} state
   */
  setFeedback(message, state = 'idle') {
    if (!this.dom.feedback) return;
    this.dom.feedback.textContent = message;
    this.dom.feedback.className = `challenge-feedback feedback-${state}`;
  }

  /**
   * Reset test case checklist indicators
   */
  resetTestCaseIndicators() {
    const list = this.dom.testCasesList ? this.dom.testCasesList.querySelectorAll('.tc-item') : [this.dom.tc1, this.dom.tc2, this.dom.tc3];
    list.forEach((item) => {
      if (item) {
        const span = item.querySelector('.tc-status');
        if (span) {
          span.textContent = '⏳';
          span.className = 'tc-status tc-pending';
        }
      }
    });
  }

  /**
   * Update test case checklist indicators from execution details
   * @param {Array} details
   */
  updateTestCaseIndicators(details = []) {
    const list = this.dom.testCasesList ? this.dom.testCasesList.querySelectorAll('.tc-item') : [this.dom.tc1, this.dom.tc2, this.dom.tc3];
    list.forEach((item, idx) => {
      if (item) {
        const span = item.querySelector('.tc-status');
        if (span) {
          const d = details[idx];
          if (d && d.passed) {
            span.textContent = '✅ PASS';
            span.className = 'tc-status tc-pass';
          } else {
            span.textContent = '❌ FAIL';
            span.className = 'tc-status tc-fail';
          }
        }
      }
    });
  }

  /**
   * Register onUnlock callback
   * @param {Function} cb - (actionName) => void
   */
  onUnlock(cb) {
    this.onUnlockCallback = cb;
  }
}

export default ChallengeController;
