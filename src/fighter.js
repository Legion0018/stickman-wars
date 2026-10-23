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
    this.maxHp = 100;
    this.hp = 100;

    // Floating combat feedback text
    this.floatingTexts = [];
  }

  /**
   * Set holding state for block or duck
   */
  setHolding(action, isHolding) {
    if (action === 'block') {
      this.isHoldingBlock = isHolding;
      if (!isHolding && this.currentMoveName === 'block' && this.currentStageIndex >= this.currentMoveStages.length - 1) {
        this.returnToIdle();
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
   * Start Special Slam Sequence:
   * Dims screen, sweeps orange banner (#D85A30) with bold text "SPECIAL SLAM",
   * then executes the slash.
   */
  playSpecialSlam(onStrikeLand = null) {
    this.specialSlamActive = true;
    this.specialSlamTimer = 0;
    this.specialSlamOnStrikeLand = onStrikeLand;
  }

  /**
   * Combat Resolution:
   * When receiving a strike hit event:
   * - If currently playing 'block', returns 'BLOCKED'.
   * - If playing 'duck', returns 'DODGED'.
   * - Otherwise returns 'HIT' and automatically triggers the 'hurt' animation sequence.
   * 
   * @param {string} incomingAction 
   * @returns {'HIT' | 'BLOCKED' | 'DODGED'}
   */
  checkHit(incomingAction = 'slash') {
    let outcome = 'HIT';
    if (this.currentMoveName === 'block' || this.isHoldingBlock) {
      outcome = 'BLOCKED';
      this.hp = Math.max(0, this.hp - 10);
    } else if (this.currentMoveName === 'duck' || this.isHoldingDuck) {
      outcome = 'DODGED';
    } else {
      outcome = 'HIT';
      this.hp = Math.max(0, this.hp - 25);
      this.playMove('hurt');
    }

    this.addFloatingText(outcome);
    return outcome;
  }

  /**
   * Reset health to max HP
   */
  resetHp() {
    this.hp = this.maxHp;
  }

  /**
   * Add floating feedback text above fighter
   */
  addFloatingText(outcome) {
    let color = '#ef4444'; // Red for HIT
    let text = 'HIT!';
    if (outcome === 'BLOCKED') {
      color = '#38bdf8'; // Cyan-Blue for BLOCKED
      text = 'BLOCKED!';
    } else if (outcome === 'DODGED') {
      color = '#10b981'; // Emerald Green for DODGED
      text = 'DODGED!';
    }

    this.floatingTexts.push({
      text,
      color,
      yOffset: -102,
      alpha: 1.0,
      lifeMs: 1100,
      maxLifeMs: 1100,
    });
  }

  /**
   * Update animation, interpolation, and timers
   * @param {number} dt - delta time in ms
   */
  update(dt) {
    this.breathTimer += dt;

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
