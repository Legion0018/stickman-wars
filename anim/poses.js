// anim/poses.js - Code Fighters Named Keyframe Poses
// All angles are ABSOLUTE degrees in world space:
//   0 = straight down, 90 = toward facing, 180 = straight up, -90 = backward.
// Torso lean: positive = leaning forward, negative = leaning back.
window.CF = window.CF || {};

(function () {
  const Poses = {
    // -------------------------------------------------------------------------
    // 1. BASIC STANCE
    // -------------------------------------------------------------------------
    idle: {
      lean: 5, drop: 0,
      au: 40, al: 110, sw: 150,
      bau: -20, bal: 30,
      flu: 14, fll: 4,
      blu: -14, bll: -4,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 2. DEFENCE & DODGES
    // -------------------------------------------------------------------------
    // Sidestep left (backward from opponent)
    stepLeftOut: {
      lean: -6, drop: 3,
      au: 35, al: 105, sw: 145,
      bau: -25, bal: 25,
      flu: 22, fll: 8,
      blu: -28, bll: -8,
      dx: -46, dy: 0, rot: 0, airborne: false
    },

    // Sidestep right (forward toward opponent)
    stepRightOut: {
      lean: 10, drop: 3,
      au: 45, al: 115, sw: 155,
      bau: -15, bal: 35,
      flu: 32, fll: 10,
      blu: -12, bll: -2,
      dx: 46, dy: 0, rot: 0, airborne: false
    },

    // Jump (hop over low horizontal attacks)
    jumpCrouch: {
      lean: 12, drop: 14,
      au: 25, al: 90, sw: 130,
      bau: -25, bal: 20,
      flu: 45, fll: 12,
      blu: 35, bll: 10,
      dx: 0, dy: 0, rot: 0, airborne: false
    },
    jumpApex: {
      lean: 6, drop: 0,
      au: 60, al: 135, sw: 170,
      bau: -10, bal: 50,
      flu: 80, fll: 35,
      blu: 75, bll: 30,
      dx: 0, dy: -60, rot: 0, airborne: true
    },
    jumpFall: {
      lean: 8, drop: 0,
      au: 50, al: 120, sw: 160,
      bau: -15, bal: 40,
      flu: 40, fll: 10,
      blu: 30, bll: 5,
      dx: 0, dy: -10, rot: 0, airborne: true
    },
    jumpLand: {
      lean: 16, drop: 16,
      au: 30, al: 90, sw: 130,
      bau: -25, bal: 15,
      flu: 55, fll: 14,
      blu: 45, bll: 12,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // Duck (crouch under high horizontal attacks)
    duck: {
      lean: 25, drop: 16,
      au: 35, al: 95, sw: 140,
      bau: -20, bal: 25,
      flu: 65, fll: 6,
      blu: -55, bll: -8,
      dx: 6, dy: 0, rot: 0, airborne: false
    },

    // Block (sword held vertical in front)
    block: {
      lean: -4, drop: 2,
      au: 55, al: 150, sw: 178,
      bau: 40, bal: 140,
      flu: 16, fll: 5,
      blu: -16, bll: -5,
      dx: -2, dy: 0, rot: 0, airborne: false
    },
    blockRecoil: {
      lean: -14, drop: 4,
      au: 50, al: 145, sw: 175,
      bau: 35, bal: 135,
      flu: 10, fll: 4,
      blu: -24, bll: -8,
      dx: -10, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 3. BASIC ATTACK & REACTIONS
    // -------------------------------------------------------------------------
    // Slash (basic pass)
    slashWindup: {
      lean: -10, drop: 0,
      au: 150, al: 170, sw: 200,
      bau: -40, bal: -10,
      flu: 10, fll: 0,
      blu: -18, bll: -6,
      dx: -4, dy: 0, rot: 0, airborne: false
    },
    slashStrike: {
      lean: 25, drop: 6,
      au: 95, al: 90, sw: 85,
      bau: -30, bal: -20,
      flu: 50, fll: 10,
      blu: -30, bll: -5,
      dx: 18, dy: 0, rot: 0, airborne: false
    },
    slashRecover: {
      lean: 12, drop: 2,
      au: 65, al: 95, sw: 110,
      bau: -25, bal: 0,
      flu: 30, fll: 6,
      blu: -22, bll: -4,
      dx: 8, dy: 0, rot: 0, airborne: false
    },

    // Hurt (stagger from impact)
    hurt: {
      lean: -25, drop: 2,
      au: 10, al: 20, sw: 15,
      bau: -40, bal: -30,
      flu: 5, fll: 0,
      blu: -25, bll: -10,
      dx: -18, dy: 0, rot: 0, airborne: false
    },
    hurtRecover: {
      lean: -10, drop: 1,
      au: 25, al: 60, sw: 80,
      bau: -30, bal: 0,
      flu: 10, fll: 2,
      blu: -18, bll: -6,
      dx: -8, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 4. ENEMY ATTACK & FEINT (Hidden Direction Gameplay)
    // -------------------------------------------------------------------------
    // Neutral coiled crouch: MUST be identical for 'h', 'v', and 'pending'
    enemyCoil: {
      lean: 14, drop: 12,
      au: 45, al: 100, sw: 125,
      bau: -20, bal: 25,
      flu: 35, fll: 10,
      blu: -25, bll: -8,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // Horizontal tell: sword drawn back and out to the side at waist height
    tellH: {
      lean: -8, drop: 8,
      au: -30, al: 10, sw: -40,
      bau: 50, bal: 90,
      flu: 25, fll: 8,
      blu: -28, bll: -8,
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

    // Vertical tell: sword raised overhead with both arms up
    tellV: {
      lean: -14, drop: 6,
      au: 165, al: 175, sw: 180,
      bau: 160, bal: 170,
      flu: 18, fll: 6,
      blu: -24, bll: -8,
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
      flu: 10, fll: 2,
      blu: -12, bll: -4,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 5. SPECIAL MOVE
    // -------------------------------------------------------------------------
    specialCharge: {
      lean: 18, drop: 14,
      au: 155, al: 175, sw: 195,
      bau: 145, bal: 165,
      flu: 45, fll: 12,
      blu: -30, bll: -8,
      dx: -6, dy: 0, rot: 0, airborne: false
    },
    specialLeap: {
      lean: -15, drop: 0,
      au: 170, al: 180, sw: 190,
      bau: 155, bal: 165,
      flu: 70, fll: 25,
      blu: 65, bll: 20,
      dx: 80, dy: -70, rot: 0, airborne: true
    },
    specialSlam: {
      lean: 40, drop: 18,
      au: 45, al: 45, sw: 20,
      bau: 35, bal: 35,
      flu: 60, fll: 18,
      blu: -40, bll: -12,
      dx: 95, dy: 0, rot: 0, airborne: false
    },
    specialRecover: {
      lean: 15, drop: 4,
      au: 50, al: 90, sw: 110,
      bau: -20, bal: 20,
      flu: 25, fll: 8,
      blu: -20, bll: -6,
      dx: 60, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 6. GROUP 2 POSES: VARIANTS & RESULTS
    // -------------------------------------------------------------------------
    weakSlashWindup: {
      lean: -4, drop: 0,
      au: 120, al: 140, sw: 170,
      bau: -30, bal: 0,
      flu: 10, fll: 2,
      blu: -14, bll: -4,
      dx: -2, dy: 0, rot: 0, airborne: false
    },
    weakSlashStrike: {
      lean: 15, drop: 4,
      au: 80, al: 85, sw: 80,
      bau: -20, bal: -10,
      flu: 35, fll: 8,
      blu: -22, bll: -5,
      dx: 12, dy: 0, rot: 0, airborne: false
    },
    strongSlashWindup: {
      lean: -18, drop: 2,
      au: 165, al: 180, sw: 215,
      bau: -55, bal: -20,
      flu: 5, fll: 0,
      blu: -26, bll: -8,
      dx: -8, dy: 0, rot: 0, airborne: false
    },
    strongSlashStrike: {
      lean: 34, drop: 10,
      au: 95, al: 90, sw: 70,
      bau: -40, bal: -25,
      flu: 60, fll: 15,
      blu: -40, bll: -10,
      dx: 30, dy: 0, rot: 0, airborne: false
    },
    comboSlash1: {
      lean: 20, drop: 4,
      au: 85, al: 80, sw: 75,
      bau: -35, bal: -15,
      flu: 40, fll: 8,
      blu: -25, bll: -6,
      dx: 14, dy: 0, rot: 0, airborne: false
    },
    comboSlash2: {
      lean: -5, drop: 4,
      au: -20, al: 30, sw: 10,
      bau: 40, bal: 60,
      flu: 25, fll: 6,
      blu: -20, bll: -5,
      dx: 22, dy: 0, rot: 0, airborne: false
    },
    comboOverhead: {
      lean: 35, drop: 12,
      au: 35, al: 40, sw: 20,
      bau: 25, bal: 30,
      flu: 55, fll: 15,
      blu: -35, bll: -10,
      dx: 28, dy: 0, rot: 0, airborne: false
    },
    stumbleWindup: {
      lean: 15, drop: 4,
      au: 140, al: 160, sw: 190,
      bau: -30, bal: 10,
      flu: 30, fll: 6,
      blu: -20, bll: -5,
      dx: 5, dy: 0, rot: 0, airborne: false
    },
    stumbleOverbalance: {
      lean: 42, drop: 14,
      au: -40, al: -20, sw: -60,
      bau: 120, bal: 140,
      flu: 70, fll: 20,
      blu: -50, bll: -15,
      dx: 20, dy: 0, rot: 0, airborne: false
    },
    stumbleRecover: {
      lean: 10, drop: 2,
      au: 30, al: 80, sw: 120,
      bau: -20, bal: 20,
      flu: 20, fll: 4,
      blu: -16, bll: -4,
      dx: 12, dy: 0, rot: 0, airborne: false
    },
    knockdownFall: {
      lean: -40, drop: 10,
      au: -30, al: -10, sw: -40,
      bau: -50, bal: -30,
      flu: 10, fll: 2,
      blu: -30, bll: -10,
      dx: -25, dy: -10, rot: -45, airborne: true
    },
    knockdownFlat: {
      lean: -85, drop: 30,
      au: -80, al: -70, sw: -90,
      bau: -90, bal: -80,
      flu: -75, fll: -20,
      blu: -80, bll: -25,
      dx: -35, dy: 30, rot: -90, airborne: true
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
      flu: 14, fll: 4,
      blu: -14, bll: -4,
      dx: 0, dy: 0, rot: 0, airborne: false
    },

    // -------------------------------------------------------------------------
    // 7. GROUP 3 POSES: ORIGINALS & CHALLENGE POSE
    // -------------------------------------------------------------------------
    riposteParry: {
      lean: -8, drop: 2,
      au: 60, al: 155, sw: 175,
      bau: 45, bal: 145,
      flu: 12, fll: 4,
      blu: -20, bll: -6,
      dx: -4, dy: 0, rot: 0, airborne: false
    },
    riposteSpin: {
      lean: 10, drop: 4,
      au: 110, al: 110, sw: 110,
      bau: -30, bal: 20,
      flu: 30, fll: 8,
      blu: -25, bll: -6,
      dx: 15, dy: 0, rot: 180, airborne: false
    },
    riposteCounter: {
      lean: 25, drop: 6,
      au: 90, al: 85, sw: 80,
      bau: -40, bal: -20,
      flu: 50, fll: 10,
      blu: -30, bll: -8,
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
      flu: 40, fll: 10,
      blu: -30, bll: -6,
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
      lean: 12, drop: 14,
      au: 35, al: 90, sw: 130,
      bau: -25, bal: 20,
      flu: 50, fll: 12,
      blu: -40, bll: -8,
      dx: -60, dy: 0, rot: -360, airborne: false
    },
    dashThrustDash: {
      lean: 25, drop: 10,
      au: 60, al: 80, sw: 90,
      bau: -40, bal: -20,
      flu: 45, fll: 10,
      blu: -35, bll: -8,
      dx: 60, dy: 0, rot: 0, airborne: false
    },
    dashThrustExtend: {
      lean: 35, drop: 12,
      au: 90, al: 90, sw: 90,
      bau: -60, bal: -30,
      flu: 65, fll: 15,
      blu: -45, bll: -10,
      dx: 120, dy: 0, rot: 0, airborne: false
    },
    focusKneelTyping1: {
      lean: 18, drop: 22,
      au: 75, al: 95, sw: 100,  // sword rested pointing downward
      bau: 70, bal: 85,         // typing hand out forward
      flu: 75, fll: 10,
      blu: -70, bll: -15,
      dx: 0, dy: 0, rot: 0, airborne: false
    },
    focusKneelTyping2: {
      lean: 18, drop: 22,
      au: 70, al: 90, sw: 100,
      bau: 75, bal: 92,         // small alternate tap
      flu: 75, fll: 10,
      blu: -70, bll: -15,
      dx: 0, dy: 0, rot: 0, airborne: false
    }
  };

  CF.Poses = Poses;
})();
