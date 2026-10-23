/**
 * ARC Stick-Fighter Animation Engine — Controller & Core Loop
 * Stage 2 Complete 27-Move Library
 */
(function(root) {
  'use strict';

  var Poses = root.Poses;
  var Fighter = root.Fighter;
  var CONFIG = root.CONFIG;

  var globalTimeScale = 1.0;

  function AnimationController(fighter) {
    this.fighter = fighter;
    this.currentMove = null;
    this.currentMoveName = 'idle';
    this.phases = [];
    this.currentPhaseIndex = -1;
    this.phaseDuration = 0;
    this.phaseElapsed = 0;
    this.elapsedMs = 0;
    this.events = [];
    this.isPlaying = false;
    this.isReturningToIdle = false;
    this.isLooping = false;
    this.wasStopped = false;
    this.currentOptions = {};
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.eventCallbacks = [];
  }

  AnimationController.prototype.onEvent = function(callback) {
    if (typeof callback === 'function') {
      this.eventCallbacks.push(callback);
      var self = this;
      return function() {
        self.eventCallbacks = self.eventCallbacks.filter(function(cb) {
          return cb !== callback;
        });
      };
    }
    return function() {};
  };

  AnimationController.prototype.emitEvent = function(eventName, data) {
    for (var i = 0; i < this.eventCallbacks.length; i++) {
      try {
        this.eventCallbacks[i](eventName, data, this.fighter);
      } catch (err) {
        console.error('Error in onEvent callback:', err);
      }
    }
  };

  /**
   * Resolve a move by name and options
   */
  function resolveMove(name, options) {
    var Catalogue = root.MoveCatalogue || (Poses ? Poses.MOVES : {});
    var Builders = root.MoveBuilders || {};

    // Dynamic builder check
    if (name === 'attack_horizontal' && Builders.buildAttackHorizontal && options && (options.tellAtMs || options.windupMs)) {
      return Builders.buildAttackHorizontal(options);
    }
    if (name === 'attack_vertical' && Builders.buildAttackVertical && options && (options.tellAtMs || options.windupMs)) {
      return Builders.buildAttackVertical(options);
    }
    if (name === 'feint' && Builders.buildFeint && options && options.tellAtMs) {
      return Builders.buildFeint(options);
    }

    if (Catalogue && Catalogue[name]) {
      return Catalogue[name];
    }

    // Check raw pose fallback
    if (Poses && Poses.POSES && Poses.POSES[name]) {
      return {
        name: name,
        category: 'basic',
        phases: [{ pose: Poses.POSES[name], durationMs: (options && options.durationMs) || 200 }],
        events: [],
        loop: false
      };
    }

    return null;
  }

  /**
   * Play a move sequence by name
   * @param {string} moveName 
   * @param {object} [options]
   * @returns {Promise}
   */
  AnimationController.prototype.play = function(moveName, options) {
    var self = this;
    options = options || {};

    var moveDef = resolveMove(moveName, options);
    if (!moveDef) {
      var errMsg = 'Unknown move: "' + moveName + '"';
      console.warn(errMsg);
      return Promise.reject(new Error(errMsg));
    }

    // Settle prior playing promise cleanly and emit interrupted event
    if ((this.isPlaying || this.isReturningToIdle) && this.resolvePromise) {
      var prior = this.resolvePromise;
      var priorMove = this.currentMoveName;
      this.resolvePromise = null;
      this.rejectPromise = null;
      this.emitEvent('interrupted', { move: priorMove, by: moveName });
      prior({ interrupted: true, move: priorMove, by: moveName });
    }

    this.currentMove = moveDef;
    this.currentMoveName = moveName;
    this.currentOptions = options;
    this.phases = moveDef.phases || [];
    this.isLooping = (options.loop !== undefined) ? !!options.loop : !!moveDef.loop;
    this.currentPhaseIndex = -1;
    this.elapsedMs = 0;
    this.wasStopped = false;

    // Clone event list and reset fired state
    this.events = (moveDef.events || []).map(function(e) {
      return { name: e.name, timeMs: e.timeMs, fired: false };
    });

    this.isPlaying = true;
    this.isReturningToIdle = false;
    this.fighter.isIdle = false;
    this.fighter.currentMoveName = moveName;

    return new Promise(function(resolve, reject) {
      self.resolvePromise = resolve;
      self.rejectPromise = reject;
      self.nextPhase(0, { shortestArc: true });
    });
  };

  AnimationController.prototype.nextPhase = function(overshoot, transitionOpts) {
    this.currentPhaseIndex++;
    if (this.currentPhaseIndex < this.phases.length) {
      var phase = this.phases[this.currentPhaseIndex];
      this.phaseDuration = Math.max(1, phase.durationMs || 140);
      this.phaseElapsed = Math.min(overshoot || 0, this.phaseDuration - 1);
      this.fighter.transitionTo(phase.pose, this.phaseDuration, transitionOpts);

      if (phase.event) {
        this.emitEvent(phase.event, { move: this.currentMoveName, phase: this.currentPhaseIndex });
      }
    } else {
      // Completed all phases of the move
      if (this.isLooping) {
        this.currentPhaseIndex = -1;
        this.elapsedMs = 0;
        for (var i = 0; i < this.events.length; i++) {
          this.events[i].fired = false;
        }
        this.nextPhase(overshoot);
      } else if (this.currentOptions && (this.currentOptions.returnToIdle === false || this.currentOptions.hold === true)) {
        // Hold final pose or direct link completion without returning to idle
        this.isPlaying = false;
        this.isReturningToIdle = false;
        this.fighter.isIdle = false;
        this.emitEvent('completed', { move: this.currentMoveName });

        if (this.resolvePromise) {
          var res = this.resolvePromise;
          this.resolvePromise = null;
          this.rejectPromise = null;
          res({ completed: true, move: this.currentMoveName });
        }
      } else {
        this.returnToIdle(overshoot);
      }
    }
  };

  AnimationController.prototype.returnToIdle = function(overshoot) {
    this.isReturningToIdle = true;
    var duration = CONFIG.animation.returnToIdleMs || 180;
    this.phaseDuration = duration;
    this.phaseElapsed = Math.min(overshoot || 0, this.phaseDuration - 1);
    this.fighter.transitionTo(Poses.POSES.idle, duration, { shortestArc: true });
  };

  AnimationController.prototype.playChain = function(moveNames, options) {
    if (!Array.isArray(moveNames) || moveNames.length === 0) {
      return Promise.resolve({ completed: true });
    }

    var self = this;
    var chain = moveNames.slice();
    options = options || {};

    function step() {
      if (chain.length === 0) {
        return Promise.resolve({ completed: true });
      }
      var next = chain.shift();
      var isLast = (chain.length === 0);
      var moveOpts = Object.assign({}, options);
      // Intermediate chain moves transition directly into the next move
      if (!isLast && moveOpts.returnToIdle === undefined) {
        moveOpts.returnToIdle = false;
      }

      return self.play(next, moveOpts).then(function(res) {
        if (res && (res.interrupted || res.stopped)) return res;
        return step();
      });
    }

    return step();
  };

  AnimationController.prototype.stop = function() {
    this.isLooping = false;
    if (this.isPlaying || this.isReturningToIdle) {
      // Cancel all unfired move events so they do not trigger during returnToIdle
      for (var i = 0; i < this.events.length; i++) {
        this.events[i].fired = true;
      }
      this.wasStopped = true;
      this.isPlaying = false;
      this.returnToIdle();
      this.emitEvent('stopped', { move: this.currentMoveName });

      if (this.resolvePromise) {
        var res = this.resolvePromise;
        this.resolvePromise = null;
        this.rejectPromise = null;
        res({ stopped: true, move: this.currentMoveName });
      }
    }
  };

  AnimationController.prototype.update = function(dt) {
    if (!this.isPlaying && !this.isReturningToIdle) {
      return;
    }

    // Dispatch timed keyframe events exactly once (only if not stopped)
    if (!this.wasStopped) {
      for (var e = 0; e < this.events.length; e++) {
        var evt = this.events[e];
        if (!evt.fired && (this.elapsedMs + dt >= evt.timeMs)) {
          evt.fired = true;
          this.emitEvent(evt.name, { move: this.currentMoveName, timeMs: evt.timeMs });
        }
      }
    }

    this.elapsedMs += dt;
    this.phaseElapsed += dt;

    if (this.phaseElapsed >= this.phaseDuration) {
      if (this.isReturningToIdle) {
        this.isPlaying = false;
        this.isReturningToIdle = false;
        this.fighter.isIdle = true;
        this.fighter.currentMoveName = 'idle';

        if (!this.wasStopped) {
          this.emitEvent('completed', { move: this.currentMoveName });
        }

        if (this.resolvePromise) {
          var res = this.resolvePromise;
          this.resolvePromise = null;
          this.rejectPromise = null;
          res({ completed: !this.wasStopped, stopped: this.wasStopped, move: this.currentMoveName });
        }
      } else {
        var overshoot = this.phaseElapsed - this.phaseDuration;
        this.nextPhase(overshoot);
      }
    }
  };

  function enhanceFighter(fighter) {
    var controller = new AnimationController(fighter);
    fighter.anim = controller;

    fighter.play = function(moveName, options) {
      return controller.play(moveName, options);
    };

    fighter.playChain = function(moveNames, options) {
      return controller.playChain(moveNames, options);
    };

    fighter.stop = function() {
      return controller.stop();
    };

    fighter.onEvent = function(callback) {
      return controller.onEvent(callback);
    };

    return fighter;
  }

  function createFighter(id, x, facing, options) {
    var f = new Fighter(id, x, facing, options);
    return enhanceFighter(f);
  }

  root.createFighter = createFighter;
  root.AnimationController = AnimationController;

  Object.defineProperty(root, 'timeScale', {
    get: function() { return globalTimeScale; },
    set: function(val) {
      if (typeof val === 'number' && val > 0) {
        globalTimeScale = val;
      }
    },
    configurable: true,
    enumerable: true
  });
})(typeof window !== 'undefined' ? window : globalThis);
