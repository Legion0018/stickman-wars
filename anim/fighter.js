// anim/fighter.js - Code Fighters Fighter Entity & Controller
// Classic script format: attaches directly to window.CF
// Follows anim/STYLE.md:
// - Rule 1 (Clean line weights, single outline head, round caps/joins).
// - Rule 3 (Readable silhouette support).
// - Rule 4 (Snappy combat timing, 60-100ms hit-stop on impact).
// - Rule 7 (Idle breathing fades to zero during moves; slight tension tremble on held tell).
// - Rule 8 (Minimal effects only: hit/block star sparks, dust, floating reaction words).
window.CF = window.CF || {};

(function () {
  'use strict';

  let nextFighterId = 1;

  /**
   * CF.Fighter Constructor
   * CONTRACT.md: new CF.Fighter({x, facing: 1 or -1, accent: '#hex'})
   */
  function Fighter(options) {
    options = options || {};
    this.id = options.id || ('fighter_' + (nextFighterId++));
    this.x = (options.x !== undefined) ? options.x : 200;
    this.facing = (options.facing === -1) ? -1 : 1;
    this.accent = options.accent || '#EF4444';
    this.ink = options.ink || '#E5E7EB';
    this.swordColor = options.swordColor || this.accent;
    this.groundY = (options.groundY !== undefined) ? options.groundY : CF.RIG.groundY;
    this.silhouette = false;

    // Drawing options cache to avoid object creation in draw loop
    this.drawOptions = {
      facing: this.facing,
      ink: this.ink,
      accent: this.accent,
      swordColor: this.swordColor,
      groundY: this.groundY,
      debug: false,
      silhouette: false,
      breath: 0
    };

    // Pose states (pre-allocated to avoid GC churn)
    this.currentPose = CF.clonePose(CF.Poses.idle);
    this.blendFromPose = CF.clonePose(CF.Poses.idle);
    this.blendToPose = CF.clonePose(CF.Poses.idle);

    // Current move playback state
    this._playSeq = 0;
    this._currentPlayId = 0;
    this._currentMoveName = 'idle';
    this._currentTags = ['persistent'];
    this._moveData = CF.resolveMove('idle');
    this._elapsedMs = 0;
    this._totalMs = 1200;
    this._strikeMs = null;
    this._speed = 1.0;
    this._isBusy = false;

    // Direction resolution for telegraphed attacks
    this._pendingDir = null;        // 'pending', 'h', or 'v'
    this._isWaitingForDir = false;  // true if paused at tellMs waiting for resolveDir
    this._firedTell = false;

    // Shield state
    this.hasShield = false;

    // Event listeners: strike, tell, parry, end, shieldBreak
    this._listeners = {
      strike: [],
      tell: [],
      parry: [],
      end: [],
      shieldBreak: []
    };

    // Tracking fired events per move instance
    this._firedEventIndices = {};

    // Subtle idle breathing (strictly controlled by breathWeight)
    this.breathTimer = Math.random() * 10;
    this.breathWeight = 1.0;
  }

  /**
   * Event registration
   * events: 'strike' {strikeIndex, tag}, 'tell' {dir}, 'parry', 'end', 'shieldBreak'
   */
  Fighter.prototype.on = function (event, cb) {
    if (this._listeners[event]) {
      this._listeners[event].push(cb);
    }
    return this;
  };

  Fighter.prototype.emit = function (event, data) {
    const list = this._listeners[event];
    if (list && list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        try {
          list[i](data);
        } catch (err) {
          console.error('[CF.Fighter] Event listener error (' + event + '):', err);
        }
      }
    }
  };

  /**
   * CONTRACT.md: f.play(name, opts) returns {id, totalMs, strikeMs}
   * opts: speed (1), tier ('easy','medium','hard'), holdMs, windupMs (3000), tellMs (2000), dir ('h', 'v' or 'pending')
   */
  Fighter.prototype.play = function (name, opts) {
    opts = opts || {};
    this._playSeq++;
    this._currentPlayId = this._playSeq;

    // Resolve move definition or dynamic move
    const move = CF.resolveMove(name, opts);
    this._moveData = move;
    this._currentMoveName = name;
    this._currentTags = move.tags ? move.tags.slice() : [];
    this._speed = (opts.speed !== undefined && opts.speed > 0) ? opts.speed : 1.0;
    this._elapsedMs = 0;
    this._totalMs = move.totalMs;
    this._strikeMs = (move.strikeMs !== undefined) ? move.strikeMs : null;
    this._firedEventIndices = {};
    this._firedTell = false;

    // Direction resolution setup
    if (name === 'enemyAttack' || name === 'feint') {
      this._pendingDir = opts.dir || 'h';
      this._isWaitingForDir = false;
    } else {
      this._pendingDir = null;
      this._isWaitingForDir = false;
    }

    // Busy flag: non-persistent moves make the fighter busy
    this._isBusy = !move.persistent;

    // Fade out breathing immediately on starting any non-idle move
    if (name !== 'idle') {
      this.breathWeight = 0.0;
    }

    // Return contract receipt
    return {
      id: this._currentPlayId,
      totalMs: this._totalMs,
      strikeMs: this._strikeMs
    };
  };

  /**
   * CONTRACT.md & Addendum 3:
   * f.resolveDir(dir) supplies the direction when play used dir 'pending'.
   * If it has not arrived by tellMs the fighter holds the neutral coil until it does.
   */
  Fighter.prototype.resolveDir = function (dir) {
    if (!dir || (dir !== 'h' && dir !== 'v')) {
      dir = 'h';
    }

    if (this._currentMoveName === 'enemyAttack' || this._currentMoveName === 'feint') {
      this._pendingDir = dir;

      // If fighter was paused waiting at tellMs:
      if (this._isWaitingForDir) {
        this._isWaitingForDir = false;
        if (!this._firedTell) {
          this._firedTell = true;
          this.emit('tell', { dir: dir });
          CF.Effects.addFloatingText('TELL: ' + dir.toUpperCase(), this.x, this.groundY - 70, '#38BDF8');
        }
      }
    }
  };

  /**
   * CONTRACT.md: f.currentMove() returns {name, tags, elapsedMs}
   */
  Fighter.prototype.currentMove = function () {
    return {
      name: this._currentMoveName,
      tags: this._currentTags ? this._currentTags.slice() : [],
      elapsedMs: Math.floor(this._elapsedMs)
    };
  };

  /**
   * CONTRACT.md: f.isBusy()
   */
  Fighter.prototype.isBusy = function () {
    return this._isBusy;
  };

  /**
   * CONTRACT.md: f.cancel()
   */
  Fighter.prototype.cancel = function () {
    this._isBusy = false;
    this._isWaitingForDir = false;
    this.play('idle');
  };

  /**
   * CONTRACT.md: f.reset()
   */
  Fighter.prototype.reset = function () {
    this._isBusy = false;
    this._isWaitingForDir = false;
    this._pendingDir = null;
    this.hasShield = false;
    CF.Effects.clearTrail(this.id);
    this.play('idle');
  };

  /**
   * CONTRACT.md: f.react(name)
   * name is 'blocked', 'dodged', 'parried' or 'hit'
   * Addendum 4: Add f.react('hit') as an alias that plays the hurt reaction.
   */
  Fighter.prototype.react = function (name) {
    if (name === 'hit') {
      this.play('hurt');
      CF.Effects.addHitSpark(this.x, this.groundY - 48, '#EF4444');
      CF.Effects.addFloatingText('HIT', this.x, this.groundY - 65, '#EF4444');
      CF.Effects.shake(4, 140);
      CF.Effects.hitStop(80); // 80ms hit-stop freeze
    } else if (name === 'blocked') {
      this.play('blockRecoil');
      CF.Effects.addBlockSpark(this.x + this.facing * 18, this.groundY - 48);
      CF.Effects.addFloatingText('BLOCKED', this.x, this.groundY - 65, '#38BDF8');
      CF.Effects.shake(2, 100);
      CF.Effects.hitStop(60);
    } else if (name === 'dodged') {
      CF.Effects.addDust(this.x, this.groundY, 3);
      CF.Effects.addFloatingText('DODGED', this.x, this.groundY - 65, '#38BDF8');
    } else if (name === 'parried') {
      this.play('block');
      CF.Effects.addBlockSpark(this.x + this.facing * 20, this.groundY - 50);
      CF.Effects.addFloatingText('PARRY', this.x, this.groundY - 65, '#A855F7');
      CF.Effects.shake(4, 150);
      CF.Effects.hitStop(90);
      this.emit('parry', {});
    }
  };

  /**
   * CONTRACT.md: f.setShield(bool)
   */
  Fighter.prototype.setShield = function (bool) {
    this.hasShield = !!bool;
    if (this.hasShield) {
      CF.Effects.addFloatingText('SHIELD', this.x, this.groundY - 70, '#38BDF8');
    }
  };

  /**
   * CONTRACT.md: f.shieldBreak()
   */
  Fighter.prototype.shieldBreak = function () {
    this.hasShield = false;
    CF.Effects.addShieldShards(this.x, this.groundY - 45, 14);
    CF.Effects.shake(5, 200);
    CF.Effects.addFloatingText('SHIELD BREAK', this.x, this.groundY - 70, '#EF4444');
    this.play('stumble');
    this.emit('shieldBreak', {});
  };

  /**
   * CONTRACT.md: f.update(dtMs)
   */
  Fighter.prototype.update = function (dtMs) {
    dtMs = dtMs || 16.6;

    // Breathing progression (Rule 7: idle breathing applies only while idle)
    if (this._currentMoveName === 'idle') {
      this.breathWeight = Math.min(1.0, this.breathWeight + (dtMs / 300));
    } else {
      this.breathWeight = Math.max(0.0, this.breathWeight - (dtMs / 100));
    }
    this.breathTimer += (dtMs / 1000) * 3.0;
    this.drawOptions.breath = Math.sin(this.breathTimer) * this.breathWeight;

    // If waiting for pending direction at tellMs:
    if (this._isWaitingForDir) {
      // Locked in neutral coil pose
      CF.interpolatePose(CF.Poses.enemyCoil, CF.Poses.enemyCoil, 1, 'linear', this.currentPose);
      return;
    }

    // Scale delta time by speed
    const effectiveDt = dtMs * this._speed;
    const prevElapsed = this._elapsedMs;
    this._elapsedMs += effectiveDt;

    const move = this._moveData;
    const kfs = move.keyframes;

    // Check telegraphed attack pending condition
    if ((this._currentMoveName === 'enemyAttack' || this._currentMoveName === 'feint') && move.tellMs) {
      if (prevElapsed < move.tellMs && this._elapsedMs >= move.tellMs) {
        if (this._pendingDir === 'pending') {
          // Pause at tellMs!
          this._elapsedMs = move.tellMs;
          this._isWaitingForDir = true;
          return;
        } else {
          // Direction is known, fire tell event
          if (!this._firedTell) {
            this._firedTell = true;
            this.emit('tell', { dir: this._pendingDir || 'h' });
            CF.Effects.addFloatingText('TELL: ' + (this._pendingDir || 'h').toUpperCase(), this.x, this.groundY - 70, '#38BDF8');
          }
        }
      }
    }

    // Check move events (e.g. 'strike', 'parry', 'dust')
    if (move.events && move.events.length > 0) {
      for (let i = 0; i < move.events.length; i++) {
        const ev = move.events[i];
        if (!this._firedEventIndices[i] && prevElapsed <= ev.t && this._elapsedMs >= ev.t) {
          this._firedEventIndices[i] = true;

          if (ev.name === 'strike') {
            const evData = Object.assign({}, ev.data);
            if (this._pendingDir) evData.dir = this._pendingDir;
            this.emit('strike', evData);

            // Audio-visual combat feedback & hit-stop (Rule 4)
            CF.Effects.hitStop(evData.tag === 'slam' ? 90 : 70);
            CF.Effects.shake(evData.tag === 'slam' ? 6 : 3, 140);

            if (evData.tag === 'slam') {
              CF.Effects.addShockwave(this.x + this.facing * 70, this.groundY, 70, '#EF4444');
              CF.Effects.addDust(this.x + this.facing * 70, this.groundY, 5);
            }
          } else if (ev.name === 'tell') {
            if (!this._firedTell && this._pendingDir !== 'pending') {
              this._firedTell = true;
              this.emit('tell', { dir: this._pendingDir || 'h' });
            }
          } else if (ev.name === 'parry') {
            this.emit('parry', ev.data);
          } else if (ev.name === 'banner') {
            CF.Effects.showBanner(ev.data.text, ev.data.subtext, 400);
          } else if (ev.name === 'dust' || ev.name === 'land') {
            CF.Effects.addDust(this.x, this.groundY, ev.data.count || 4);
          }
        }
      }
    }

    // Check move completion
    if (this._elapsedMs >= this._totalMs) {
      if (move.loop) {
        this._elapsedMs = this._elapsedMs % this._totalMs;
        this._firedEventIndices = {};
        this._firedTell = false;
      } else if (move.persistent) {
        // Hold final pose
        this._elapsedMs = this._totalMs;
        this._isBusy = false;
      } else {
        // Complete non-persistent move
        this._isBusy = false;
        this.emit('end', { move: this._currentMoveName });
        // Return to idle
        this.play('idle');
        return;
      }
    }

    // Sample current pose from keyframes
    if (kfs && kfs.length > 0) {
      const curT = Math.min(this._elapsedMs, this._totalMs);

      if (curT <= kfs[0].t) {
        CF.clonePose(kfs[0].pose, this.currentPose);
      } else if (curT >= kfs[kfs.length - 1].t) {
        CF.clonePose(kfs[kfs.length - 1].pose, this.currentPose);
      } else {
        // Locate segment
        for (let i = 0; i < kfs.length - 1; i++) {
          const kfA = kfs[i];
          const kfB = kfs[i + 1];
          if (curT >= kfA.t && curT <= kfB.t) {
            const segDuration = kfB.t - kfA.t;
            const segT = (segDuration > 0) ? (curT - kfA.t) / segDuration : 1.0;

            // Dynamic direction pose swap for telegraphed moves
            let poseB = kfB.pose;
            if (this._currentMoveName === 'enemyAttack' || this._currentMoveName === 'feint') {
              if (this._pendingDir === 'v') {
                if (kfB.pose === CF.Poses.tellH) poseB = CF.Poses.tellV;
                if (kfB.pose === CF.Poses.strikeH) poseB = CF.Poses.strikeV;
              }
            }

            CF.interpolatePose(kfA.pose, poseB, segT, kfB.ease || 'easeInOut', this.currentPose);
            break;
          }
        }
      }
    }

    // Rule 7: Very slight tremble during the held tell pose of enemyAttack
    if ((this._currentMoveName === 'enemyAttack' || this._currentMoveName === 'feint') &&
        move.tellMs && move.windupMs &&
        this._elapsedMs >= (move.tellMs + 280) && this._elapsedMs < move.windupMs) {
      const tremble = (Math.floor(this._elapsedMs / 40) % 2 === 0) ? 0.5 : -0.5;
      this.currentPose.dx += tremble;
    }
  };

  /**
   * CONTRACT.md: f.draw(ctx)
   */
  Fighter.prototype.draw = function (ctx, options) {
    options = options || {};
    this.drawOptions.facing = this.facing;
    this.drawOptions.accent = this.accent;
    this.drawOptions.ink = this.ink;
    this.drawOptions.swordColor = this.swordColor;
    this.drawOptions.groundY = this.groundY;
    this.drawOptions.silhouette = (options.silhouette !== undefined) ? options.silhouette : (this.silhouette || false);

    // Draw stick figure
    CF.drawFighter(ctx, this.x, this.currentPose, this.drawOptions);

    // Compute joints to record sword tip for motion trails
    const joints = CF.computeJoints(this.x, this.currentPose, this.facing, this.groundY);
    // Rule 8: Short trail only on strikes
    const isStriking = (this._currentTags && this._currentTags.indexOf('attack') !== -1) &&
                       this._moveData.strikeMs &&
                       Math.abs(this._elapsedMs - this._moveData.strikeMs) <= 100;
    CF.Effects.recordTrailPoint(this.id, joints.swordTip[0], joints.swordTip[1], isStriking);

    // Draw active shield dome if equipped
    if (this.hasShield) {
      CF.Effects.drawShieldDome(ctx, joints.torsoCenter[0], joints.torsoCenter[1], 42, '#38BDF8');
    }
  };

  CF.Fighter = Fighter;
})();
