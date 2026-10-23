/**
 * ARC Stick-Fighter Animation Engine — Fighter Renderer & Entity
 * Stage 1 Foundation
 */
(function(root) {
  'use strict';

  var Poses = root.Poses;

  function Fighter(id, x, facing, options) {
    options = options || {};
    this.id = id || 'A';
    this.x = x || 200;
    this.facing = (facing === -1 || facing === 'left') ? -1 : 1;
    this.color = options.color || '#f1f5f9';
    this.swordColor = options.swordColor || '#EF9F27';

    // Pre-allocated pose structures for low-allocation updates
    this.currentPose = Poses.clonePose(Poses.POSES.idle);
    this.fromPose = Poses.clonePose(Poses.POSES.idle);
    this.targetPose = Poses.POSES.idle;

    this.transitionDuration = 0;
    this.transitionElapsed = 0;
    this.isTransitioning = false;
    this.isIdle = true;
    this.currentMoveName = 'idle';

    // Subtle idle breathing
    this.breathTimer = Math.random() * 1000;

    // Visual options
    this.showJoints = false;
    this.lineWidth = 3.5;
  }

  Fighter.prototype.setFacing = function(facing) {
    this.facing = (facing === -1 || facing === 'left') ? -1 : 1;
  };

  /**
   * Transition to a target pose smoothly
   */
  Fighter.prototype.transitionTo = function(targetPose, durationMs, options) {
    this.fromPose = Poses.clonePose(this.currentPose);
    this.targetPose = targetPose || Poses.POSES.idle;
    this.transitionDuration = Math.max(1, durationMs || 140);
    this.transitionElapsed = 0;
    this.isTransitioning = true;

    options = options || {};
    if (options.shortestArc && Poses && Poses.normalizeAngleDeg) {
      var targetRot = this.targetPose.rot || 0;
      var fromRot = this.fromPose.rot || 0;
      var diff = Poses.normalizeAngleDeg(fromRot - targetRot);
      this.fromPose.rot = targetRot + diff;
      this.currentPose.rot = this.fromPose.rot;
    }
  };

  /**
   * Set pose immediately without transition
   */
  Fighter.prototype.setPose = function(pose) {
    this.currentPose = Poses.clonePose(pose || Poses.POSES.idle);
    this.fromPose = Poses.clonePose(this.currentPose);
    this.targetPose = this.currentPose;
    this.isTransitioning = false;
  };

  /**
   * Reset fighter cleanly to default idle pose
   */
  Fighter.prototype.resetPose = function() {
    this.setPose(Poses.POSES.idle);
    this.isIdle = true;
    this.currentMoveName = 'idle';
  };

  Fighter.prototype.update = function(dt) {
    this.breathTimer += dt;

    if (this.isTransitioning) {
      this.transitionElapsed += dt;
      var t = Math.min(1, this.transitionElapsed / this.transitionDuration);
      Poses.interpolatePose(this.fromPose, this.targetPose, t, this.currentPose);

      if (this.transitionElapsed >= this.transitionDuration) {
        this.isTransitioning = false;
      }
    }
  };

  /**
   * Static renderer for stick figures (usable by Fighter instances and Afterimage effects)
   */
  Fighter.drawStickFigure = function(ctx, P, x, floorY, facing, ink, swordColor, showJoints, lineWidth, breath) {
    P = P || Poses.POSES.idle;
    breath = breath || 0;
    var hipBreath = breath * 0.35;
    lineWidth = lineWidth || 3.5;
    swordColor = swordColor || '#EF9F27';
    ink = ink || '#f1f5f9';
    facing = (facing === -1 || facing === 'left') ? -1 : 1;
    floorY = floorY || 330;

    ctx.save();
    // Position at base ground
    var drawX = (x || 0) + (P.dx || 0) * facing;
    var drawY = floorY + (P.dy || 0);
    ctx.translate(drawX, drawY);

    // Apply facing mirror
    ctx.scale(facing, 1);

    // Apply pose rotation (supports > 360 deg)
    if (P.rot) {
      ctx.rotate((P.rot * Math.PI) / 180);
    }

    ctx.strokeStyle = ink;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Head
    var headX = P.head[0];
    var headY = P.head[1] + breath;
    ctx.beginPath();
    ctx.arc(headX, headY, 8.5, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Torso (Neck to Hip)
    var neckX = P.neck[0];
    var neckY = P.neck[1] + breath;
    var hipX = P.hip[0];
    var hipY = P.hip[1] + hipBreath;

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
    var handX = P.handL[0];
    var handY = P.handL[1] + breath;
    var tipX = P.swordTip[0];
    var tipY = P.swordTip[1] + breath;

    ctx.save();
    ctx.strokeStyle = swordColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Crossguard
    var dx = tipX - handX;
    var dy = tipY - handY;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var gh = 5;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(handX - nx * gh, handY - ny * gh);
    ctx.lineTo(handX + nx * gh, handY + ny * gh);
    ctx.stroke();
    ctx.restore();

    // 8. Skeleton Joints (when enabled)
    if (showJoints) {
      ctx.save();
      ctx.fillStyle = '#EF9F27';
      var joints = [
        [headX, headY],
        [neckX, neckY],
        [hipX, hipY],
        [P.kneeL[0], P.kneeL[1]],
        [P.footL[0], P.footL[1]],
        [P.kneeR[0], P.kneeR[1]],
        [P.footR[0], P.footR[1]],
        [P.elbowL[0], P.elbowL[1] + breath],
        [P.handL[0], P.handL[1] + breath],
        [P.elbowR[0], P.elbowR[1] + breath],
        [P.handR[0], P.handR[1] + breath],
        [tipX, tipY]
      ];
      for (var j = 0; j < joints.length; j++) {
        ctx.beginPath();
        ctx.arc(joints[j][0], joints[j][1], 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore(); // restore local transform
  };

  /**
   * Render stick figure to Canvas
   */
  Fighter.prototype.draw = function(ctx, floorY, themeInk) {
    var ink = themeInk || this.color;
    var breath = (this.isIdle && !this.isTransitioning) ? Math.sin(this.breathTimer * 0.003) * 2.2 : 0;
    Fighter.drawStickFigure(
      ctx,
      this.currentPose,
      this.x,
      floorY,
      this.facing,
      ink,
      this.swordColor,
      this.showJoints,
      this.lineWidth,
      breath
    );
  };

  root.Fighter = Fighter;
})(typeof window !== 'undefined' ? window : globalThis);
