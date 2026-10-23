/**
 * ARC Stick-Fighter Animation Engine — Preview & Main Loop
 * Stage 2 Complete 27-Move Library
 */
(function(root) {
  'use strict';

  var CONFIG = root.CONFIG;
  var createFighter = root.createFighter;
  var EffectsManager = root.EffectsManager;
  var Catalogue = root.MoveCatalogue || (root.Poses ? root.Poses.MOVES : {});

  var canvas = null;
  var ctx = null;
  var effects = null;

  var fighterA = null;
  var fighterB = null;
  var activeFighter = null;

  var isPaused = false;
  var isDarkTheme = true;
  var isLoopActive = false;
  var isDemoReelActive = false;
  var demoReactionMode = 'hurt'; // 'hurt' | 'block' | 'off'
  var lastTimestamp = 0;

  var dom = {};

  function initDOM() {
    canvas = document.getElementById('preview-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    dom.statusFighter = document.getElementById('status-fighter');
    dom.statusMove = document.getElementById('status-move');
    dom.statusSpeed = document.getElementById('status-speed');
    dom.statusJoints = document.getElementById('status-joints');
    dom.statusPose = document.getElementById('status-pose');
    dom.statusDuration = document.getElementById('status-duration');
    dom.eventLog = document.getElementById('event-log');

    dom.toggleTheme = document.getElementById('btn-theme-toggle');
    dom.toggleJoints = document.getElementById('btn-joints-toggle');
    dom.btnStop = document.getElementById('btn-stop');
    dom.btnPauseToggle = document.getElementById('btn-pause-toggle');
    dom.btnStepFrame = document.getElementById('btn-step-frame');
    dom.btnInterrupt = document.getElementById('btn-interrupt');
    dom.btnClearEffects = document.getElementById('btn-clear-effects');
    dom.btnDemoReel = document.getElementById('btn-demo-reel');
    dom.loopToggle = document.getElementById('chk-loop-move');
    dom.reactionSelect = document.getElementById('select-demo-reaction');

    dom.selectFighterA = document.getElementById('target-fighter-a');
    dom.selectFighterB = document.getElementById('target-fighter-b');
    dom.chainInput = document.getElementById('chain-input');
    dom.btnRunChain = document.getElementById('btn-run-chain');
  }

  function logEvent(text, type) {
    if (!dom.eventLog) return;
    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2, '0') + ':' +
                  String(now.getMinutes()).padStart(2, '0') + ':' +
                  String(now.getSeconds()).padStart(2, '0') + '.' +
                  String(now.getMilliseconds()).padStart(3, '0');

    var item = document.createElement('div');
    item.className = 'log-item' + (type ? ' log-' + type : '');
    item.innerHTML = '<span class="log-time">[' + timeStr + ']</span> ' + text;
    dom.eventLog.appendChild(item);

    while (dom.eventLog.children.length > 80) {
      dom.eventLog.removeChild(dom.eventLog.firstChild);
    }
    dom.eventLog.scrollTop = dom.eventLog.scrollHeight;
  }

  function updateStatusUI(moveDef) {
    if (dom.statusFighter) dom.statusFighter.textContent = 'Fighter ' + activeFighter.id;
    if (dom.statusMove) dom.statusMove.textContent = activeFighter.currentMoveName || 'idle';
    if (dom.statusSpeed) dom.statusSpeed.textContent = root.timeScale + 'x';
    if (dom.statusJoints) dom.statusJoints.textContent = activeFighter.showJoints ? 'ON' : 'OFF';

    if (dom.statusPose && activeFighter && activeFighter.currentPose) {
      var P = activeFighter.currentPose;
      dom.statusPose.textContent = 'dx:' + Math.round(P.dx || 0) + ' dy:' + Math.round(P.dy || 0) + ' rot:' + Math.round(P.rot || 0) + '°';
    }

    if (dom.statusDuration && moveDef) {
      var eventsText = (moveDef.events && moveDef.events.length) ?
        moveDef.events.map(function(e) { return e.name + '@' + e.timeMs + 'ms'; }).join(', ') : 'none';
      dom.statusDuration.textContent = moveDef.totalDurationMs + ' ms (Events: ' + eventsText + ')';
    }
  }

  function triggerOpponentReaction(attacker, eventName) {
    if (demoReactionMode === 'off') return;
    var opponent = (attacker === fighterA) ? fighterB : fighterA;
    // Don't interrupt if already playing an active attack or hit reaction, but allow interrupting return-to-idle
    if (opponent.anim && opponent.anim.isPlaying && !opponent.anim.isReturningToIdle) return;

    if (demoReactionMode === 'block') {
      opponent.play('block_impact');
    } else {
      // hurt reaction
      if (eventName === 'strikeLands' && (attacker.currentMoveName === 'hit_strong' || attacker.currentMoveName === 'ground_smash')) {
        opponent.play('hurt_heavy');
      } else {
        opponent.play('hurt_light');
      }
    }
  }

  function setupFighters() {
    effects = new EffectsManager();

    var cfgA = CONFIG.fighters.fighterA;
    var cfgB = CONFIG.fighters.fighterB;

    fighterA = createFighter(cfgA.id, cfgA.x, cfgA.facing, {
      color: cfgA.color,
      swordColor: cfgA.swordColor
    });

    fighterB = createFighter(cfgB.id, cfgB.x, cfgB.facing, {
      color: cfgB.color,
      swordColor: cfgB.swordColor
    });

    activeFighter = fighterA;

    function wireEvents(f) {
      f.onEvent(function(eventName, data) {
        logEvent('Fighter ' + f.id + ': <strong>' + eventName + '</strong> (' + (data.move || '') + ')', 'event');

        var floorY = CONFIG.canvas.floorY;
        var strikeX = f.x + (f.facing * 75);

        // Visual effects triggered by keyframes
        if (eventName === 'strikeLands' || eventName === 'hit1' || eventName === 'hit2' || eventName === 'hit3') {
          effects.spawnSparks(strikeX, floorY - 50, 10, f.swordColor);
          effects.addSlashArc(f.x + f.facing * 40, floorY - 50, 55, -0.6 * Math.PI, 0.4 * Math.PI, f.swordColor);
          if (eventName === 'hit3' || data.move === 'ground_smash' || data.move === 'hit_strong') {
            effects.screenShake(180, 7);
          }
          triggerOpponentReaction(f, eventName);
        } else if (eventName === 'tell') {
          effects.addFloatingText('TELL!', f.x, floorY - 105, '#EF9F27');
        } else if (eventName === 'feintRelax') {
          effects.addFloatingText('FEINT!', f.x, floorY - 95, '#94a3b8');
        } else if (eventName === 'charged') {
          effects.spawnShockwave(f.x, floorY, 60, f.swordColor);
          effects.addFloatingText('CHARGED!', f.x, floorY - 95, '#10b981');
        } else if (eventName === 'land') {
          effects.spawnDust(f.x, floorY, f.facing, 6);
        } else if (eventName === 'guardUp' || eventName === 'parryStart') {
          effects.addFloatingText('GUARD', f.x, floorY - 95, '#38bdf8');
        }

        if (data.move === 'dash_lunge' && eventName === 'strikeLands') {
          effects.spawnSpeedLines(f.x, floorY, f.facing, 6);
          effects.spawnAfterimage(f.x - f.facing * 50, floorY, f.facing, f.currentPose, f.swordColor);
        }
        if (data.move === 'ground_smash' && eventName === 'strikeLands') {
          effects.spawnShockwave(strikeX, floorY, 90, '#d97706');
          effects.spawnDust(strikeX, floorY, f.facing, 12);
        }

        updateStatusUI();
      });
    }

    wireEvents(fighterA);
    wireEvents(fighterB);
  }

  function playMoveOnActive(moveName) {
    var moveDef = Catalogue[moveName];
    logEvent('Triggering move: <strong>' + moveName + '</strong> on Fighter ' + activeFighter.id, 'action');
    updateStatusUI(moveDef);

    activeFighter.play(moveName, { loop: isLoopActive }).then(function(res) {
      if (res && res.completed) {
        logEvent('Move <strong>' + moveName + '</strong> completed on Fighter ' + activeFighter.id, 'info');
      }
      updateStatusUI();
    }).catch(function(err) {
      logEvent('Move error: ' + err.message, 'warn');
    });
  }

  function runDemoReel() {
    logEvent('Starting <strong>Demo Reel</strong> showcase...', 'action');
    demoReactionMode = 'hurt';
    isDemoReelActive = true;

    function nextStep(fn) {
      if (!isDemoReelActive) return Promise.resolve({ cancelled: true });
      return fn();
    }

    fighterA.play('windup')
      .then(function() { return nextStep(function() { return fighterA.play('slash'); }); })
      .then(function() { return nextStep(function() { return fighterB.play('parry'); }); })
      .then(function() { return nextStep(function() { return fighterB.play('counter_riposte'); }); })
      .then(function() { return nextStep(function() { return fighterA.play('backflip_dodge'); }); })
      .then(function() { return nextStep(function() { return fighterA.play('dash_lunge'); }); })
      .then(function() { return nextStep(function() { return fighterB.play('ground_smash'); }); })
      .then(function() { return nextStep(function() { return fighterA.play('whirlwind'); }); })
      .then(function() { return nextStep(function() { return fighterB.play('defeat', { hold: true }); }); })
      .then(function() { return nextStep(function() { return fighterA.play('victory'); }); })
      .then(function() {
        isDemoReelActive = false;
        logEvent('Demo Reel complete.', 'info');
        updateStatusUI();
      }).catch(function(err) {
        isDemoReelActive = false;
        logEvent('Demo Reel stopped: ' + (err ? err.message : 'cancelled'), 'warn');
      });
  }

  function setupEventListeners() {
    if (dom.selectFighterA) {
      dom.selectFighterA.addEventListener('change', function() {
        if (dom.selectFighterA.checked) {
          activeFighter = fighterA;
          logEvent('Selected <strong>Fighter A (Left)</strong>', 'info');
          updateStatusUI();
        }
      });
    }
    if (dom.selectFighterB) {
      dom.selectFighterB.addEventListener('change', function() {
        if (dom.selectFighterB.checked) {
          activeFighter = fighterB;
          logEvent('Selected <strong>Fighter B (Right)</strong>', 'info');
          updateStatusUI();
        }
      });
    }

    // Move trigger buttons
    document.querySelectorAll('[data-move]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        isDemoReelActive = false;
        playMoveOnActive(btn.getAttribute('data-move'));
      });
    });

    if (dom.btnStop) {
      dom.btnStop.addEventListener('click', function() {
        isDemoReelActive = false;
        logEvent('Stop called on Fighter ' + activeFighter.id, 'warn');
        activeFighter.stop();
        updateStatusUI();
      });
    }

    if (dom.btnPauseToggle) {
      dom.btnPauseToggle.addEventListener('click', function() {
        isPaused = !isPaused;
        dom.btnPauseToggle.textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
        dom.btnPauseToggle.classList.toggle('active', isPaused);
        logEvent(isPaused ? 'Animation PAUSED' : 'Animation RESUMED', 'info');
      });
    }

    if (dom.btnStepFrame) {
      dom.btnStepFrame.addEventListener('click', function() {
        if (!isPaused) {
          isPaused = true;
          if (dom.btnPauseToggle) {
            dom.btnPauseToggle.textContent = '▶️ Resume';
            dom.btnPauseToggle.classList.add('active');
          }
        }
        var stepDt = 16.667 * root.timeScale;
        fighterA.update(stepDt);
        fighterB.update(stepDt);
        if (fighterA.anim) fighterA.anim.update(stepDt);
        if (fighterB.anim) fighterB.anim.update(stepDt);
        effects.update(stepDt);
        logEvent('Stepped 1 frame (+' + stepDt.toFixed(1) + 'ms)', 'info');
        updateStatusUI();
      });
    }

    if (dom.btnInterrupt) {
      dom.btnInterrupt.addEventListener('click', function() {
        isDemoReelActive = false;
        logEvent('Triggered mid-move <strong>Interrupt (hurt_light)</strong> on Fighter ' + activeFighter.id, 'warn');
        activeFighter.play('hurt_light');
        updateStatusUI();
      });
    }

    if (dom.btnClearEffects) {
      dom.btnClearEffects.addEventListener('click', function() {
        effects.clear();
        logEvent('Cleared all particles and visual combat effects', 'info');
      });
    }

    if (dom.btnDemoReel) {
      dom.btnDemoReel.addEventListener('click', runDemoReel);
    }

    if (dom.loopToggle) {
      dom.loopToggle.addEventListener('change', function() {
        isLoopActive = dom.loopToggle.checked;
        logEvent('Looping ' + (isLoopActive ? 'ENABLED' : 'DISABLED'), 'info');
      });
    }

    if (dom.reactionSelect) {
      dom.reactionSelect.addEventListener('change', function() {
        demoReactionMode = dom.reactionSelect.value;
        logEvent('Opponent reaction set to: <strong>' + demoReactionMode + '</strong>', 'info');
      });
    }

    // Chain Tester
    if (dom.btnRunChain && dom.chainInput) {
      dom.btnRunChain.addEventListener('click', function() {
        var raw = dom.chainInput.value.trim();
        if (!raw) return;
        var moves = raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        logEvent('Running chain: [' + moves.join(' &rarr; ') + ']', 'action');
        activeFighter.playChain(moves).then(function() {
          logEvent('Chain finished on Fighter ' + activeFighter.id, 'info');
          updateStatusUI();
        });
      });
    }

    // Speed controls
    var speedBtns = document.querySelectorAll('[data-speed]');
    speedBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        speedBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var spd = parseFloat(btn.getAttribute('data-speed'));
        root.timeScale = spd;
        logEvent('Speed set to ' + spd + 'x', 'info');
        updateStatusUI();
      });
    });

    if (dom.toggleJoints) {
      dom.toggleJoints.addEventListener('click', function() {
        fighterA.showJoints = !fighterA.showJoints;
        fighterB.showJoints = fighterA.showJoints;
        dom.toggleJoints.classList.toggle('active', fighterA.showJoints);
        logEvent('Skeleton joints ' + (fighterA.showJoints ? 'ENABLED' : 'DISABLED'), 'info');
        updateStatusUI();
      });
    }

    if (dom.toggleTheme) {
      dom.toggleTheme.addEventListener('click', function() {
        isDarkTheme = !isDarkTheme;
        document.body.classList.toggle('light-theme', !isDarkTheme);
        dom.toggleTheme.textContent = isDarkTheme ? '☀️ Light Theme' : '🌙 Dark Theme';
        fighterA.color = isDarkTheme ? CONFIG.fighters.fighterA.color : CONFIG.fighters.fighterA.colorLight;
        fighterB.color = isDarkTheme ? CONFIG.fighters.fighterB.color : CONFIG.fighters.fighterB.colorLight;
        logEvent('Switched to ' + (isDarkTheme ? 'Dark' : 'Light') + ' theme', 'info');
      });
    }

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        isPaused = true;
      } else {
        isPaused = false;
        lastTimestamp = performance.now();
      }
    });
  }

  function renderArena() {
    var width = CONFIG.canvas.width;
    var height = CONFIG.canvas.height;
    var floorY = CONFIG.canvas.floorY;

    ctx.fillStyle = isDarkTheme ? CONFIG.canvas.backgroundDark : CONFIG.canvas.backgroundLight;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    for (var x = 40; x < width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, floorY);
      ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = isDarkTheme ? CONFIG.canvas.floorLineDark : CONFIG.canvas.floorLineLight;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = isDarkTheme ? 'rgba(239, 159, 39, 0.35)' : 'rgba(217, 119, 6, 0.25)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(width, floorY);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
    for (var y = floorY + 24; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = isDarkTheme ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.12)';
    function drawShadow(fx) {
      ctx.beginPath();
      ctx.ellipse(fx, floorY + 1, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawShadow(fighterA.x);
    drawShadow(fighterB.x);

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isDarkTheme ? '#94a3b8' : '#64748b';
    ctx.fillText('FIGHTER A', fighterA.x, floorY + 22);
    ctx.fillText('FIGHTER B', fighterB.x, floorY + 22);
  }

  function loop(currentTime) {
    if (!lastTimestamp) lastTimestamp = currentTime;
    var rawDt = currentTime - lastTimestamp;
    lastTimestamp = currentTime;

    var maxDelta = CONFIG.animation.maxDeltaMs || 50;
    var dt = Math.min(maxDelta, rawDt) * root.timeScale;

    if (!isPaused && dt > 0) {
      if (fighterA.anim) fighterA.anim.update(dt);
      fighterA.update(dt);
      if (fighterB.anim) fighterB.anim.update(dt);
      fighterB.update(dt);
      effects.update(dt);
    }

    ctx.save();
    effects.applyCameraShake(ctx);

    renderArena();

    var floorY = CONFIG.canvas.floorY;
    fighterA.draw(ctx, floorY);
    fighterB.draw(ctx, floorY);

    effects.draw(ctx, CONFIG.canvas.width, CONFIG.canvas.height);

    ctx.restore();

    requestAnimationFrame(loop);
  }

  function start() {
    initDOM();
    setupFighters();
    setupEventListeners();
    updateStatusUI();
    logEvent('ARC Stick-Fighter Stage 2: 27-Move Engine loaded.', 'info');
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  root.ArcAnim = {
    getFighterA: function() { return fighterA; },
    getFighterB: function() { return fighterB; },
    getActiveFighter: function() { return activeFighter; },
    getEffects: function() { return effects; },
    runDemoReel: runDemoReel
  };
})(typeof window !== 'undefined' ? window : globalThis);
