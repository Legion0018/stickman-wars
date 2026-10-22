// anim/lab.js - Code Fighters Animation Lab Controller & UI Harness
// Classic script format: attaches directly to window.CF
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

  const logEntries = [];
  const MAX_LOG_LINES = 50;

  function log(msg, type) {
    const time = new Date().toLocaleTimeString().split(' ')[0] + '.' + (Date.now() % 1000);
    logEntries.unshift({ time: time, msg: msg, type: type || 'info' });
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
      return `<div class="log-row"><span class="log-time">[${e.time}]</span> <span style="color: ${color}">${e.msg}</span></div>`;
    }).join('');
  }

  // --- Target Reaction Handler ---
  function handleAttackerStrike(data) {
    log(`A: 'strike' event landed (index: ${data.strikeIndex}, tag: ${data.tag || 'strike'})`, 'strike');

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
      // Auto react based on defender's current move
      const bMove = fighterB.currentMove();
      if (bMove.name === 'block') {
        fighterB.react('blocked');
        log(`B: blocked attack successfully!`, 'reaction');
      } else if (bMove.tags.indexOf('dodge') !== -1) {
        fighterB.react('dodged');
        log(`B: dodged attack during ${bMove.name}!`, 'reaction');
      } else {
        fighterB.react('hit');
        log(`B: caught undefended! react('hit')`, 'strike');
      }
    }
  }

  function handleAttackerTell(data) {
    log(`A: 'tell' event telegraphed direction: [${data.dir.toUpperCase()}]`, 'tell');

    // Auto reaction to tell if in auto mode
    if (targetReactMode === 'auto') {
      if (data.dir === 'h') {
        // Horizontal attack: counter by ducking
        log(`B: Auto-reacting to 'H' tell -> duck()`, 'tell');
        fighterB.play('duck');
      } else if (data.dir === 'v') {
        // Vertical attack: counter by stepping
        log(`B: Auto-reacting to 'V' tell -> stepLeft()`, 'tell');
        fighterB.play('stepLeft');
      }
    }
  }

  // --- Initialization ---
  function init() {
    canvas = document.getElementById('labCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

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
    fighterB.on('strike', (d) => log(`B: strike event landed`, 'strike'));
    fighterB.on('end', (d) => log(`B: move finished: ${d.move}`));
    fighterB.on('shieldBreak', () => log(`B: shieldBreak event!`, 'strike'));

    bindUI();
    populateMoveTable();
    log('Code Fighters Animation Lab initialized. Ready.', 'tell');

    // Start Animation Loop
    lastTimestamp = performance.now();
    requestAnimationFrame(animationLoop);
  }

  // --- Animation Loop ---
  function animationLoop(timestamp) {
    const rawDt = timestamp - (lastTimestamp || timestamp);
    lastTimestamp = timestamp;

    // Clamp dt to avoid huge jumps if tab was backgrounded
    const dt = Math.min(rawDt, 60);

    if (!isPaused) {
      updateSimulation(dt * playbackSpeed);
    }

    renderCanvas();
    updateLiveReadout();

    requestAnimationFrame(animationLoop);
  }

  function updateSimulation(dtMs) {
    // 1. Effects
    CF.Effects.update(dtMs);

    // 2. Fighters
    fighterA.update(dtMs);
    fighterB.update(dtMs);
  }

  function renderCanvas() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Apply Camera Shake
    CF.Effects.applyCamera(ctx);

    // 1. Background Grid & Arena Floor
    drawArenaBackground(ctx, w, h);

    // 2. Background Effects (Shockwaves, ground marks)
    CF.Effects.drawBackground(ctx);

    // 3. Motion Trails
    CF.Effects.drawTrails(ctx, '#EF9F27');

    // 4. Fighters
    fighterA.drawOptions.debug = debugSkeleton;
    fighterB.drawOptions.debug = debugSkeleton;
    fighterA.draw(ctx);
    fighterB.draw(ctx);

    // 5. Foreground Particles (Sparks, Dust, Shards)
    CF.Effects.drawParticles(ctx);

    // 6. Floating Combat Texts
    CF.Effects.drawFloatingTexts(ctx);

    // Restore Camera Shake
    CF.Effects.restoreCamera(ctx);

    // 7. Post-Processing Overlays (Special Slam Banner, Screen Flash)
    CF.Effects.drawOverlay(ctx, w, h);
  }

  function drawArenaBackground(ctx, w, h) {
    // Floor baseline at groundY = 190
    const gy = 190;

    // Arena Floor subtle gradient
    const floorGrad = ctx.createLinearGradient(0, gy, 0, h);
    floorGrad.addColorStop(0, '#1E293B');
    floorGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, gy, w, h - gy);

    // Ground line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();

    // Center arena mark
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, gy - 6);
    ctx.lineTo(w / 2, gy + 6);
    ctx.stroke();
  }

  function updateLiveReadout() {
    const aMove = fighterA.currentMove();
    const bMove = fighterB.currentMove();

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
    // Playback Speed Slider
    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        if (speedVal) speedVal.textContent = playbackSpeed.toFixed(1) + 'x';
      });
    }

    // Pause / Resume
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
        pauseBtn.classList.toggle('active', isPaused);
        log(isPaused ? 'Simulation paused.' : 'Simulation resumed.');
      });
    }

    // Step Frame
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

    // Reset All
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fighterA.reset();
        fighterB.reset();
        CF.Effects.clear();
        log('Reset both fighters and arena effects.');
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
        log(`Defender reaction mode set to: ${targetReactMode}`);
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

    // Special Addendum 3 Button: Test Pending Direction Resolution after delay
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

    // Early resolve test button (resolves BEFORE tellMs arrives)
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

    // Special Addendum 4 Button: Test f.react('hit')
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

    tbody.innerHTML = allMoves.map((name, i) => {
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

  // Expose to CF namespace
  CF.Lab = {
    init: init,
    getFighterA: () => fighterA,
    getFighterB: () => fighterB
  };

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

})();
