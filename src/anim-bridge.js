/**
 * src/anim-bridge.js
 * 
 * Thin Animation Bridge Adapter for Stickman Wars.
 * 
 * Safely bridges the authoritative networking game logic (in src/fighter.js and src/main.js)
 * to the Code Fighters Animation Engine (in anim/rig.js, anim/poses.js, anim/effects.js,
 * anim/moves.js, and anim/fighter.js).
 * 
 * INVARIANTS:
 * 1. Cosmetic Only: The bridge NEVER calculates combat damage, decrements HP, or decides hit outcomes.
 *    Combat resolution remains 100% authoritative in src/fighter.js checkHit().
 * 2. Protocol Intact: WebSocket packets, timestamps, room codes, and payload schemas remain untouched.
 * 3. Graceful Degradation: If window.CF (or injected CF) is absent or fails to load, the bridge
 *    silently acts as a no-op, allowing the game to run without error using standard stick figures.
 * 4. Hold/Release Synchronization: Sustained actions (block/duck) mirror hold states smoothly.
 */

export class AnimationBridge {
  constructor(options = {}) {
    // Allow custom or injected CF context (e.g. in Node unit tests)
    this.cf = options.cf || (typeof window !== 'undefined' ? window.CF : null);
    this.enabled = options.enabled !== undefined ? Boolean(options.enabled) : true;
    this.useKinematicRendering = options.useKinematicRendering !== undefined ? Boolean(options.useKinematicRendering) : true;

    this.fighterA = null;
    this.fighterB = null;
    this.effects = null;

    this.initFighters();
  }

  /**
   * Check if the underlying animation engine (CF) is loaded and available
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(
      this.cf &&
      this.cf.Fighter &&
      this.cf.Effects &&
      this.cf.Poses &&
      (this.cf.resolveMove || this.cf.MOVES || this.cf.Moves)
    );
  }

  /**
   * Toggle adapter enabled status
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  /**
   * Whether the bridge is currently active
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled && this.isAvailable();
  }

  /**
   * Initialize or reinitialize CF.Fighter entities
   * @returns {boolean}
   */
  initFighters() {
    if (!this.isAvailable()) {
      this.fighterA = null;
      this.fighterB = null;
      this.effects = null;
      return false;
    }

    try {
      this.effects = this.cf.Effects;

      this.fighterA = new this.cf.Fighter({
        id: 'fighter_A',
        x: 200,
        facing: 1,
        accent: '#EF4444',
        ink: '#E5E7EB',
        swordColor: '#EF9F27',
        groundY: 190,
      });

      this.fighterB = new this.cf.Fighter({
        id: 'fighter_B',
        x: 440,
        facing: -1,
        accent: '#3B82F6',
        ink: '#E5E7EB',
        swordColor: '#EF9F27',
        groundY: 190,
      });

      return true;
    } catch (err) {
      console.warn('[AnimationBridge] Initialization failed, degrading gracefully:', err);
      this.fighterA = null;
      this.fighterB = null;
      this.effects = null;
      return false;
    }
  }

  /**
   * Get cosmetic animated fighter by role
   * @param {'A'|'B'} role 
   */
  getFighter(role) {
    if (role === 'A') return this.fighterA;
    if (role === 'B') return this.fighterB;
    return null;
  }

  /**
   * Handle combat action triggered locally or received via transport
   * @param {'A'|'B'} role - 'A' or 'B'
   * @param {'slash'|'block'|'duck'|'special'|'hurt'} actionName
   * @param {boolean} [isHold=false]
   */
  onAction(role, actionName, isHold = false) {
    if (!this.isEnabled()) return;
    const actor = this.getFighter(role);
    if (!actor) return;

    try {
      if (actionName === 'slash') {
        actor.play('slash');
      } else if (actionName === 'block') {
        if (typeof actor.setShield === 'function') {
          actor.setShield(true);
        }
        // When holding block, supply a long hold duration so the pose is sustained
        actor.play('block', { holdMs: isHold ? 60000 : 900 });
      } else if (actionName === 'duck') {
        if (typeof actor.setShield === 'function') {
          actor.setShield(false);
        }
        // When holding duck, supply a long hold duration so the crouch is sustained
        actor.play('duck', { holdMs: isHold ? 60000 : 900 });
      } else if (actionName === 'special') {
        actor.play('special', { tier: 'hard' });
        if (this.effects && this.effects.showBanner) {
          this.effects.showBanner('SPECIAL SLAM', 'CRITICAL IMPACT', 650);
        }
      } else if (actionName === 'guard_break') {
        this.onGuardBreak(role);
      } else if (actionName === 'hurt') {
        actor.react('hit');
      }
    } catch (err) {
      console.warn(`[AnimationBridge] Failed to play animation "${actionName}" for ${role}:`, err);
    }
  }

  /**
   * Handle release of a held action (e.g. block or duck)
   * @param {'A'|'B'} role 
   * @param {'block'|'duck'} actionName 
   */
  onRelease(role, actionName) {
    if (!this.isEnabled()) return;
    const actor = this.getFighter(role);
    if (!actor) return;

    try {
      if (actionName === 'block' && typeof actor.setShield === 'function') {
        actor.setShield(false);
      }
      const current = actor.currentMove ? actor.currentMove() : null;
      if (current && (current.name === actionName || current.name === 'block' || current.name === 'duck')) {
        actor.cancel(); // Smoothly returns to idle
      }
    } catch (err) {
      console.warn(`[AnimationBridge] Failed to release animation "${actionName}" for ${role}:`, err);
    }
  }

