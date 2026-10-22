// anim/lab.js - Code Fighters Animation Lab Controller & UI Harness
// Classic script format: attaches directly to window.CF
// Follows anim/STYLE.md:
// - Rule 2: Sharp rendering with devicePixelRatio backing store scaling.
// - Rule 3: Readable silhouette mode toggle.
// - Rule 8: Minimal effects only (Extra FX toggle OFF by default).
// - Contact Sheet generator: 8 frames per move at 2x scale.
window.CF = window.CF || {};

(function () {
  'use strict';

  let canvas, ctx;
  let fighterA, fighterB;
  let isPaused = false;
  let playbackSpeed = 1.0;
  let lastTimestamp = 0;
  let targetReactMode = 'auto'; // 'none', 'hit', 'block', 'parry', 'dodge', 'auto'
  let debugSkeleton = false;
  let silhouetteMode = false;
  let dodgeDelayMs = 450;
  let scheduledDodge = null;

  const LOGICAL_W = 640;
  const LOGICAL_H = 220;

  const logEntries = [];
  const MAX_LOG_LINES = 50;

  function log(msg, type) {
    const now = new Date();
    const time = now.toLocaleTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');
    const speed = playbackSpeed.toFixed(1) + 'x';
    logEntries.unshift({ time: time, speed: speed, msg: msg, type: type || 'info' });
    if (logEntries.length > MAX_LOG_LINES) {
      logEntries.pop();
    }
    renderLog();
  }

  function renderLog() {
    const el = document.getElementById('eventLog');
    if (!el) return;
    el.innerHTML = logEntries.map(e => {
      let color = '#94A3B8';
      if (e.type === 'strike') color = '#EF4444';
      if (e.type === 'tell') color = '#38BDF8';
      if (e.type === 'parry') color = '#A855F7';
      if (e.type === 'reaction') color = '#F59E0B';
      return `<div class="log-row"><span class="log-time">[${e.time} | ${e.speed}]</span> <span style="color: ${color}">${e.msg}</span></div>`;
    }).join('');
  }

  function formatMs(n) {
    return Math.round(n).toLocaleString();
  }

  // --- Target Reaction Handler ---
  function handleAttackerStrike(data) {
    const actual = (data && data.elapsedMs !== undefined ? data.elapsedMs : fighterA.currentMove().elapsedMs);
    const declared = (data && data.declaredMs !== undefined ? data.declaredMs : (fighterA._strikeMs || 0));
    log(`A: strike at ${formatMs(actual)} ms (declared ${formatMs(declared)}) [index: ${data.strikeIndex}, tag: ${data.tag || 'strike'}]`, 'strike');

    if (fighterB.hasShield) {
      log(`B: Shield absorbs hit!`, 'reaction');
      if (data.tag === 'slam') {
        fighterB.shieldBreak();
        log(`B: Heavy slam caused SHIELD BREAK!`, 'strike');
      } else {
        fighterB.react('blocked');
      }
      return;
    }

    if (targetReactMode === 'none') {
      // Do nothing
    } else if (targetReactMode === 'hit') {
      fighterB.react('hit');
      log(`B: react('hit')`, 'reaction');
    } else if (targetReactMode === 'block') {
      fighterB.react('blocked');
      log(`B: react('blocked')`, 'reaction');
    } else if (targetReactMode === 'parry') {
      fighterB.react('parry');
      log(`B: react('parried')`, 'parry');
    } else if (targetReactMode === 'dodge') {
      fighterB.react('dodged');
      log(`B: react('dodged')`, 'reaction');
    } else if (targetReactMode === 'auto') {
      const bMove = fighterB.currentMove();
      const el = document.getElementById('dodgeCoverageReadout');
      if (bMove.name === 'block') {
        fighterB.react('blocked');
        log(`B: blocked attack successfully!`, 'reaction');
      } else if (bMove.tags.indexOf('dodge') !== -1) {
        // Hold window check: duck is 150-750ms, step is 150-300ms
        const windowStart = 150;
        const windowEnd = (bMove.name === 'duck') ? 750 : 300;
        const inside = (bMove.elapsedMs >= windowStart && bMove.elapsedMs <= windowEnd);
        if (inside) {
          fighterB.react('dodged');
          log(`B: dodged attack in hold window (${Math.round(bMove.elapsedMs)}ms)!`, 'reaction');
          if (el) {
            el.textContent = 'YES (DODGED)';
            el.style.background = '#065F46';
            el.style.color = '#34D399';
          }
        } else {
          fighterB.react('hit');
          log(`B: dodge window missed strike! Elapsed in dodge: ${Math.round(bMove.elapsedMs)}ms (window: ${windowStart}-${windowEnd}ms)`, 'strike');
          if (el) {
            el.textContent = 'NO (HIT)';
            el.style.background = '#7F1D1D';
            el.style.color = '#F87171';
          }
        }
      } else {
        fighterB.react('hit');
        log(`B: caught undefended in ${bMove.name}! react('hit')`, 'strike');
        if (el) {
          el.textContent = 'NO (HIT)';
          el.style.background = '#7F1D1D';
          el.style.color = '#F87171';
        }
      }
    }
  }

  function computeDodgeCoverage() {
    const isEnemyAttack = (fighterA && fighterA.currentMove().name === 'enemyAttack');
    const tellMs = (isEnemyAttack && fighterA._tellMs) ? fighterA._tellMs : 2000;
    const strikeMs = (isEnemyAttack && fighterA._strikeMs) ? fighterA._strikeMs : 3120;
    const dir = (isEnemyAttack && fighterA._pendingDir) ? fighterA._pendingDir : 'h';
    const dodgeMove = (dir === 'v') ? 'stepLeft' : 'duck';

    const windowStart = 150;
    const windowEnd = (dodgeMove === 'duck') ? 750 : 300;

    const dodgeStart = tellMs + dodgeDelayMs;
    const activeFrom = dodgeStart + windowStart;
    const activeTo = dodgeStart + windowEnd;

    const covers = (strikeMs >= activeFrom && strikeMs <= activeTo);
    return {
      covers: covers,
      dodgeMove: dodgeMove,
      dodgeStart: dodgeStart,
      activeFrom: activeFrom,
      activeTo: activeTo,
      strikeMs: strikeMs
    };
  }

  function updateDodgeCoverageUI() {
    const el = document.getElementById('dodgeCoverageReadout');
    if (!el) return;
    const res = computeDodgeCoverage();
    if (res.covers) {
      el.textContent = 'YES';
      el.style.background = '#065F46';
      el.style.color = '#34D399';
    } else {
      el.textContent = 'NO';
      el.style.background = '#7F1D1D';
      el.style.color = '#F87171';
    }
  }

  function handleAttackerTell(data) {
    const actual = (data && data.elapsedMs !== undefined ? data.elapsedMs : fighterA.currentMove().elapsedMs);
    const declared = (data && data.declaredMs !== undefined ? data.declaredMs : 2000);
    log(`A: tell [${data.dir.toUpperCase()}] at ${formatMs(actual)} ms (declared ${formatMs(declared)})`, 'tell');

    if (targetReactMode === 'auto') {
      const dir = data.dir || 'h';
      const dodgeMove = (dir === 'v') ? 'stepLeft' : 'duck';
      if (dodgeDelayMs <= 0) {
        log(`B: Auto-reacting immediately (+0ms) -> ${dodgeMove}()`, 'tell');
        fighterB.play(dodgeMove);
      } else {
        scheduledDodge = {
          move: dodgeMove,
          triggerAtElapsed: fighterA._elapsedMs + dodgeDelayMs,
          handled: false
        };
        log(`B: Auto-reaction scheduled in ${dodgeDelayMs}ms -> ${dodgeMove}()`, 'tell');
      }
    }
    updateDodgeCoverageUI();
  }

  // --- Sharp Rendering Resizer (Rule 2) ---
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(LOGICAL_W * dpr);
    canvas.height = Math.floor(LOGICAL_H * dpr);
    canvas.style.width = LOGICAL_W + 'px';
    canvas.style.height = LOGICAL_H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // --- Initialization ---
  function init() {
    canvas = document.getElementById('labCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Fighters
    fighterA = new CF.Fighter({
      id: 'A',
      x: 200,
      facing: 1,
      accent: '#EF4444',
      ink: '#E2E8F0',
      swordColor: '#EF9F27',
      groundY: 190
    });

    fighterB = new CF.Fighter({
      id: 'B',
      x: 440,
      facing: -1,
      accent: '#3B82F6',
      ink: '#E2E8F0',
      swordColor: '#38BDF8',
      groundY: 190
    });

    // Wire Fighter A events
    fighterA.on('strike', handleAttackerStrike);
    fighterA.on('tell', handleAttackerTell);
    fighterA.on('parry', () => log(`A: parry triggered!`, 'parry'));
    fighterA.on('end', (d) => log(`A: move finished: ${d.move}`));
    fighterA.on('shieldBreak', () => log(`A: shieldBreak event!`, 'strike'));

    // Wire Fighter B events
    fighterB.on('strike', (d) => {
      const actual = (d && d.elapsedMs !== undefined ? d.elapsedMs : fighterB.currentMove().elapsedMs);
      const declared = (d && d.declaredMs !== undefined ? d.declaredMs : (fighterB._strikeMs || 0));
      log(`B: strike at ${formatMs(actual)} ms (declared ${formatMs(declared)})`, 'strike');
    });
    fighterB.on('end', (d) => log(`B: move finished: ${d.move}`));
    fighterB.on('shieldBreak', () => log(`B: shieldBreak event!`, 'strike'));

    bindUI();
    populateMoveTable();
    log('Code Fighters Animation Lab initialized. Visual Quality Pass Active.', 'tell');

    // Start Animation Loop
    lastTimestamp = performance.now();
    requestAnimationFrame(animationLoop);
  }

  // --- Animation Loop ---
  function animationLoop(timestamp) {
    const rawDt = timestamp - (lastTimestamp || timestamp);
    lastTimestamp = timestamp;

    const dt = Math.min(rawDt, 60);

    if (!isPaused) {
      updateSimulation(dt * playbackSpeed);
    }

    renderCanvas();
    updateLiveReadout();

    requestAnimationFrame(animationLoop);
  }

  function updateSimulation(dtMs) {
    CF.Effects.update(dtMs);
    if (!CF.Effects.isHitStopActive()) {
      fighterA.update(dtMs);

      // Check scheduled auto-reaction dodge
      if (scheduledDodge && !scheduledDodge.handled) {
        if (fighterA.currentMove().name !== 'enemyAttack' && fighterA.currentMove().name !== 'feint') {
          scheduledDodge.handled = true;
        } else if (fighterA._elapsedMs >= scheduledDodge.triggerAtElapsed) {
          scheduledDodge.handled = true;
          fighterB.play(scheduledDodge.move);
          log(`B: Delayed auto-reaction (+${dodgeDelayMs}ms) started -> ${scheduledDodge.move}()`, 'reaction');
        }
      }

      fighterB.update(dtMs);
    }
  }

  function renderCanvas() {
    const w = LOGICAL_W;
    const h = LOGICAL_H;

    ctx.clearRect(0, 0, w, h);

    // Apply Camera Shake
    CF.Effects.applyCamera(ctx);

    // 1. Arena Background (Light parchment in silhouette mode, dark in normal mode)
    drawArenaBackground(ctx, w, h);

    // 2. Background Effects (Shockwaves on floor)
    CF.Effects.drawBackground(ctx);

    // 3. Motion Trails (short, only on strikes)
    CF.Effects.drawTrails(ctx, '#EF9F27');

    // 4. Fighters (Render with silhouette flag if active)
    fighterA.drawOptions.debug = debugSkeleton;
    fighterB.drawOptions.debug = debugSkeleton;
    fighterA.draw(ctx, { silhouette: silhouetteMode });
    fighterB.draw(ctx, { silhouette: silhouetteMode });

    // 5. Foreground Minimal Particles (Star sparks, dust puffs, shield shards)
    CF.Effects.drawParticles(ctx);

    // 6. Floating Reaction Words
    CF.Effects.drawFloatingTexts(ctx);

    // Restore Camera Shake
    CF.Effects.restoreCamera(ctx);

    // 7. Post-Processing (Special Slam Banner, Screen Flash if extraFx)
    CF.Effects.drawOverlay(ctx, w, h);
  }

  function drawArenaBackground(ctx, w, h) {
    const gy = 190;

    if (silhouetteMode) {
      // Rule 3: High-contrast light background for checking solid black silhouettes
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(0, gy, w, h - gy);

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, gy - 6);
      ctx.lineTo(w / 2, gy + 6);
      ctx.stroke();
    } else {
      // Standard dark arena
      const floorGrad = ctx.createLinearGradient(0, gy, 0, h);
      floorGrad.addColorStop(0, '#1E293B');
      floorGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, gy, w, h - gy);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, gy - 6);
      ctx.lineTo(w / 2, gy + 6);
      ctx.stroke();
    }
  }

  function updateLiveReadout() {
    const aMove = fighterA.currentMove();
    const bMove = fighterB.currentMove();

    // Lock speed slider while a move is playing (so timing tests are not affected mid-move)
    const isMovePlaying = fighterA.isBusy() || fighterB.isBusy();
    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    if (speedSlider) {
      speedSlider.disabled = isMovePlaying;
      if (isMovePlaying) {
        speedSlider.title = 'Speed slider locked while move is playing';
        if (speedVal) speedVal.textContent = playbackSpeed.toFixed(1) + 'x 🔒';
      } else {
        speedSlider.title = '';
        if (speedVal) speedVal.textContent = playbackSpeed.toFixed(1) + 'x';
      }
    }

    const elA = document.getElementById('readoutA');
    if (elA) {
      elA.innerHTML = `
        <div><strong>Move:</strong> <span class="badge ${aMove.tags[0] || 'default'}">${aMove.name}</span></div>
        <div><strong>Tags:</strong> [${aMove.tags.join(', ')}]</div>
        <div><strong>Elapsed:</strong> ${aMove.elapsedMs}ms</div>
        <div><strong>Busy:</strong> ${fighterA.isBusy() ? '<span style="color:#EF4444">TRUE</span>' : '<span style="color:#10B981">FALSE</span>'}</div>
        <div><strong>Shield:</strong> ${fighterA.hasShield ? '<span style="color:#38BDF8">ON</span>' : 'OFF'}</div>
      `;
    }

    const elB = document.getElementById('readoutB');
    if (elB) {
      elB.innerHTML = `
        <div><strong>Move:</strong> <span class="badge ${bMove.tags[0] || 'default'}">${bMove.name}</span></div>
        <div><strong>Tags:</strong> [${bMove.tags.join(', ')}]</div>
        <div><strong>Elapsed:</strong> ${bMove.elapsedMs}ms</div>
        <div><strong>Busy:</strong> ${fighterB.isBusy() ? '<span style="color:#EF4444">TRUE</span>' : '<span style="color:#10B981">FALSE</span>'}</div>
        <div><strong>Shield:</strong> ${fighterB.hasShield ? '<span style="color:#38BDF8">ON</span>' : 'OFF'}</div>
      `;
    }
  }

  // --- UI Bindings ---
  function bindUI() {
    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        if (speedVal) speedVal.textContent = playbackSpeed.toFixed(1) + 'x';
      });
    }

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
        pauseBtn.classList.toggle('active', isPaused);
        log(isPaused ? 'Simulation paused.' : 'Simulation resumed.');
      });
    }

    const stepBtn = document.getElementById('stepBtn');
    if (stepBtn) {
      stepBtn.addEventListener('click', () => {
        isPaused = true;
        if (pauseBtn) {
          pauseBtn.textContent = '▶ Resume';
          pauseBtn.classList.add('active');
        }
        updateSimulation(16.6 * playbackSpeed);
        renderCanvas();
        updateLiveReadout();
        log('Stepped 1 frame (16.6ms).');
      });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fighterA.reset();
        fighterB.reset();
        scheduledDodge = null;
        CF.Effects.clear();
        updateDodgeCoverageUI();
        log('Reset both fighters and arena effects.');
      });
    }

    // Dodge Delay Slider
    const dodgeDelaySlider = document.getElementById('dodgeDelaySlider');
    const dodgeDelayVal = document.getElementById('dodgeDelayVal');
    if (dodgeDelaySlider) {
      dodgeDelaySlider.addEventListener('input', (e) => {
        dodgeDelayMs = parseInt(e.target.value, 10);
        if (dodgeDelayVal) dodgeDelayVal.textContent = dodgeDelayMs + ' ms';
        updateDodgeCoverageUI();
      });
    }
    updateDodgeCoverageUI();

    // Silhouette Mode Toggle (Rule 3)
    const silhouetteToggle = document.getElementById('silhouetteToggle');
    if (silhouetteToggle) {
      silhouetteToggle.addEventListener('change', (e) => {
        silhouetteMode = e.target.checked;
        log(`Silhouette mode: ${silhouetteMode ? 'ENABLED (Solid black)' : 'DISABLED'}`);
      });
    }

    // Extra FX Toggle (Rule 8: OFF by default)
    const extraFxToggle = document.getElementById('extraFxToggle');
    if (extraFxToggle) {
      extraFxToggle.checked = false;
      CF.Effects.extraFx = false;
      extraFxToggle.addEventListener('change', (e) => {
        CF.Effects.extraFx = e.target.checked;
        log(`Extra FX: ${CF.Effects.extraFx ? 'ON' : 'OFF (Minimal)'}`);
      });
    }

    // Debug Skeleton Toggle
    const debugSkeletonToggle = document.getElementById('debugSkeleton');
    if (debugSkeletonToggle) {
      debugSkeletonToggle.addEventListener('change', (e) => {
        debugSkeleton = e.target.checked;
      });
    }

    // Target React Mode
    const reactSelect = document.getElementById('targetReactSelect');
    if (reactSelect) {
      reactSelect.addEventListener('change', (e) => {
        targetReactMode = e.target.value;
        log(`Defender reaction mode: ${targetReactMode}`);
      });
    }

    // Fighter B Shield Toggle
    const bShieldToggle = document.getElementById('bShieldToggle');
    if (bShieldToggle) {
      bShieldToggle.addEventListener('click', () => {
        fighterB.setShield(!fighterB.hasShield);
        bShieldToggle.textContent = fighterB.hasShield ? 'Shield: Active' : 'Shield: Inactive';
        bShieldToggle.classList.toggle('active', fighterB.hasShield);
      });
    }

    // Play All Group 1 Button
    const playAllBtn = document.getElementById('playAllBtn');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => {
        runPlayAllSequence();
      });
    }

    // Contact Sheet Generator Button
    const contactSheetBtn = document.getElementById('generateContactSheetBtn');
    if (contactSheetBtn) {
      contactSheetBtn.addEventListener('click', () => {
        generateContactSheet();
      });
    }

    // Clear Log
    const clearLogBtn = document.getElementById('clearLogBtn');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        logEntries.length = 0;
        renderLog();
      });
    }

    // Group 1 Move Buttons
    const moveButtons = document.querySelectorAll('[data-move]');
    moveButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const move = btn.getAttribute('data-move');
        const opts = {};
        if (btn.getAttribute('data-dir')) opts.dir = btn.getAttribute('data-dir');
        if (btn.getAttribute('data-tier')) opts.tier = btn.getAttribute('data-tier');
        const receipt = fighterA.play(move, opts);
        log(`A: play('${move}') -> id:${receipt.id}, totalMs:${receipt.totalMs}, strikeMs:${receipt.strikeMs}`);
      });
    });

    // Addendum 3: Test Pending Resolve
    const testPendingBtn = document.getElementById('testPendingBtn');
    if (testPendingBtn) {
      testPendingBtn.addEventListener('click', () => {
        log('Starting enemyAttack with dir: "pending". tellMs: 1500ms...', 'tell');
        const receipt = fighterA.play('enemyAttack', { dir: 'pending', tellMs: 1500, windupMs: 2500 });
        log(`A: play('enemyAttack', {dir:'pending', tellMs:1500}) -> id:${receipt.id}`);
        log('Will call f.resolveDir("h") in 2200ms (700ms AFTER tellMs arrival)...', 'tell');

        setTimeout(() => {
          log('Timeout fired! Calling fighterA.resolveDir("h")...', 'tell');
          fighterA.resolveDir('h');
        }, 2200);
      });
    }

    // Early resolve test button
    const testEarlyResolveBtn = document.getElementById('testEarlyResolveBtn');
    if (testEarlyResolveBtn) {
      testEarlyResolveBtn.addEventListener('click', () => {
        log('Starting enemyAttack with dir: "pending". tellMs: 1500ms...', 'tell');
        fighterA.play('enemyAttack', { dir: 'pending', tellMs: 1500, windupMs: 2500 });
        log('Will call f.resolveDir("v") early in 600ms (BEFORE tellMs)...', 'tell');

        setTimeout(() => {
          log('Timeout fired! Calling fighterA.resolveDir("v") early...', 'tell');
          fighterA.resolveDir('v');
        }, 600);
      });
    }

    // Addendum 4: Test f.react('hit')
    const testHitAliasBtn = document.getElementById('testHitAliasBtn');
    if (testHitAliasBtn) {
      testHitAliasBtn.addEventListener('click', () => {
        log(`Testing Addendum 4 alias: fighterB.react('hit')`, 'reaction');
        fighterB.react('hit');
      });
    }

    // All Moves Dropdown
    const allMovesSelect = document.getElementById('allMovesSelect');
    const playSelectedBtn = document.getElementById('playSelectedBtn');
    if (playSelectedBtn && allMovesSelect) {
      playSelectedBtn.addEventListener('click', () => {
        const move = allMovesSelect.value;
        const receipt = fighterA.play(move);
        log(`A: play('${move}') -> id:${receipt.id}, totalMs:${receipt.totalMs}`);
      });
    }
  }

  // --- Play All Group 1 Sequence Test ---
  function runPlayAllSequence() {
    const group1 = [
      'idle', 'stepLeft', 'stepRight', 'jump', 'duck',
      'block', 'slash', 'hurt', 'enemyAttack', 'feint', 'special'
    ];
    let idx = 0;
    log('--- Running Play All Group 1 Sequence ---', 'tell');

    function next() {
      if (idx >= group1.length) {
        log('--- Completed Play All Group 1 Sequence! ---', 'tell');
        return;
      }
      const m = group1[idx++];
      log(`Sequence [${idx}/${group1.length}]: Playing '${m}'...`);
      const receipt = fighterA.play(m);
      setTimeout(next, receipt.totalMs + 200);
    }

    next();
  }

  // --- Contact Sheet Generator (8 Frames per Move at 2x Scale) ---
  function generateContactSheet() {
    const container = document.getElementById('contactSheetContainer');
    if (!container) return;
    container.innerHTML = '<div style="color: #38BDF8; padding: 12px;">Generating 2x Contact Sheet for all 22 moves (8 frames/move)...</div>';

    const movesToInspect = [
      'idle', 'slash', 'stepLeft', 'stepRight', 'jump', 'duck', 'block',
      'hurt', 'enemyAttack', 'feint', 'special',
      'weakSlash', 'strongSlash', 'comboHeavy', 'stumble', 'knockdown', 'victory',
      'riposte', 'spinSlash', 'backflipEvade', 'dashThrust', 'focus'
    ];

    setTimeout(() => {
      let html = '';

      for (let m = 0; m < movesToInspect.length; m++) {
        const moveName = movesToInspect[m];
        const moveInfo = CF.getMoveInfo(moveName);
        const resolvedMove = CF.resolveMove(moveName, { dir: 'h', tellMs: 2000, windupMs: 3000 });
        const totalMs = resolvedMove.totalMs;

        html += `
          <div class="contact-move-row">
            <div class="contact-move-header">
              <strong>${moveName}</strong> — total: ${totalMs}ms, strike: ${resolvedMove.strikeMs || 'none'}, tags: [${resolvedMove.tags.join(', ')}]
            </div>
            <div class="contact-frames-strip" id="strip_${moveName}"></div>
          </div>
        `;
      }

      container.innerHTML = html;

      // Render 8 canvases per move at 2x scale
      for (let m = 0; m < movesToInspect.length; m++) {
        const moveName = movesToInspect[m];
        const strip = document.getElementById('strip_' + moveName);
        if (!strip) continue;

        const dummyFighter = new CF.Fighter({ x: 70, groundY: 130, accent: '#EF4444' });
        const resolvedMove = CF.resolveMove(moveName, { dir: 'h', tellMs: 2000, windupMs: 3000 });
        dummyFighter.play(moveName, { dir: 'h', tellMs: 2000, windupMs: 3000 });

        const numFrames = 8;
        for (let i = 0; i < numFrames; i++) {
          const sampleTime = Math.floor((i / (numFrames - 1)) * resolvedMove.totalMs);

          // Advance dummy fighter directly to sampleTime
          dummyFighter.reset();
          dummyFighter.play(moveName, { dir: 'h', tellMs: 2000, windupMs: 3000 });
          dummyFighter.update(sampleTime);

          const frameBox = document.createElement('div');
          frameBox.className = 'contact-frame-cell';

          const frameCanvas = document.createElement('canvas');
          const dpr = 2; // 2x scale
          const w = 140;
          const h = 150;
          frameCanvas.width = w * dpr;
          frameCanvas.height = h * dpr;
          frameCanvas.style.width = w + 'px';
          frameCanvas.style.height = h + 'px';

          const fCtx = frameCanvas.getContext('2d');
          fCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          fCtx.imageSmoothingEnabled = false;

          // Background
          if (silhouetteMode) {
            fCtx.fillStyle = '#FFFFFF';
            fCtx.fillRect(0, 0, w, h);
            fCtx.strokeStyle = '#E2E8F0';
            fCtx.lineWidth = 1;
            fCtx.beginPath();
            fCtx.moveTo(0, 130);
            fCtx.lineTo(w, 130);
            fCtx.stroke();
          } else {
            fCtx.fillStyle = '#0B1120';
            fCtx.fillRect(0, 0, w, h);
            fCtx.strokeStyle = '#334155';
            fCtx.lineWidth = 1;
            fCtx.beginPath();
            fCtx.moveTo(0, 130);
            fCtx.lineTo(w, 130);
            fCtx.stroke();
          }

          // Draw fighter at 2x frame
          dummyFighter.draw(fCtx, { silhouette: silhouetteMode });

          const isStrikeMoment = (resolvedMove.strikeMs && Math.abs(sampleTime - resolvedMove.strikeMs) < 40);

          frameBox.appendChild(frameCanvas);
          frameBox.innerHTML += `
            <div class="contact-frame-label ${isStrikeMoment ? 'strike-tag' : ''}">
              F${i + 1}: ${sampleTime}ms ${isStrikeMoment ? '★ STRIKE' : ''}
            </div>
          `;
          strip.appendChild(frameBox);
        }
      }

      log('Contact Sheet generated at 2x scale (8 frames per move).', 'tell');
    }, 50);
  }

  // --- Populate Move Table ---
  function populateMoveTable() {
    const tbody = document.getElementById('moveTableBody');
    if (!tbody) return;

    const allMoves = [
      'idle', 'stepLeft', 'stepRight', 'jump', 'duck', 'block',
      'slash', 'weakSlash', 'strongSlash', 'comboHeavy', 'stumble',
      'hurt', 'knockdown', 'victory', 'enemyAttack', 'feint', 'special',
      'riposte', 'spinSlash', 'backflipEvade', 'dashThrust', 'focus'
    ];

    tbody.innerHTML = allMoves.map((name) => {
      const info = CF.getMoveInfo(name);
      const isG1 = ['idle', 'stepLeft', 'stepRight', 'jump', 'duck', 'block', 'slash', 'hurt', 'enemyAttack', 'feint', 'special'].indexOf(name) !== -1;
      const strikeStr = info.strikeTimes ? info.strikeTimes.join(', ') + ' ms' : (info.strikeMs ? info.strikeMs + ' ms' : '-');
      const tagStr = info.tags.map(t => `<span class="badge ${t}">${t}</span>`).join(' ');

      return `
        <tr class="${isG1 ? 'g1-row' : ''}">
          <td><strong>${name}</strong> ${isG1 ? '<span class="badge g1">Group 1</span>' : ''}</td>
          <td>${info.totalMs} ms</td>
          <td>${strikeStr}</td>
          <td>${tagStr}</td>
          <td>${info.persistent ? 'Yes' : 'No'}</td>
        </tr>
      `;
    }).join('');
  }

  CF.Lab = {
    init: init,
    resizeCanvas: resizeCanvas,
    getFighterA: () => fighterA,
    getFighterB: () => fighterB,
    generateContactSheet: generateContactSheet
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

})();
