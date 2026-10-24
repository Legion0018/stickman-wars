/**
 * Fighter Class
 * 
 * Manages pose state, interpolation, move queue, canvas rendering,
 * and combat resolution (checkHit).
 */

import {
  POSES,
  MOVES,
  JOINT_KEYS,
  clonePose,
  lerp,
  easeInOutQuad,
} from './poses.js';

/**
 * Authoritative Combat Balancing Configuration
 * Centralized specifications for HP, damage, defense, healing, and cooldowns.
 */
export const COMBAT_CONFIG = {
  maxHp: 100,
  normalDamage: 10,
  blockedNormalDamage: 2,  // 80% damage reduction on ordinary attack
  heavyDamage: 20,
  blockedHeavyDamage: 4,   // 80% damage reduction on heavy attack
  healAmount: 25,
  maxHealUses: 1,          // Strictly 1 heal per player per match
  heavyCooldownMs: 2500,   // Heavy attack cooldown
  maxBlockDurationMs: 3000, // 3-second maximum continuous block before guard break
  guardBreakStunMs: 800,   // Guard break vulnerable recovery duration
  healRecoveryMs: 600,     // Short recovery period during healing
};

export class Fighter {
  /**
   * @param {string} id - 'A' or 'B'
   * @param {string} ink - Stroke color for body ('#333333' or similar)
   * @param {string} swordColor - Color for sword blade ('#EF9F27')
   */
  constructor(id = 'A', ink = '#333333', swordColor = '#EF9F27') {
    this.id = id;
    this.ink = ink;
    this.swordColor = swordColor;

    // Current interpolated joint positions
    this.currentPose = clonePose(POSES.idle);
    this.fromPose = clonePose(POSES.idle);
    this.targetPose = clonePose(POSES.idle);

    // Transition state
    this.stageDuration = 0;
    this.stageElapsed = 0;
    this.currentStage = null;
    this.currentStageIndex = -1;
    this.currentMoveStages = [];
    this.currentMoveName = null;
    this.isIdle = true;

    // Sustained hold state (e.g. holding K for block or L for duck)
    this.isHoldingBlock = false;
    this.isHoldingDuck = false;

    // Strike landing callback & timer (slash strike lands at ~310ms)
    this.strikeLandTimer = -1;
    this.onStrikeLandCallback = null;

    // Breath oscillation
    this.breathTimer = 0;

    // Special Slam sequence state
    this.specialSlamActive = false;
    this.specialSlamTimer = 0;
    this.specialSlamDuration = 650; // ms for the banner sequence
    this.specialSlamOnStrikeLand = null;

    // Health and combat HUD state
    this.maxHp = COMBAT_CONFIG.maxHp;
    this.hp = COMBAT_CONFIG.maxHp;

    // Healing & Cooldown State (Authoritative Invariants)
    this.healUsesRemaining = COMBAT_CONFIG.maxHealUses;
    this.healUsed = false;
    this.heavyCooldownTimer = 0;
    this.blockHoldTimer = 0;
    this.isGuardBroken = false;
    this.guardBreakTimer = 0;
    this.healRecoveryTimer = 0;
    this.onGuardBreakCallback = null;

    // Floating combat feedback text
    this.floatingTexts = [];
  }

  /**
   * Set holding state for block or duck
   */
  setHolding(action, isHolding) {
    if (action === 'block') {
      if (isHolding && this.isGuardBroken) {
        this.addFloatingText('GUARD BROKEN', '#ef4444');
        return;
      }
      this.isHoldingBlock = isHolding;
      if (!isHolding) {
        this.blockHoldTimer = 0;
        if (this.currentMoveName === 'block' && this.currentStageIndex >= this.currentMoveStages.length - 1) {
          this.returnToIdle();
        }
      }
    } else if (action === 'duck') {
      this.isHoldingDuck = isHolding;
      if (!isHolding && this.currentMoveName === 'duck' && this.currentStageIndex >= this.currentMoveStages.length - 1) {
        this.returnToIdle();
      }
    }
  }