  /**
   * Handle authoritative combat strike landing
   * Called strictly AFTER target.checkHit() calculates the outcome
   * 
   * @param {'A'|'B'} attackerRole
   * @param {'A'|'B'} targetRole
   * @param {'HIT'|'BLOCKED'|'DODGED'} outcome
   */
  onCombatResolution(attackerRole, targetRole, outcome) {
    if (!this.isEnabled()) return;
    const target = this.getFighter(targetRole);
    if (!target) return;

    try {
      if (outcome === 'BLOCKED') {
        target.react('blocked');
        if (this.effects) {
          if (typeof this.effects.addSpark === 'function') {
            this.effects.addSpark(target.x, target.groundY - 50, 8);
          }
          if (typeof this.effects.addShieldShards === 'function') {
            this.effects.addShieldShards(target.x, target.groundY - 50, 4);
          }
        }
      } else if (outcome === 'DODGED') {
        target.react('dodged');
      } else if (outcome === 'HIT') {
        target.react('hit');
        if (this.effects && typeof this.effects.addSpark === 'function') {
          this.effects.addSpark(target.x, target.groundY - 50, 12);
        }
      }
    } catch (err) {
      console.warn(`[AnimationBridge] Failed to apply reaction for outcome "${outcome}":`, err);
    }
  }

  /**
   * Handle guard break event (continuous block over-hold)
   * @param {'A'|'B'} role
   */
  onGuardBreak(role) {
    if (!this.isEnabled()) return;
    const actor = this.getFighter(role);
    if (!actor) return;
    try {
      if (typeof actor.shieldBreak === 'function') {
        actor.shieldBreak();
      }
      actor.react('hit');
      if (this.effects && typeof this.effects.showBanner === 'function') {
        this.effects.showBanner('GUARD BREAK', 'DEFENSE SHATTERED', 800);
      }
    } catch (err) {
      console.warn(`[AnimationBridge] Failed to trigger guard break for ${role}:`, err);
    }
  }

  /**
   * Handle defeat / knockdown sequence
   * @param {'A'|'B'} role 
   */
  onDefeat(role) {
    if (!this.isEnabled()) return;
    const actor = this.getFighter(role);
    if (!actor) return;
    try {
      actor.play('knockdown');
    } catch (err) {
      console.warn(`[AnimationBridge] Failed to trigger knockdown for ${role}:`, err);
    }
  }

  /**
   * Update animation simulations and particle timers
   * @param {number} dt - delta time in milliseconds
   */
  update(dt) {
    if (!this.isEnabled()) return;

    try {
      if (this.effects) {
        this.effects.update(dt);
      }

      const isHitStop = this.effects && this.effects.isHitStopActive && this.effects.isHitStopActive();
      if (!isHitStop) {
        if (this.fighterA) this.fighterA.update(dt);
        if (this.fighterB) this.fighterB.update(dt);
      }
    } catch (err) {
      console.warn('[AnimationBridge] Update error:', err);
    }
  }

  /**
   * Apply camera shake transform to canvas context
   * @param {CanvasRenderingContext2D} ctx
   */
  applyCamera(ctx) {
    if (!this.isEnabled() || !this.effects || !this.effects.applyCamera) return;
    try {
      this.effects.applyCamera(ctx);
    } catch (_) {}
  }

  /**
   * Restore camera transform
   * @param {CanvasRenderingContext2D} ctx
   */
  restoreCamera(ctx) {
    if (!this.isEnabled() || !this.effects || !this.effects.restoreCamera) return;
    try {
      this.effects.restoreCamera(ctx);
    } catch (_) {}
  }

  /**
   * Draw floor-level background effects (shockwaves)
   * @param {CanvasRenderingContext2D} ctx
   */
  drawBackgroundEffects(ctx) {
    if (!this.isEnabled() || !this.effects || !this.effects.drawBackground) return;
    try {
      this.effects.drawBackground(ctx);
    } catch (_) {}
  }

  /**
   * Draw kinematic stick figures
   * @param {CanvasRenderingContext2D} ctx
   * @returns {boolean} true if drawn successfully
   */
  drawFighters(ctx) {
    if (!this.isEnabled()) return false;
    try {
      if (this.effects && this.effects.drawTrails) {
        this.effects.drawTrails(ctx, '#EF9F27');
      }
      if (this.fighterA) this.fighterA.draw(ctx);
      if (this.fighterB) this.fighterB.draw(ctx);
      return true;
    } catch (err) {
      console.warn('[AnimationBridge] Draw error:', err);
      return false;
    }
  }

  /**
   * Draw foreground particles, sparks, floating text, and special banners
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  drawForegroundEffects(ctx, width = 640, height = 360) {
    if (!this.isEnabled() || !this.effects) return;
    try {
      if (this.effects.drawParticles) {
        this.effects.drawParticles(ctx);
      }
      if (this.effects.drawFloatingTexts) {
        this.effects.drawFloatingTexts(ctx);
      }
      if (this.effects.drawOverlay) {
        this.effects.drawOverlay(ctx, width, height);
      }
    } catch (err) {
      console.warn('[AnimationBridge] drawForegroundEffects error:', err);
    }
  }
}

export const animBridge = new AnimationBridge();
export default animBridge;
