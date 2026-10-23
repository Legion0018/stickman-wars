// anim/rig.js - Code Fighters Stick Figure Rig, Maths & Rendering
// Classic script format: attaches directly to window.CF
window.CF = window.CF || {};

(function () {
  'use strict';

  // RIG Configuration: lengths and dimensions in pixels
  // Geometrical invariants: limbs must NEVER stretch or distort.
  const RIG = {
    torso: 40,
    upperArm: 20,
    forearm: 20,
    sword: 34,
    thigh: 26,
    shin: 26,
    headRadius: 9,
    headOffset: 13, // distance from shoulder to head center
    groundY: 190,   // default ground line in canvas space
    hipYOffset: 52  // base distance from ground to hip when standing straight (26+26)
  };
  CF.RIG = RIG;

  // The complete list of pose joint and transform fields
  const POSE_FIELDS = [
    'lean', 'drop',
    'au', 'al', 'sw',
    'bau', 'bal',
    'flu', 'fll',
    'blu', 'bll',
    'dx', 'dy', 'rot',
    'airborne'
  ];
  CF.POSE_FIELDS = POSE_FIELDS;

  // Coordinate rounding to nearest 0.5px for razor-sharp rendering without subpixel blur
  function r05(val) {
    return Math.round(val * 2) * 0.5;
  }
  CF.r05 = r05;

  // Helper: Vector from absolute angle in degrees and length.
  // 0 = straight down (+Y in canvas), 90 = facing (+X), 180 = straight up (-Y), -90 = backward (-X).
  function v(angleDeg, len) {
    const r = (angleDeg * Math.PI) / 180;
    return [Math.sin(r) * len, Math.cos(r) * len];
  }
  CF.v = v;

  // Fast inline math helpers to avoid array allocation in hot paths
  function vX(angleDeg, len) {
    return Math.sin((angleDeg * Math.PI) / 180) * len;
  }
  function vY(angleDeg, len) {
    return Math.cos((angleDeg * Math.PI) / 180) * len;
  }
  CF.vX = vX;
  CF.vY = vY;

  // Easing functions for per-keyframe blending
  const Easing = {
    linear: function (k) {
      return k;
    },
    easeInOut: function (k) {
      return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    },
    easeIn: function (k) {
      return k * k;
    },
    easeOut: function (k) {
      return 1 - (1 - k) * (1 - k);
    },
    easeOutCubic: function (k) {
      return 1 - Math.pow(1 - k, 3);
    },
    easeInCubic: function (k) {
      return k * k * k;
    },
    easeOutBack: function (k) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    },
    easeInBack: function (k) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * k * k * k - c1 * k * k;
    }
  };
  CF.Easing = Easing;

  // Interpolate between two poses. Returns a target object (re-uses `out` if provided).
  // Hot-path friendly: zero object allocation when `out` is supplied.
  function interpolatePose(from, to, rawT, easeName, out) {
    out = out || {};
    const easeFn = (easeName && Easing[easeName]) ? Easing[easeName] : Easing.easeInOut;
    const clampedT = Math.max(0, Math.min(1, rawT));
    const k = easeFn(clampedT);

    for (let i = 0; i < POSE_FIELDS.length; i++) {
      const key = POSE_FIELDS[i];
      if (key === 'airborne') {
        out.airborne = k < 0.5 ? !!from.airborne : !!to.airborne;
        continue;
      }
      const a = (from[key] !== undefined) ? from[key] : (key === 'lean' ? 0 : 0);
      const b = (to[key] !== undefined) ? to[key] : a;
      out[key] = a + (b - a) * k;
    }
    return out;
  }
  CF.interpolatePose = interpolatePose;

  // Clone a pose object
  function clonePose(src, dst) {
    dst = dst || {};
    for (let i = 0; i < POSE_FIELDS.length; i++) {
      const k = POSE_FIELDS[i];
      if (src[k] !== undefined) dst[k] = src[k];
    }
    if (dst.dx === undefined) dst.dx = 0;
    if (dst.dy === undefined) dst.dy = 0;
    if (dst.rot === undefined) dst.rot = 0;
    if (dst.drop === undefined) dst.drop = 0;
    if (dst.lean === undefined) dst.lean = 0;
    if (dst.airborne === undefined) dst.airborne = false;
    return dst;
  }
  CF.clonePose = clonePose;

  // Ground snap computation:
  // Given thigh/shin angles, returns the lowest foot Y relative to the hip.
  function computeLowestFootRelativeY(pose) {
    const flu = pose.flu || 0;
    const fll = pose.fll || 0;
    const blu = pose.blu || 0;
    const bll = pose.bll || 0;

    const frontY = vY(flu, RIG.thigh) + vY(fll, RIG.shin);
    const backY = vY(blu, RIG.thigh) + vY(bll, RIG.shin);

    return Math.max(frontY, backY);
  }
  CF.computeLowestFootRelativeY = computeLowestFootRelativeY;

  // Compute all joint world coordinates for a pose, with ground snap applied.
  // out is populated in-place to avoid per-frame allocations.
  function computeJoints(x, pose, facing, groundY, out) {
    out = out || {};
    groundY = (groundY !== undefined) ? groundY : RIG.groundY;
    facing = facing || 1;

    // Body displacement along facing
    const dx = (pose.dx || 0) * facing;
    const dy = (pose.dy || 0);
    const drop = (pose.drop || 0);

    let hipX = x + dx;
    let hipY;

    if (pose.airborne) {
      hipY = groundY - RIG.hipYOffset + drop + dy;
    } else {
      const lowestFootDelta = computeLowestFootRelativeY(pose);
      hipY = groundY - lowestFootDelta;
    }

    out.hip = [hipX, hipY];

    // Torso lean: angle is (180 - lean), with facing applied
    const lean = pose.lean || 0;
    const torsoAngle = 180 - lean;
    const sx = hipX + vX(torsoAngle, RIG.torso) * facing;
    const sy = hipY + vY(torsoAngle, RIG.torso);
    out.shoulder = [sx, sy];

    // Torso center (for rotation pivot)
    out.torsoCenter = [(hipX + sx) / 2, (hipY + sy) / 2];

    // Head center
    out.head = [
      sx + vX(torsoAngle, RIG.headOffset) * facing,
      sy + vY(torsoAngle, RIG.headOffset)
    ];

    // Front leg: hip -> knee -> foot
    const fkx = hipX + vX(pose.flu || 0, RIG.thigh) * facing;
    const fky = hipY + vY(pose.flu || 0, RIG.thigh);
    out.frontKnee = [fkx, fky];
    out.frontFoot = [
      fkx + vX(pose.fll || 0, RIG.shin) * facing,
      fky + vY(pose.fll || 0, RIG.shin)
    ];

    // Back leg: hip -> knee -> foot
    const bkx = hipX + vX(pose.blu || 0, RIG.thigh) * facing;
    const bky = hipY + vY(pose.blu || 0, RIG.thigh);
    out.backKnee = [bkx, bky];
    out.backFoot = [
      bkx + vX(pose.bll || 0, RIG.shin) * facing,
      bky + vY(pose.bll || 0, RIG.shin)
    ];

    // Front arm: shoulder -> elbow -> hand
    const fex = sx + vX(pose.au || 0, RIG.upperArm) * facing;
    const fey = sy + vY(pose.au || 0, RIG.upperArm);
    out.frontElbow = [fex, fey];
    const fhx = fex + vX(pose.al || 0, RIG.forearm) * facing;
    const fhy = fey + vY(pose.al || 0, RIG.forearm);
    out.frontHand = [fhx, fhy];

    // Sword: hand -> tip
    out.swordTip = [
      fhx + vX(pose.sw || 0, RIG.sword) * facing,
      fhy + vY(pose.sw || 0, RIG.sword)
    ];

    // Back arm: shoulder -> elbow -> hand
    const bex = sx + vX(pose.bau || 0, RIG.upperArm) * facing;
    const bey = sy + vY(pose.bau || 0, RIG.upperArm);
    out.backElbow = [bex, bey];
    out.backHand = [
      bex + vX(pose.bal || 0, RIG.forearm) * facing,
      bey + vY(pose.bal || 0, RIG.forearm)
    ];

    return out;
  }
  CF.computeJoints = computeJoints;

  // Draw helper: line between two points with 0.5px rounding
  function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(r05(x1), r05(y1));
    ctx.lineTo(r05(x2), r05(y2));
    ctx.stroke();
  }

  /**
   * Draw stick figure on canvas
   * Follows anim/STYLE.md:
   * 1. One line weight for the whole body (lineWidth 4, round caps and joins).
   * 2. Sword in accent color (lineWidth 3).
   * 3. Head is a plain outline circle (radius 9, lineWidth 4).
   * 4. One thin headband line across the forehead (lineWidth 2).
   * 5. Coordinates rounded to nearest 0.5px.
   * 6. Silhouette mode: solid black geometry (#000000) with solid filled head.
   */
  function drawFighter(ctx, x, pose, options) {
    options = options || {};
    const facing = (options.facing !== undefined) ? options.facing : 1;
    const isSilhouette = !!options.silhouette;
    const ink = isSilhouette ? '#000000' : (options.ink || '#E5E7EB');
    const accent = isSilhouette ? '#000000' : (options.accent || '#EF4444');
    const swordColor = isSilhouette ? '#000000' : (options.swordColor || accent);
    const groundY = (options.groundY !== undefined) ? options.groundY : RIG.groundY;
    const breath = (options.breath !== undefined) ? options.breath : 0;
    const debug = !!options.debug;

    ctx.save();

    // 1. Position and facing mirror
    ctx.translate(r05(x), 0);
    ctx.scale(facing, 1);

    // Apply dx along facing (dx is positive forward)
    const dx = pose.dx || 0;
    const dy = pose.dy || 0;
    const drop = pose.drop || 0;

    // Breathing offset: applies only while idle (breathWeight is 0 during moves)
    const br = breath;
    const lean = (pose.lean || 0) + br * 1.5;

    // Ground snap calculation
    let hy;
    if (pose.airborne) {
      hy = groundY - RIG.hipYOffset + drop + dy;
    } else {
      const lowestFoot = computeLowestFootRelativeY(pose);
      hy = groundY - lowestFoot;
    }
    const hx = dx;

    // Torso angle (180 = straight up, lean positive = forward)
    const torsoAngle = 180 - lean;
    const sx = hx + vX(torsoAngle, RIG.torso);
    const sy = hy + vY(torsoAngle, RIG.torso);

    // Whole body rotation around torso center
    if (pose.rot) {
      const cx = (hx + sx) / 2;
      const cy = (hy + sy) / 2;
      ctx.translate(r05(cx), r05(cy));
      ctx.rotate((pose.rot * Math.PI) / 180);
      ctx.translate(-r05(cx), -r05(cy));
    }

    // Body styling: Rule 1 - lineWidth 4, round caps and joins
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 2. BACK ARM
    const bex = sx + vX(pose.bau || 0, RIG.upperArm);
    const bey = sy + vY(pose.bau || 0, RIG.upperArm);
    const bhx = bex + vX((pose.bal || 0) + br * 2, RIG.forearm);
    const bhy = bey + vY((pose.bal || 0) + br * 2, RIG.forearm);
    drawLine(ctx, sx, sy, bex, bey);
    drawLine(ctx, bex, bey, bhx, bhy);

    // 3. BACK LEG
    const bkx = hx + vX(pose.blu || 0, RIG.thigh);
    const bky = hy + vY(pose.blu || 0, RIG.thigh);
    const bfx = bkx + vX(pose.bll || 0, RIG.shin);
    const bfy = bky + vY(pose.bll || 0, RIG.shin);
    drawLine(ctx, hx, hy, bkx, bky);
    drawLine(ctx, bkx, bky, bfx, bfy);

    // 4. TORSO
    drawLine(ctx, hx, hy, sx, sy);

    // 5. HEAD (Plain outline circle, radius 9, lineWidth 4; solid filled in silhouette mode)
    const headX = sx + vX(torsoAngle, RIG.headOffset);
    const headY = sy + vY(torsoAngle, RIG.headOffset);
    ctx.beginPath();
    ctx.arc(r05(headX), r05(headY), RIG.headRadius, 0, Math.PI * 2);
    if (isSilhouette) {
      ctx.fillStyle = '#000000';
      ctx.fill();
    }
    ctx.stroke();

    // 6. ACCENT HEADBAND (Single thin line across forehead for identification; omitted in silhouette)
    if (!isSilhouette) {
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r05(headX), r05(headY), RIG.headRadius - 0.5, -Math.PI * 0.15, Math.PI * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    // 7. FRONT LEG
    const fkx = hx + vX(pose.flu || 0, RIG.thigh);
    const fky = hy + vY(pose.flu || 0, RIG.thigh);
    const ffx = fkx + vX(pose.fll || 0, RIG.shin);
    const ffy = fky + vY(pose.fll || 0, RIG.shin);
    drawLine(ctx, hx, hy, fkx, fky);
    drawLine(ctx, fkx, fky, ffx, ffy);

    // 8. FRONT ARM
    const fex = sx + vX(pose.au || 0, RIG.upperArm);
    const fey = sy + vY(pose.au || 0, RIG.upperArm);
    const fhx = fex + vX((pose.al || 0) + br * 2, RIG.forearm);
    const fhy = fey + vY((pose.al || 0) + br * 2, RIG.forearm);
    drawLine(ctx, sx, sy, fex, fey);
    drawLine(ctx, fex, fey, fhx, fhy);

    // 9. SWORD (Accent color, lineWidth 3, round caps)
    const stx = fhx + vX(pose.sw || 0, RIG.sword);
    const sty = fhy + vY(pose.sw || 0, RIG.sword);
    ctx.save();
    ctx.strokeStyle = swordColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    drawLine(ctx, fhx, fhy, stx, sty);
    ctx.restore();

    // 10. DEBUG SKELETON OVERLAY (if requested)
    if (debug) {
      ctx.save();
      ctx.fillStyle = '#10B981';
      const joints = [
        [hx, hy], [sx, sy], [headX, headY],
        [fkx, fky], [ffx, ffy], [bkx, bky], [bfx, bfy],
        [fex, fey], [fhx, fhy], [bex, bey], [bhx, bhy]
      ];
      for (let i = 0; i < joints.length; i++) {
        ctx.beginPath();
        ctx.arc(r05(joints[i][0]), r05(joints[i][1]), 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(r05(stx), r05(sty), 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
  CF.drawFighter = drawFighter;
})();