  /**
   * Play a move sequence by name ('slash', 'block', 'duck', 'hurt')
   * @param {string} moveName 
   * @param {Function} [onStrikeLand] - Callback triggered when strike lands (~310ms for slash)
   */
  playMove(moveName, onStrikeLand = null) {
    const sequence = MOVES[moveName];
    if (!sequence) {
      console.warn(`Unknown move: ${moveName}`);
      return;
    }

    // Hurt interrupts any active move
    if (moveName === 'hurt') {
      this.specialSlamActive = false;
      this.strikeLandTimer = -1;
      this.onStrikeLandCallback = null;
    }

    this.currentMoveName = moveName;
    this.isIdle = false;
    this.currentMoveStages = sequence.map(([pose, ms]) => {
      // Resolve pose if passed as a string or object
      const resolvedPose = typeof pose === 'string' ? POSES[pose] : pose;
      return { pose: resolvedPose, duration: ms };
    });

    this.currentStageIndex = -1;

    // Strike lands at ~310ms for slash (220ms windup + 90ms strike)
    if (moveName === 'slash') {
      this.strikeLandTimer = 310;
      this.onStrikeLandCallback = onStrikeLand;
    } else {
      this.strikeLandTimer = -1;
      this.onStrikeLandCallback = null;
    }

    this.nextStage();
  }

  /**
   * Advance to the next stage in the move sequence
   */
  nextStage() {
    this.currentStageIndex++;
    if (this.currentStageIndex < this.currentMoveStages.length) {
      const stage = this.currentMoveStages[this.currentStageIndex];
      this.fromPose = clonePose(this.currentPose);
      this.targetPose = stage.pose;
      this.stageDuration = stage.duration;
      this.stageElapsed = 0;
      this.currentStage = stage;
    } else {
      // Check if this move is being held
      if (this.currentMoveName === 'block' && this.isHoldingBlock) {
        // Remain holding in the final block pose
        this.fromPose = clonePose(this.targetPose);
        this.stageElapsed = 0;
        this.stageDuration = 1000;
        return;
      }
      if (this.currentMoveName === 'duck' && this.isHoldingDuck) {
        // Remain holding in the final duck pose
        this.fromPose = clonePose(this.targetPose);
        this.stageElapsed = 0;
        this.stageDuration = 1000;
        return;
      }

      this.returnToIdle();
    }
  }

  /**
   * Transition smoothly back to idle pose
   */
  returnToIdle(durationMs = 140) {
    this.currentMoveName = null;
    this.fromPose = clonePose(this.currentPose);
    this.targetPose = POSES.idle;
    this.stageDuration = durationMs;
    this.stageElapsed = 0;
    this.currentStage = { pose: POSES.idle, duration: durationMs };
    this.currentMoveStages = [];
    this.currentStageIndex = 0;
  }

  /**
   * Start Special Slam Sequence (Heavy Strike):
   * Dims screen, sweeps orange banner (#D85A30) with bold text "SPECIAL SLAM",
   * then executes the slash with heavy damage.
   * Enforces heavy cooldown of 2500ms.
   */
  playSpecialSlam(onStrikeLand = null) {
    if (this.heavyCooldownTimer > 0) {
      this.addFloatingText(`COOLDOWN (${(this.heavyCooldownTimer / 1000).toFixed(1)}s)`, '#ef9f27');
      return false;
    }
    this.specialSlamActive = true;
    this.specialSlamTimer = 0;
    this.specialSlamOnStrikeLand = onStrikeLand;
    this.heavyCooldownTimer = COMBAT_CONFIG.heavyCooldownMs;
    return true;
  }

