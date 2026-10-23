// anim/poses.js - Code Fighters Named Keyframe Poses
// All angles are ABSOLUTE degrees in world space:
//   0 = straight down, 90 = toward facing, 180 = straight up, -90 = backward.
// Torso lean: positive = forward tilt, negative = backward tilt.
// Designed according to anim/STYLE.md:
// - Readable silhouettes (wide stances, arms/sword clear of torso).
// - Unmistakable telegraphed tell poses (horizontal vs vertical).
// - Non-sliding foot placement for grounded moves.
window.CF = window.CF || {};

(function () {
  'use strict';

  const Poses = {
    // -------------------------------------------------------------------------
    // 1. BASIC STANCE
    // -------------------------------------------------------------------------
    idle: {
      lean: 5, drop: 0,
      au: 45, al: 115, sw: 155,
      bau: -25, bal: 25,
      flu: 18, fll: 6,
      blu: -22, bll: -6,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 2. DEFENCE & DODGES
    // -------------------------------------------------------------------------
    // Sidestep left (backward away from opponent) - athletic weight catch (dx: -65)
    stepLeftOut: {
      lean: -12, drop: 6,
      au: 35, al: 105, sw: 145,
      bau: -35, bal: 15,
      flu: 28, fll: 10,
      blu: -44, bll: -14,
      dx: -65, dy: 0, rot: 0, airborne: false
    },

    // Sidestep right (forward toward opponent) - aggressive drive into space (dx: +65)
    stepRightOut: {
      lean: 16, drop: 6,
      au: 55, al: 125, sw: 165,
      bau: -20, bal: 40,
      flu: 50, fll: 16,
      blu: -26, bll: -8,
      dx: 65, dy: 0, rot: 0, airborne: false
    },

    // Jump (anticipation crouch, apex, fall, landing compression)
    jumpCrouch: {
      lean: 14, drop: 16,
      au: 30, al: 90, sw: 130,
      bau: -25, bal: 20,
      flu: 55, fll: 16,
      blu: 25, bll: 6,
      dx: 0, dy: 0, rot: 0, airborne: false
    },
    jumpApex: {
      lean: 6, drop: 0,
      au: 65, al: 140, sw: 175,
      bau: -10, bal: 55,
      flu: 85, fll: 38,
      blu: 80, bll: 32,
      dx: 0, dy: -65, rot: 0, airborne: true
    },
    jumpFall: {
      lean: 8, drop: 0,
      au: 55, al: 125, sw: 165,
      bau: -15, bal: 40,
      flu: 45, fll: 12,
      blu: 35, bll: 8,
      dx: 0, dy: -15, rot: 0, airborne: true
    },
    jumpLand: {
      lean: 18, drop: 18,
      au: 30, al: 85, sw: 125,
      bau: -25, bal: 15,
      flu: 65, fll: 18,
      blu: 30, bll: 8,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // Duck (deep crouch beneath horizontal strikes - drop: 28, wide stable compression)
    duck: {
      lean: 36, drop: 28,
      au: 35, al: 90, sw: 135,
      bau: -15, bal: 30,
      flu: 80, fll: 12,
      blu: -70, bll: -14,
      dx: 8, dy: 0, rot: 0, airborne: false
    },

    // Block (sword held vertical across chest, feet planted wide)
    block: {
      lean: -4, drop: 4,
      au: 55, al: 155, sw: 180,
      bau: 35, bal: 140,
      flu: 20, fll: 6,
      blu: -25, bll: -8,
      dx: 0, dy: 0, rot: 0, airborne: false
    },
    blockRecoil: {
      lean: -14, drop: 6,
      au: 50, al: 150, sw: 175,
      bau: 30, bal: 135,
      flu: 14, fll: 4,
      blu: -30, bll: -10,
      dx: -12, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 3. BASIC ATTACK & REACTIONS
    // -------------------------------------------------------------------------
    // Slash:
    // windup = strong anticipation: lean back ~16 deg, weight on back leg, sword cocked high (sw: 210)
    slashWindup: {
      lean: -16, drop: 4,
      au: 155, al: 175, sw: 210,
      bau: -45, bal: -10,
      flu: 22, fll: 6,
      blu: -30, bll: -12,
      dx: -10, dy: 0, rot: 0, airborne: false
    },
    // strike = explosive full-body lunge: lean forward ~28 deg, front leg lunges, horizontal sword arc
    slashStrike: {
      lean: 28, drop: 10,
      au: 95, al: 90, sw: 85,
      bau: -55, bal: -30,
      flu: 62, fll: 14,
      blu: -40, bll: -10,
      dx: 28, dy: 0, rot: 0, airborne: false
    },
    // overshoot = follow-through across cutting plane, micro contact pause
    slashOvershoot: {
      lean: 30, drop: 10,
      au: 80, al: 75, sw: 65,
      bau: -60, bal: -35,
      flu: 64, fll: 15,
      blu: -42, bll: -10,
      dx: 30, dy: 0, rot: 0, airborne: false
    },
    // recover = smooth balanced return to ready guard
    slashRecover: {
      lean: 12, drop: 4,
      au: 55, al: 105, sw: 140,
      bau: -28, bal: 15,
      flu: 32, fll: 10,
      blu: -28, bll: -8,
      dx: 10, dy: 0, rot: 0, airborne: false
    },

    // Hurt: violent recoil snap back, head whiplash, blade knocked wide (dx: -24)
    hurt: {
      lean: -32, drop: 6,
      au: -15, al: 15, sw: 20,
      bau: -55, bal: -35,
      flu: 8, fll: 4,
      blu: -36, bll: -12,
      dx: -24, dy: 0, rot: 0, airborne: false
    },
    // hurtRecover = balance recovery & foot replant
    hurtRecover: {
      lean: -10, drop: 4,
      au: 30, al: 90, sw: 125,
      bau: -25, bal: 15,
      flu: 18, fll: 6,
      blu: -26, bll: -8,
      dx: -14, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 4. ENEMY ATTACK & FEINT (Telegraphed Combat)
    // -------------------------------------------------------------------------
    // Neutral coiled crouch: MUST be identical for 'h', 'v', and 'pending' at 1.9s!
    // Compact crouch where neither direction is visible.
    enemyCoil: {
      lean: 12, drop: 16,
      au: 30, al: 85, sw: 75,
      bau: -15, bal: 25,
      flu: 45, fll: 14,
      blu: -35, bll: -10,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // Horizontal tell: body turns side-on, sword drawn back at waist height,
    // long horizontal line. Unmistakable at a glance!
    tellH: {
      lean: -8, drop: 6,
      au: -85, al: -90, sw: -90,
      bau: 40, bal: 90,
      flu: 25, fll: 8,
      blu: -32, bll: -8,
      dx: -8, dy: 0, rot: 0, airborne: false
    },
    strikeH: {
      lean: 28, drop: 8,
      au: 90, al: 90, sw: 90,
      bau: -50, bal: -20,
      flu: 55, fll: 12,
      blu: -35, bll: -8,
      dx: 24, dy: 0, rot: 0, airborne: false
    },

    // Vertical tell: both arms up, sword straight overhead, tall vertical line.
    // Unmistakable at a glance!
    tellV: {
      lean: -12, drop: 4,
      au: 175, al: 180, sw: 180,
      bau: 170, bal: 175,
      flu: 16, fll: 5,
      blu: -22, bll: -6,
      dx: -4, dy: 0, rot: 0, airborne: false
    },
    strikeV: {
      lean: 32, drop: 10,
      au: 30, al: 40, sw: 15,
      bau: 20, bal: 30,
      flu: 55, fll: 15,
      blu: -35, bll: -10,
      dx: 22, dy: 0, rot: 0, airborne: false
    },

    // Feint shrug: relaxes and lowers sword
    feintShrug: {
      lean: -2, drop: 0,
      au: 10, al: 40, sw: 20,
      bau: -10, bal: 30,
      flu: 14, fll: 4,
      blu: -18, bll: -5,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 5. SPECIAL MOVE
    // -------------------------------------------------------------------------
    specialCharge: {
      lean: 20, drop: 16,
      au: 155, al: 175, sw: 195,
      bau: 145, bal: 165,
      flu: 50, fll: 14,
      blu: -35, bll: -10,
      dx: -8, dy: 0, rot: 0, airborne: false
    },
    specialLeap: {
      lean: -15, drop: 0,
      au: 170, al: 180, sw: 190,
      bau: 155, bal: 165,
      flu: 75, fll: 28,
      blu: 70, bll: 22,
      dx: 70, dy: -70, rot: 0, airborne: true
    },
    specialSlam: {
      lean: 38, drop: 18,
      au: 45, al: 45, sw: 20,
      bau: 35, bal: 35,
      flu: 65, fll: 20,
      blu: -45, bll: -14,
      dx: 95, dy: 0, rot: 0, airborne: false
    },
    specialRecover: {
      lean: 14, drop: 4,
      au: 50, al: 90, sw: 110,
      bau: -20, bal: 20,
      flu: 28, fll: 8,
      blu: -24, bll: -6,
      dx: 50, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 6. GROUP 2 POSES: VARIANTS & RESULTS
    // -------------------------------------------------------------------------
    weakSlashWindup: {
      lean: -6, drop: 2,
      au: 125, al: 145, sw: 175,
      bau: -30, bal: 0,
      flu: 14, fll: 4,
      blu: -20, bll: -5,
      dx: -3, dy: 0, rot: 0, airborne: false
    },
    weakSlashStrike: {
      lean: 18, drop: 6,
      au: 85, al: 85, sw: 85,
      bau: -25, bal: -10,
      flu: 40, fll: 10,
      blu: -26, bll: -6,
      dx: 14, dy: 0, rot: 0, airborne: false
    },
    strongSlashWindup: {
      lean: -18, drop: 4,
      au: 170, al: 185, sw: 220,
      bau: -55, bal: -20,
      flu: 10, fll: 2,
      blu: -30, bll: -10,
      dx: -10, dy: 0, rot: 0, airborne: false
    },
    strongSlashStrike: {
      lean: 36, drop: 12,
      au: 95, al: 90, sw: 70,
      bau: -45, bal: -25,
      flu: 65, fll: 16,
      blu: -45, bll: -12,
      dx: 32, dy: 0, rot: 0, airborne: false
    },
    comboSlash1: {
      lean: 22, drop: 6,
      au: 88, al: 82, sw: 78,
      bau: -35, bal: -15,
      flu: 45, fll: 10,
      blu: -28, bll: -7,
      dx: 16, dy: 0, rot: 0, airborne: false
    },
    comboSlash2: {
      lean: -6, drop: 4,
      au: -10, al: 55, sw: 45,
      bau: 40, bal: 60,
      flu: 28, fll: 8,
      blu: -24, bll: -6,
      dx: 24, dy: 0, rot: 0, airborne: false
    },
    comboOverhead: {
      lean: 36, drop: 14,
      au: 35, al: 40, sw: 20,
      bau: 25, bal: 30,
      flu: 60, fll: 16,
      blu: -38, bll: -12,
      dx: 30, dy: 0, rot: 0, airborne: false
    },
    stumbleWindup: {
      lean: 16, drop: 6,
      au: 140, al: 160, sw: 190,
      bau: -30, bal: 10,
      flu: 32, fll: 8,
      blu: -22, bll: -6,
      dx: 6, dy: 0, rot: 0, airborne: false
    },
    stumbleOverbalance: {
      lean: 42, drop: 16,
      au: -40, al: -20, sw: -60,
      bau: 120, bal: 140,
      flu: 75, fll: 22,
      blu: -55, bll: -16,
      dx: 22, dy: 0, rot: 0, airborne: false
    },
    stumbleRecover: {
      lean: 10, drop: 2,
      au: 35, al: 85, sw: 125,
      bau: -20, bal: 20,
      flu: 22, fll: 6,
      blu: -18, bll: -5,
      dx: 12, dy: 0, rot: 0, airborne: false
    },
    // Knockdown: tilt back loss of balance -> flat grounded defeat
    knockdownFall: {
      lean: -48, drop: 12,
      au: -40, al: -15, sw: -50,
      bau: -60, bal: -40,
      flu: 12, fll: 4,
      blu: -35, bll: -12,
      dx: -30, dy: -12, rot: -50, airborne: true
    },
    knockdownFlat: {
      lean: -90, drop: 38,
      au: -85, al: -75, sw: -95,
      bau: -95, bal: -85,
      flu: -85, fll: -10,
      blu: -90, bll: -15,
      dx: -40, dy: 38, rot: -90, airborne: true
    },
    victoryHop: {
      lean: -5, drop: 0,
      au: 175, al: 180, sw: 185,
      bau: -30, bal: 20,
      flu: 30, fll: 10,
      blu: 25, bll: 8,
      dx: 0, dy: -25, rot: 0, airborne: true
    },
    victoryPose: {
      lean: -2, drop: 0,
      au: 170, al: 175, sw: 180,
      bau: -30, bal: 20,
      flu: 18, fll: 6,
      blu: -18, bll: -6,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 7. GROUP 3 POSES: ORIGINALS & CHALLENGE POSE
    // -------------------------------------------------------------------------
    riposteParry: {
      lean: -8, drop: 4,
      au: 60, al: 155, sw: 175,
      bau: 45, bal: 145,
      flu: 16, fll: 5,
      blu: -24, bll: -8,
      dx: -4, dy: 0, rot: 0, airborne: false
    },
    riposteSpin: {
      lean: 10, drop: 4,
      au: 110, al: 110, sw: 110,
      bau: -30, bal: 20,
      flu: 32, fll: 8,
      blu: -26, bll: -7,
      dx: 15, dy: 0, rot: 180, airborne: false
    },
    riposteCounter: {
      lean: 26, drop: 6,
      au: 90, al: 85, sw: 80,
      bau: -40, bal: -20,
      flu: 52, fll: 12,
      blu: -32, bll: -8,
      dx: 25, dy: 0, rot: 360, airborne: false
    },
    spinSlashSpin1: {
      lean: 0, drop: 2,
      au: 90, al: 90, sw: 90,
      bau: -90, bal: -90,
      flu: 20, fll: 5,
      blu: -20, bll: -5,
      dx: 10, dy: -5, rot: 120, airborne: true
    },
    spinSlashSpin2: {
      lean: 0, drop: 2,
      au: 90, al: 90, sw: 90,
      bau: -90, bal: -90,
      flu: 20, fll: 5,
      blu: -20, bll: -5,
      dx: 20, dy: -5, rot: 240, airborne: true
    },
    spinSlashSpin3: {
      lean: 10, drop: 4,
      au: 90, al: 85, sw: 80,
      bau: -40, bal: -20,
      flu: 42, fll: 10,
      blu: -30, bll: -7,
      dx: 30, dy: 0, rot: 360, airborne: false
    },
    backflipTuck: {
      lean: -20, drop: 0,
      au: 140, al: 160, sw: 180,
      bau: 130, bal: 150,
      flu: 90, fll: 50,
      blu: 85, bll: 45,
      dx: -30, dy: -70, rot: -180, airborne: true
    },
    backflipLand: {
      lean: 14, drop: 16,
      au: 35, al: 90, sw: 130,
      bau: -25, bal: 20,
      flu: 55, fll: 14,
      blu: -45, bll: -10,
      dx: -60, dy: 0, rot: -360, airborne: false
    },
    dashThrustDash: {
      lean: 25, drop: 10,
      au: 60, al: 80, sw: 90,
      bau: -40, bal: -20,
      flu: 48, fll: 10,
      blu: -36, bll: -8,
      dx: 60, dy: 0, rot: 0, airborne: false
    },
    dashThrustExtend: {
      lean: 35, drop: 12,
      au: 90, al: 90, sw: 90,
      bau: -60, bal: -30,
      flu: 68, fll: 15,
      blu: -48, bll: -10,
      dx: 120, dy: 0, rot: 0, airborne: false
    },
    focusKneelTyping1: {
      lean: 18, drop: 22,
      au: 75, al: 95, sw: 100,
      bau: 70, bal: 85,
      flu: 75, fll: 10,
      blu: -70, bll: -15,
      dx: 0, dy: 0, rot: 0, airborne: false
    },
    focusKneelTyping2: {
      lean: 18, drop: 22,
      au: 70, al: 90, sw: 100,
      bau: 75, bal: 92,
      flu: 75, fll: 10,
      blu: -70, bll: -15,
      dx: 0, dy: 0, rot: 0, airborne: false
    }
  };

  CF.Poses = Poses;
})();