  /**
   * Check whether this fighter is eligible to heal
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canHeal() {
    if (this.healUsesRemaining <= 0 || this.healUsed) {
      return { allowed: false, reason: 'Heal already used this match (1x limit)' };
    }
    if (this.hp >= this.maxHp) {
      return { allowed: false, reason: 'Health is already full (100 HP)' };
    }
    if (this.currentMoveName === 'hurt' || this.isGuardBroken) {
      return { allowed: false, reason: 'Cannot heal while stunned or hurt' };
    }
    if (this.specialSlamActive || this.currentMoveName === 'special') {
      return { allowed: false, reason: 'Cannot heal during heavy attack' };
    }
    if (this.healRecoveryTimer > 0) {
      return { allowed: false, reason: 'Healing action in progress' };
    }
    return { allowed: true };
  }

  /**
   * Authoritative Healing execution
   * Restores up to 25 HP, strictly capped at maxHp (100).
   * Limited to 1 use per match.
   * @returns {{ success: boolean, healedAmount: number, newHp: number, reason?: string }}
   */
  heal() {
    const check = this.canHeal();
    if (!check.allowed) {
      this.addFloatingText(check.reason || 'Heal rejected', '#ef4444');
      return { success: false, healedAmount: 0, newHp: this.hp, reason: check.reason };
    }
    this.healUsed = true;
    this.healUsesRemaining = 0;
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + COMBAT_CONFIG.healAmount);
    const healedAmount = this.hp - oldHp;
    this.healRecoveryTimer = COMBAT_CONFIG.healRecoveryMs;
    this.addFloatingText(`+${healedAmount} HP`, '#10b981');
    return { success: true, healedAmount, newHp: this.hp };
  }

  /**
   * Trigger Guard Break when continuous block hold exceeds maxBlockDurationMs
   */
  triggerGuardBreak() {
    this.isHoldingBlock = false;
    this.blockHoldTimer = 0;
    this.isGuardBroken = true;
    this.guardBreakTimer = COMBAT_CONFIG.guardBreakStunMs;
    this.playMove('hurt');
    this.addFloatingText('GUARD BREAK!', '#ef4444');
    if (typeof this.onGuardBreakCallback === 'function') {
      try {
        this.onGuardBreakCallback();
      } catch (_) {}
    }
  }

  /**
   * Combat Resolution:
   * When receiving a strike hit event:
   * - If currently holding/playing 'block' and not guard broken:
   *     mitigates 80% damage (takes 2 on normal, 4 on heavy). Returns 'BLOCKED'.
   * - If playing 'duck': mitigates 100% damage (takes 0). Returns 'DODGED'.
   * - Otherwise takes full damage (10 on normal, 20 on heavy) and triggers 'hurt'. Returns 'HIT'.
   * 
   * @param {string} incomingAction - 'slash' | 'special' | 'heavy'
   * @param {'normal' | 'heavy'} [attackType='normal']
   * @returns {'HIT' | 'BLOCKED' | 'DODGED'}
   */
  checkHit(incomingAction = 'slash', attackType = 'normal') {
    const isHeavy = attackType === 'heavy' || incomingAction === 'special';
    let outcome = 'HIT';
    let damageTaken = 0;

    const isBlocking = (this.currentMoveName === 'block' || this.isHoldingBlock) && !this.isGuardBroken;
    const isDucking = (this.currentMoveName === 'duck' || this.isHoldingDuck);

    if (isBlocking) {
      outcome = 'BLOCKED';
      damageTaken = isHeavy ? COMBAT_CONFIG.blockedHeavyDamage : COMBAT_CONFIG.blockedNormalDamage;
      this.hp = Math.max(0, this.hp - damageTaken);
    } else if (isDucking) {
      outcome = 'DODGED';
      damageTaken = 0;
    } else {
      outcome = 'HIT';
      damageTaken = isHeavy ? COMBAT_CONFIG.heavyDamage : COMBAT_CONFIG.normalDamage;
      this.hp = Math.max(0, this.hp - damageTaken);
      this.playMove('hurt');
    }

    this.addFloatingText(outcome, null, damageTaken);
    return outcome;
  }

  /**
   * Reset health to max HP and clear cooldowns/guard states
   */
  resetHp() {
    this.hp = this.maxHp;
    this.healUsesRemaining = COMBAT_CONFIG.maxHealUses;
    this.healUsed = false;
    this.heavyCooldownTimer = 0;
    this.blockHoldTimer = 0;
    this.isGuardBroken = false;
    this.guardBreakTimer = 0;
    this.healRecoveryTimer = 0;
  }

  /**
   * Add floating feedback text above fighter
   * @param {string} outcome
   * @param {string} [customColor=null]
   * @param {number} [damage=0]
   */
  addFloatingText(outcome, customColor = null, damage = 0) {
    let color = customColor || '#ef4444'; // Red for HIT
    let text = outcome;
    if (outcome === 'BLOCKED') {
      color = customColor || '#38bdf8'; // Cyan-Blue for BLOCKED
      text = 'BLOCKED!';
    } else if (outcome === 'DODGED') {
      color = customColor || '#10b981'; // Emerald Green for DODGED
      text = 'DODGED!';
    } else if (outcome === 'HIT') {
      color = customColor || '#ef4444';
      text = 'HIT!';
    }

    this.floatingTexts.push({
      text,
      damage,
      color,
      yOffset: -102,
      alpha: 1.0,
      lifeMs: 1200,
      maxLifeMs: 1200,
    });
  }

  /**
   * Update animation, interpolation, and timers
   * @param {number} dt - delta time in ms
   */
  update(dt) {
    this.breathTimer += dt;

    // Heavy attack cooldown decrement
    if (this.heavyCooldownTimer > 0) {
      this.heavyCooldownTimer = Math.max(0, this.heavyCooldownTimer - dt);
    }

    // Heal recovery period decrement
    if (this.healRecoveryTimer > 0) {
      this.healRecoveryTimer = Math.max(0, this.healRecoveryTimer - dt);
    }

    // Guard break recovery timer decrement
    if (this.isGuardBroken) {
      this.guardBreakTimer -= dt;
      if (this.guardBreakTimer <= 0) {
        this.isGuardBroken = false;
        this.guardBreakTimer = 0;
        this.returnToIdle();
      }
    }

    // Continuous block hold guard break tracking
    if (this.isHoldingBlock && (this.currentMoveName === 'block' || this.isHoldingBlock) && !this.isGuardBroken) {
      this.blockHoldTimer += dt;
      if (this.blockHoldTimer >= COMBAT_CONFIG.maxBlockDurationMs) {
        this.triggerGuardBreak();
      }
    } else {
      this.blockHoldTimer = 0;
    }

    // Handle strike land timer for slash
    if (this.strikeLandTimer > 0) {
      this.strikeLandTimer -= dt;
      if (this.strikeLandTimer <= 0) {
        this.strikeLandTimer = 0;
        if (this.onStrikeLandCallback) {
          const cb = this.onStrikeLandCallback;
          this.onStrikeLandCallback = null;
          cb();
        }
      }
    }

    // Handle Special Slam banner sequence
    if (this.specialSlamActive) {
      this.specialSlamTimer += dt;
      if (this.specialSlamTimer >= this.specialSlamDuration) {
        this.specialSlamActive = false;
        // Then executes the slash
        this.playMove('slash', this.specialSlamOnStrikeLand);
        this.specialSlamOnStrikeLand = null;
      }
    }

    // Update pose interpolation
    if (this.currentStage) {
      this.stageElapsed += dt;
      const t = Math.min(1, this.stageElapsed / Math.max(1, this.stageDuration));
      const easedT = easeInOutQuad(t);

      for (const k of JOINT_KEYS) {
        this.currentPose[k] = [
          lerp(this.fromPose[k][0], this.targetPose[k][0], easedT),
          lerp(this.fromPose[k][1], this.targetPose[k][1], easedT),
        ];
      }

      if (this.stageElapsed >= this.stageDuration) {
        if (this.targetPose === POSES.idle && this.currentMoveName === null) {
          this.currentStage = null;
          this.isIdle = true;
        } else {
          this.nextStage();
        }
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.lifeMs -= dt;
      ft.yOffset -= dt * 0.04; // float upward
      ft.alpha = Math.max(0, ft.lifeMs / ft.maxLifeMs);
      if (ft.lifeMs <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Draw the fighter stick figure
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x - World X position (200 for A, 440 for B)
   * @param {string} ink - Color for stick figure ('#333333' or sharp dark color)
   * @param {boolean} mirror - If true, faces left; otherwise right
   */
  draw(ctx, x, ink = this.ink, mirror = false) {
    const P = this.currentPose;

    // Breath oscillation (applies when resting in idle)
    const isResting = this.isIdle && !this.currentMoveName && !this.specialSlamActive;
    const breath = isResting ? Math.sin(this.breathTimer * 0.0035) * 2.2 : 0;
    const hipBreath = breath * 0.35;

    ctx.save();
    ctx.translate(x, 190); // 190 is the floor line
    if (mirror) {
      ctx.scale(-1, 1);
    }

    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Head
    const headX = P.head[0];
    const headY = P.head[1] + breath;
    ctx.beginPath();
    ctx.arc(headX, headY, 8.5, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Torso (Neck to Hip)
    const neckX = P.neck[0];
    const neckY = P.neck[1] + breath;
    const hipX = P.hip[0];
    const hipY = P.hip[1] + hipBreath;

    ctx.beginPath();
    ctx.moveTo(neckX, neckY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // 3. Back Leg (Rear)
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(P.kneeR[0], P.kneeR[1]);
    ctx.lineTo(P.footR[0], P.footR[1]);
    ctx.stroke();

    // 4. Front Leg (Lead)
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(P.kneeL[0], P.kneeL[1]);
    ctx.lineTo(P.footL[0], P.footL[1]);
    ctx.stroke();

    // 5. Back Arm (Rear)
    ctx.beginPath();
    ctx.moveTo(neckX, neckY);
    ctx.lineTo(P.elbowR[0], P.elbowR[1] + breath);
    ctx.lineTo(P.handR[0], P.handR[1] + breath);
    ctx.stroke();

    // 6. Front Arm (Lead)
    ctx.beginPath();
    ctx.moveTo(neckX, neckY);
    ctx.lineTo(P.elbowL[0], P.elbowL[1] + breath);
    ctx.lineTo(P.handL[0], P.handL[1] + breath);
    ctx.stroke();

    // 7. Sword
    const handX = P.handL[0];
    const handY = P.handL[1] + breath;
    const tipX = P.swordTip[0];
    const tipY = P.swordTip[1] + breath;

    // Sword Blade in '#EF9F27'
    ctx.save();
    ctx.strokeStyle = this.swordColor || '#EF9F27';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Sword Crossguard
    const dx = tipX - handX;
    const dy = tipY - handY;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const guardHalf = 5;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(handX - nx * guardHalf, handY - ny * guardHalf);
    ctx.lineTo(handX + nx * guardHalf, handY + ny * guardHalf);
    ctx.stroke();
    ctx.restore();

    // 7B. Visible Energy Shield Dome when blocking
    const isBlocking = (this.currentMoveName === 'block' || this.isHoldingBlock) && !this.isGuardBroken;
    if (isBlocking) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      // Forward convex energy shield arc covering torso & upper body
      ctx.arc(18, -48 + hipBreath, 38, -Math.PI * 0.48, Math.PI * 0.48);
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }

    // 7C. Heavy Attack Telegraph Charging Aura
    if (this.specialSlamActive) {
      ctx.save();
      const pulse = Math.sin(this.breathTimer * 0.02) * 4;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, -50 + hipBreath, 46 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // restore translate & scale

    // 8. Render Floating Feedback Texts (World coordinates to avoid mirroring)
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, x, 190 + ft.yOffset);
      ctx.restore();
    }
  }

  /**
   * Draw the Special Slam Dim & Banner sequence if currently active
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} canvasWidth 
   * @param {number} canvasHeight 
   */
  drawSpecialSlamBanner(ctx, canvasWidth = 640, canvasHeight = 360) {
    if (!this.specialSlamActive) return;

    // Dims the screen (rgba(0,0,0,0.45))
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Sweeps an orange banner (#D85A30) across canvas
    const p = this.specialSlamTimer / this.specialSlamDuration; // 0 to 1
    // Dynamic sweep: comes in smoothly, stays prominent, then sweeps across
    const bannerH = 70;
    const bannerY = 145;

    // Ribbon sweep translation
    let sweepOffset = 0;
    if (p < 0.25) {
      sweepOffset = (1 - (p / 0.25)) * -canvasWidth;
    } else if (p > 0.75) {
      sweepOffset = ((p - 0.75) / 0.25) * canvasWidth;
    }

    ctx.save();
    ctx.translate(sweepOffset, 0);

    // Orange banner background
    ctx.fillStyle = '#D85A30';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillRect(0, bannerY, canvasWidth, bannerH);

    // Gold accent trim lines
    ctx.fillStyle = '#EF9F27';
    ctx.fillRect(0, bannerY - 3, canvasWidth, 3);
    ctx.fillRect(0, bannerY + bannerH, canvasWidth, 3);

    // Bold text "SPECIAL SLAM"
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "900 32px 'Impact', 'Arial Black', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText("SPECIAL SLAM", canvasWidth / 2, bannerY + bannerH / 2);

    ctx.restore();
    ctx.restore();
  }
}

export default Fighter;
