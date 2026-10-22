// anim/moves.js - Code Fighters Move Catalog & Keyframe Sequences
// Classic script format: attaches directly to window.CF
// Follows anim/STYLE.md:
// - Rule 4 (Per-keyframe easing: smooth windup, snappy 50-90ms strike, contact pause, slow recovery).
// - Rule 5 (Anticipation and overshoot).
// - Preserves all CONTRACT.md timings: strike times, tellMs, windupMs, hold windows.
// - 1.9s identical pose rule for enemyAttack and feint; clearly different at 2.4s.
window.CF = window.CF || {};

(function () {
  'use strict';

  const P = CF.Poses;

  // Move metadata registry matching shared/CONTRACT.md exactly:
  // tags used: attack, block, dodge, reaction, special, persistent
  // dodge tag moves: duck, stepLeft, stepRight, jump, backflipEvade
  const MOVE_INFO = {
    idle: {
      totalMs: 1200,
      strikeMs: null,
      persistent: true,
      tags: ['persistent'],
      description: 'Neutral combat stance with subtle breathing'
    },
    stepLeft: {
      totalMs: 500,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Quick sidestep to the left (evades vertical attacks)'
    },
    stepRight: {
      totalMs: 500,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Quick sidestep to the right (evades vertical attacks)'
    },
    jump: {
      totalMs: 550,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Hop into the air (evades low attacks)'
    },
    duck: {
      totalMs: 900,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Low crouch under attack (evades horizontal attacks)'
    },
    block: {
      totalMs: 900,
      strikeMs: null,
      persistent: false,
      tags: ['block'],
      description: 'Raise sword to absorb and parry incoming strikes'
    },
    slash: {
      totalMs: 400,
      strikeMs: 180,
      persistent: false,
      tags: ['attack'],
      description: 'Standard horizontal sword slash'
    },
    weakSlash: {
      totalMs: 360,
      strikeMs: 210,
      persistent: false,
      tags: ['attack'],
      description: 'Fast, low-damage quick jab slash (spec: 360ms, strike: 210ms)'
    },
    strongSlash: {
      totalMs: 700,
      strikeMs: 390,
      persistent: false,
      tags: ['attack'],
      description: 'Heavy power strike with forward step (spec: 700ms, strike: 390ms)'
    },
    comboHeavy: {
      totalMs: 1400,
      strikeMs: 300,
      strikeTimes: [300, 650, 1050],
      persistent: false,
      tags: ['attack'],
      description: 'Three-hit relentless heavy combination (spec: 1400ms, strikes: 300, 650, 1050ms)'
    },
    stumble: {
      totalMs: 1000,
      strikeMs: null,
      persistent: false,
      tags: ['reaction'],
      description: 'Off-balance wild whiff stagger (spec: 1000ms)'
    },
    hurt: {
      totalMs: 350,
      strikeMs: null,
      persistent: false,
      tags: ['reaction'],
      description: 'Flinch and recoil from taking direct hit'
    },
    knockdown: {
      totalMs: 900,
      strikeMs: null,
      persistent: true,
      tags: ['reaction', 'persistent'],
      description: 'Knocked flat to the ground from heavy hit (persistent until reset)'
    },
    victory: {
      totalMs: 800,
      strikeMs: null,
      persistent: true,
      tags: ['persistent'],
      description: 'Celebratory hop and sword salute'
    },
    enemyAttack: {
      totalMs: 3450,
      strikeMs: 3120,
      persistent: false,
      tags: ['attack'],
      description: 'Telegraphed strike with neutral coil, visual tell and strike at 3120ms'
    },
    feint: {
      totalMs: 3400,
      strikeMs: null,
      persistent: false,
      tags: ['attack'],
      description: 'Deceptive attack with identical tell that cancels into a shrug'
    },
    special: {
      totalMs: 1500,
      strikeMs: 1000,
      persistent: false,
      tags: ['attack', 'special'],
      description: 'Cinematic slam banner, deep charge, high leap, ground crash'
    },
    riposte: {
      totalMs: 700,
      strikeMs: 420,
      persistent: false,
      tags: ['attack', 'block'],
      description: 'Defensive parry followed by 360-degree counter spin'
    },
    spinSlash: {
      totalMs: 650,
      strikeMs: 180,
      strikeTimes: [180, 360, 520],
      persistent: false,
      tags: ['attack'],
      description: 'Triple full-body 360 airborne spin slice'
    },
    backflipEvade: {
      totalMs: 600,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Acrobatic backflip leap backwards (universal dodge)'
    },
    dashThrust: {
      totalMs: 500,
      strikeMs: 220,
      persistent: false,
      tags: ['attack'],
      description: 'High-speed forward lunge thrust'
    },
    focus: {
      totalMs: 1500,
      strikeMs: null,
      persistent: true,
      tags: ['persistent'],
      description: 'Kneel and type on glowing laptop terminal'
    }
  };

  /**
   * CF.getMoveInfo(name, opts)
   * Exact CONTRACT.md specification with options support:
   * Returns {totalMs, strikeMs or strikeTimes[], persistent, tags}
   */
  CF.getMoveInfo = function (name, opts) {
    opts = opts || {};
    if (name === 'special') {
      const tier = opts.tier || 'hard';
      if (tier === 'easy') {
        return { totalMs: 600, strikeMs: 350, persistent: false, tags: ['attack', 'special'] };
      } else if (tier === 'medium') {
        return { totalMs: 1100, strikeMs: 800, persistent: false, tags: ['attack', 'special'] };
      } else {
        // hard tier (default)
        return { totalMs: 1500, strikeMs: 1000, persistent: false, tags: ['attack', 'special'] };
      }
    }
    if (name === 'enemyAttack' && (opts.tier || opts.windupMs !== undefined || opts.tellMs !== undefined)) {
      const built = buildEnemyAttack(opts);
      return {
        totalMs: built.totalMs,
        strikeMs: built.strikeMs,
        persistent: false,
        tags: ['attack']
      };
    }
    if (name === 'duck' && opts.holdMs !== undefined) {
      return {
        totalMs: 150 + opts.holdMs + 150,
        strikeMs: null,
        persistent: false,
        tags: ['dodge']
      };
    }
    if (name === 'block' && opts.holdMs !== undefined) {
      return {
        totalMs: 120 + opts.holdMs + 180,
        strikeMs: null,
        persistent: false,
        tags: ['block']
      };
    }
    const info = MOVE_INFO[name];
    if (!info) {
      return {
        totalMs: 400,
        strikeMs: null,
        persistent: false,
        tags: []
      };
    }
    const res = {
      totalMs: info.totalMs,
      persistent: info.persistent,
      tags: info.tags.slice()
    };
    if (info.strikeTimes) {
      res.strikeTimes = info.strikeTimes.slice();
      res.strikeMs = info.strikeMs;
    } else {
      res.strikeMs = info.strikeMs;
    }
    return res;
  };

  CF.MOVE_INFO = MOVE_INFO;

  // --- Dynamic Move Keyframe Builders ---

  // Build keyframes for enemyAttack
  // Rule: Must be 100% in enemyCoil at 1.9s (1900ms).
  // Tell event fires at tellMs (2000ms).
  // At 2.4s (2400ms), firmly and clearly in tellH or tellV!
  // Fast strike at windupMs (3000ms) landing at 3120ms with hit-stop.
  function buildEnemyAttack(opts) {
    opts = opts || {};
    let tellMs = opts.tellMs;
    let windupMs = opts.windupMs;

    if (opts.tier === 'hard') {
      if (tellMs === undefined) tellMs = 700;
      if (windupMs === undefined) windupMs = 1000;
    } else if (opts.tier === 'medium') {
      if (tellMs === undefined) tellMs = 1200;
      if (windupMs === undefined) windupMs = 1800;
    } else {
      if (tellMs === undefined) tellMs = 2000;
      if (windupMs === undefined) windupMs = 3000;
    }

    const dir = opts.dir || 'h'; // 'h', 'v', or 'pending'
    const sweepMs = 120;
    const recoverMs = 330;
    const totalMs = windupMs + sweepMs + recoverMs;
    const strikeMs = windupMs + sweepMs;

    const tellPose = (dir === 'v') ? P.tellV : P.tellH;
    const strikePose = (dir === 'v') ? P.strikeV : P.strikeH;

    // Strict 1.9s identical pose guarantee:
    // From 0ms to tellMs, holds P.enemyCoil without divergence.
    const keyframes = [
      { t: 0, pose: P.enemyCoil, ease: 'easeOut' },
      { t: tellMs, pose: P.enemyCoil, ease: 'linear' }, // At 1900ms, strictly enemyCoil!
      { t: Math.min(windupMs - 400, tellMs + 280), pose: tellPose, ease: 'easeInOut' }, // At 2300-2400ms, tell is complete
      { t: windupMs, pose: tellPose, ease: 'easeIn' },  // Tension hold
      { t: windupMs + sweepMs, pose: strikePose, ease: 'easeOut' }, // Snappy strike action (strikeMs)
      { t: windupMs + sweepMs + 60, pose: strikePose, ease: 'linear' }, // Micro contact pause (2 frames)
      { t: windupMs + sweepMs + 160, pose: P.slashRecover, ease: 'easeOut' }, // Settle
      { t: totalMs, pose: P.idle, ease: 'easeOut' } // Deliberate recovery
    ];

    const events = [
      { t: tellMs, name: 'tell', data: { dir: dir } },
      { t: strikeMs, name: 'strike', data: { strikeIndex: 0, tag: 'strike', dir: dir } }
    ];

    return {
      name: 'enemyAttack',
      tags: ['attack'],
      totalMs: totalMs,
      strikeMs: strikeMs,
      tellMs: tellMs,
      windupMs: windupMs,
      dir: dir,
      keyframes: keyframes,
      events: events
    };
  }

  // Build keyframes for feint
  // Identical to enemyAttack at 1.9s (enemyCoil) and 2.4s (tell pose).
  // At windupMs (3000ms), cancels into shrug instead of striking.
  // Never fires 'strike' event.
  function buildFeint(opts) {
    opts = opts || {};
    let tellMs = opts.tellMs;
    let windupMs = opts.windupMs;

    if (opts.tier === 'hard') {
      if (tellMs === undefined) tellMs = 700;
      if (windupMs === undefined) windupMs = 1000;
    } else if (opts.tier === 'medium') {
      if (tellMs === undefined) tellMs = 1200;
      if (windupMs === undefined) windupMs = 1800;
    } else {
      if (tellMs === undefined) tellMs = 2000;
      if (windupMs === undefined) windupMs = 3000;
    }

    const dir = opts.dir || 'h';
    const shrugMs = 160;
    const holdShrugMs = 140;
    const recoverMs = 100;
    const totalMs = windupMs + shrugMs + holdShrugMs + recoverMs;

    const tellPose = (dir === 'v') ? P.tellV : P.tellH;

    const keyframes = [
      { t: 0, pose: P.enemyCoil, ease: 'easeOut' },
      { t: tellMs, pose: P.enemyCoil, ease: 'linear' }, // Identical at 1.9s
      { t: Math.min(windupMs - 400, tellMs + 280), pose: tellPose, ease: 'easeInOut' }, // Distinct at 2.4s
      { t: windupMs, pose: tellPose, ease: 'easeIn' },
      { t: windupMs + shrugMs, pose: P.feintShrug, ease: 'easeOut' }, // Snappy shrug
      { t: windupMs + shrugMs + holdShrugMs, pose: P.feintShrug, ease: 'linear' },
      { t: totalMs, pose: P.idle, ease: 'easeOut' }
    ];

    const events = [
      { t: tellMs, name: 'tell', data: { dir: dir } }
    ];

    return {
      name: 'feint',
      tags: ['attack'],
      totalMs: totalMs,
      strikeMs: null,
      tellMs: tellMs,
      windupMs: windupMs,
      dir: dir,
      keyframes: keyframes,
      events: events
    };
  }

  // Build keyframes for special move supporting tier variants:
  // easy: no leap, small spark, 600ms total, strike at 350ms
  // medium: quick banner flash, 1100ms total, strike at 800ms
  // hard (default): full slam banner, 1500ms total, strike at 1000ms
  function buildSpecial(opts) {
    opts = opts || {};
    const tier = opts.tier || 'hard';

    if (tier === 'easy') {
      const impactTime = 350;
      const totalMs = 600;
      const keyframes = [
        { t: 0, pose: P.specialCharge, ease: 'easeOut' },
        { t: 250, pose: P.specialCharge, ease: 'easeIn' },
        { t: impactTime, pose: P.specialSlam, ease: 'easeOut' },
        { t: 410, pose: P.specialSlam, ease: 'linear' }, // pause
        { t: totalMs, pose: P.idle, ease: 'easeOut' }
      ];
      const events = [
        { t: impactTime, name: 'strike', data: { strikeIndex: 0, tag: 'slam', tier: 'easy' } }
      ];
      return {
        name: 'special',
        tags: ['attack', 'special'],
        totalMs: totalMs,
        strikeMs: impactTime,
        tier: tier,
        keyframes: keyframes,
        events: events
      };
    }

    if (tier === 'medium') {
      const bannerMs = 200;
      const chargeMs = 250;
      const leapMs = 250;
      const slamMs = 100;
      const impactTime = bannerMs + chargeMs + leapMs + slamMs; // 800ms
      const pauseMs = 60;
      const recoverMs = 240;
      const totalMs = 1100; // 800 + 60 + 240 = 1100ms

      const keyframes = [
        { t: 0, pose: P.specialCharge, ease: 'easeOut' },
        { t: bannerMs, pose: P.specialCharge, ease: 'linear' },
        { t: bannerMs + chargeMs, pose: P.specialCharge, ease: 'easeIn' },
        { t: bannerMs + chargeMs + leapMs, pose: P.specialLeap, ease: 'easeOut' },
        { t: impactTime, pose: P.specialSlam, ease: 'easeIn' },
        { t: impactTime + pauseMs, pose: P.specialSlam, ease: 'linear' },
        { t: impactTime + pauseMs + recoverMs, pose: P.specialRecover, ease: 'easeOut' },
        { t: totalMs, pose: P.idle, ease: 'easeOut' }
      ];
      const events = [
        { t: 0, name: 'banner', data: { text: 'SPECIAL SLAM', subtext: 'MEDIUM TIER' } },
        { t: impactTime, name: 'strike', data: { strikeIndex: 0, tag: 'slam', tier: 'medium' } }
      ];
      return {
        name: 'special',
        tags: ['attack', 'special'],
        totalMs: totalMs,
        strikeMs: impactTime,
        tier: tier,
        keyframes: keyframes,
        events: events
      };
    }

    // Default: 'hard' tier
    const bannerMs = 300;
    const chargeMs = 350;
    const leapMs = 250;
    const slamMs = 100;
    const impactTime = bannerMs + chargeMs + leapMs + slamMs; // 1000ms
    const pauseMs = 100;
    const recoverMs = 400;
    const totalMs = 1500; // 1000 + 100 + 400 = 1500ms

    const keyframes = [
      { t: 0, pose: P.specialCharge, ease: 'easeOut' },
      { t: bannerMs, pose: P.specialCharge, ease: 'linear' },
      { t: bannerMs + chargeMs, pose: P.specialCharge, ease: 'easeIn' },
      { t: bannerMs + chargeMs + leapMs, pose: P.specialLeap, ease: 'easeOut' },
      { t: impactTime, pose: P.specialSlam, ease: 'easeIn' },
      { t: impactTime + pauseMs, pose: P.specialSlam, ease: 'linear' }, // Heavy contact pause
      { t: impactTime + pauseMs + recoverMs, pose: P.specialRecover, ease: 'easeOut' },
      { t: totalMs, pose: P.idle, ease: 'easeOut' }
    ];

    const events = [
      { t: 0, name: 'banner', data: { text: 'SPECIAL SLAM', subtext: 'CRITICAL IMPACT' } },
      { t: impactTime, name: 'strike', data: { strikeIndex: 0, tag: 'slam', tier: 'hard' } }
    ];

    return {
      name: 'special',
      tags: ['attack', 'special'],
      totalMs: totalMs,
      strikeMs: impactTime,
      tier: tier,
      keyframes: keyframes,
      events: events
    };
  }

  // Static Move Keyframe Library
  const MOVES = {
    // -------------------------------------------------------------------------
    // 1. BASIC STANCE
    // -------------------------------------------------------------------------
    idle: {
      name: 'idle',
      tags: ['persistent'],
      totalMs: 1200,
      strikeMs: null,
      loop: true,
      persistent: true,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeInOut' },
        { t: 600, pose: P.idle, ease: 'easeInOut' },
        { t: 1200, pose: P.idle, ease: 'easeInOut' }
      ],
      events: []
    },

    // -------------------------------------------------------------------------
    // 2. DEFENCE & DODGES (Snappy dodge, clear hold window, smooth recover)
    // -------------------------------------------------------------------------
    stepLeft: {
      name: 'stepLeft',
      tags: ['dodge'],
      totalMs: 500,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 150, pose: P.stepLeftOut, ease: 'easeOut' },  // Slide out 46px in 150ms
        { t: 300, pose: P.stepLeftOut, ease: 'linear' },   // Hold window: 150-300ms
        { t: 500, pose: P.idle, ease: 'easeOut' }          // Return in 200ms
      ],
      events: [
        { t: 150, name: 'dust', data: { count: 3 } }
      ]
    },

    stepRight: {
      name: 'stepRight',
      tags: ['dodge'],
      totalMs: 500,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 150, pose: P.stepRightOut, ease: 'easeOut' }, // Slide out 46px in 150ms
        { t: 300, pose: P.stepRightOut, ease: 'linear' },  // Hold window: 150-300ms
        { t: 500, pose: P.idle, ease: 'easeOut' }          // Return in 200ms
      ],
      events: [
        { t: 150, name: 'dust', data: { count: 3 } }
      ]
    },

    jump: {
      name: 'jump',
      tags: ['dodge'],
      totalMs: 550,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeInOut' },
        { t: 60, pose: P.jumpCrouch, ease: 'easeInOut' }, // Anticipation crouch
        { t: 240, pose: P.jumpApex, ease: 'easeOut' },    // Explosive rise
        { t: 400, pose: P.jumpFall, ease: 'easeIn' },     // Gravity fall
        { t: 470, pose: P.jumpLand, ease: 'easeOut' },    // Impact landing & compression overshoot
        { t: 550, pose: P.idle, ease: 'easeOut' }         // Settle to stance
      ],
      events: [
        { t: 60, name: 'dust', data: { count: 3 } },
        { t: 470, name: 'land', data: { count: 4 } }
      ]
    },

    duck: {
      name: 'duck',
      tags: ['dodge'],
      totalMs: 900,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 150, pose: P.duck, ease: 'easeOut' },  // 150ms down
        { t: 750, pose: P.duck, ease: 'linear' },   // 600ms hold window (150-750ms)
        { t: 900, pose: P.idle, ease: 'easeOut' }   // 150ms up
      ],
      events: []
    },

    block: {
      name: 'block',
      tags: ['block'],
      totalMs: 900,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 120, pose: P.block, ease: 'easeOut' },  // 120ms in
        { t: 720, pose: P.block, ease: 'linear' },   // 600ms hold window (120-720ms)
        { t: 900, pose: P.idle, ease: 'easeOut' }    // 180ms recovery
      ],
      events: []
    },

    // -------------------------------------------------------------------------
    // 3. BASIC ATTACK & REACTIONS
    // -------------------------------------------------------------------------
    // Slash:
    // 0-110ms: windup (smooth anticipation leaning back)
    // 110-180ms: fast 70ms strike sweep landing at exactly 180ms!
    // 180-220ms: contact pause & subtle overshoot (40ms)
    // 220-400ms: deliberate slower recovery (180ms)
    slash: {
      name: 'slash',
      tags: ['attack'],
      totalMs: 400,
      strikeMs: 180,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeInOut' },
        { t: 110, pose: P.slashWindup, ease: 'easeInOut' }, // Anticipation
        { t: 180, pose: P.slashStrike, ease: 'easeOut' },   // Fast 70ms strike!
        { t: 220, pose: P.slashOvershoot, ease: 'linear' }, // Micro contact pause / overshoot
        { t: 300, pose: P.slashRecover, ease: 'easeOut' },  // Settle
        { t: 400, pose: P.idle, ease: 'easeOut' }           // Slower recovery
      ],
      events: [
        { t: 180, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } }
      ]
    },

    hurt: {
      name: 'hurt',
      tags: ['reaction'],
      totalMs: 350,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 60, pose: P.hurt, ease: 'easeOut' },           // Instant violent snap back (60ms)
        { t: 160, pose: P.hurtRecover, ease: 'linear' },    // Recoil settle
        { t: 350, pose: P.idle, ease: 'easeOut' }           // Return to ready
      ],
      events: []
    },

    blockRecoil: {
      name: 'blockRecoil',
      tags: ['reaction', 'block'],
      totalMs: 320,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.block, ease: 'easeOut' },
        { t: 50, pose: P.blockRecoil, ease: 'easeOut' },   // Sharp shield recoil
        { t: 180, pose: P.block, ease: 'linear' },         // Regain balance
        { t: 320, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    // -------------------------------------------------------------------------
    // 4. GROUP 2 MOVES (Original Spec Durations & Easing)
    // -------------------------------------------------------------------------
    weakSlash: {
      name: 'weakSlash',
      tags: ['attack'],
      totalMs: 360,
      strikeMs: 210,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeInOut' },
        { t: 140, pose: P.weakSlashWindup, ease: 'easeInOut' },
        { t: 210, pose: P.weakSlashStrike, ease: 'easeOut' }, // Snappy 70ms strike action
        { t: 250, pose: P.weakSlashStrike, ease: 'linear' },  // Micro contact pause
        { t: 300, pose: P.slashRecover, ease: 'easeOut' },
        { t: 360, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 210, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } }
      ]
    },

    strongSlash: {
      name: 'strongSlash',
      tags: ['attack'],
      totalMs: 700,
      strikeMs: 390,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeInOut' },
        { t: 280, pose: P.strongSlashWindup, ease: 'easeInOut' }, // Lean-back windup (280ms)
        { t: 390, pose: P.strongSlashStrike, ease: 'easeOut' },   // Crushing 110ms strike with forward step
        { t: 470, pose: P.strongSlashStrike, ease: 'linear' },   // 80ms hit-stop contact pause
        { t: 580, pose: P.slashRecover, ease: 'easeOut' },
        { t: 700, pose: P.idle, ease: 'easeOut' }                // 220ms recovery
      ],
      events: [
        { t: 390, name: 'strike', data: { strikeIndex: 0, tag: 'heavy' } }
      ]
    },

    comboHeavy: {
      name: 'comboHeavy',
      tags: ['attack'],
      totalMs: 1400,
      strikeMs: 300,
      strikeTimes: [300, 650, 1050],
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeInOut' },
        { t: 180, pose: P.slashWindup, ease: 'easeInOut' },
        { t: 300, pose: P.comboSlash1, ease: 'easeOut' }, // Hit 1 (slash)
        { t: 360, pose: P.comboSlash1, ease: 'linear' },
        { t: 500, pose: P.tellH, ease: 'easeInOut' },
        { t: 650, pose: P.comboSlash2, ease: 'easeOut' }, // Hit 2 (backhand)
        { t: 720, pose: P.comboSlash2, ease: 'linear' },
        { t: 900, pose: P.tellV, ease: 'easeInOut' },
        { t: 1050, pose: P.comboOverhead, ease: 'easeOut' }, // Hit 3 (overhead)
        { t: 1150, pose: P.comboOverhead, ease: 'linear' }, // Final heavy contact pause
        { t: 1280, pose: P.slashRecover, ease: 'easeOut' },
        { t: 1400, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 300, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } },
        { t: 650, name: 'strike', data: { strikeIndex: 1, tag: 'strike' } },
        { t: 1050, name: 'strike', data: { strikeIndex: 2, tag: 'heavy' } }
      ]
    },

    stumble: {
      name: 'stumble',
      tags: ['reaction'],
      totalMs: 1000,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 200, pose: P.stumbleWindup, ease: 'easeInOut' },
        { t: 500, pose: P.stumbleOverbalance, ease: 'easeInOut' }, // Lean 42, dx 22
        { t: 780, pose: P.stumbleRecover, ease: 'easeInOut' },
        { t: 1000, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    knockdown: {
      name: 'knockdown',
      tags: ['reaction', 'persistent'],
      totalMs: 900,
      strikeMs: null,
      persistent: true,
      loop: false,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 240, pose: P.knockdownFall, ease: 'easeIn' },
        { t: 500, pose: P.knockdownFlat, ease: 'linear' },
        { t: 900, pose: P.knockdownFlat, ease: 'linear' }
      ],
      events: [
        { t: 480, name: 'dust', data: { count: 5 } }
      ]
    },

    victory: {
      name: 'victory',
      tags: ['persistent'],
      totalMs: 800,
      strikeMs: null,
      loop: false,
      persistent: true,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 180, pose: P.jumpCrouch, ease: 'easeOut' },
        { t: 380, pose: P.victoryHop, ease: 'easeInOut' },
        { t: 580, pose: P.victoryPose, ease: 'easeOut' },
        { t: 800, pose: P.victoryPose, ease: 'linear' }
      ],
      events: []
    },

    // -------------------------------------------------------------------------
    // 5. GROUP 3 MOVES
    // -------------------------------------------------------------------------
    riposte: {
      name: 'riposte',
      tags: ['attack', 'block'],
      totalMs: 700,
      strikeMs: 420,
      keyframes: [
        { t: 0, pose: P.block, ease: 'easeOut' },
        { t: 120, pose: P.riposteParry, ease: 'easeInOut' },
        { t: 280, pose: P.riposteSpin, ease: 'linear' },
        { t: 420, pose: P.riposteCounter, ease: 'easeOut' },
        { t: 560, pose: P.slashRecover, ease: 'easeInOut' },
        { t: 700, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 120, name: 'parry', data: {} },
        { t: 420, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } }
      ]
    },

    spinSlash: {
      name: 'spinSlash',
      tags: ['attack'],
      totalMs: 650,
      strikeMs: 180,
      strikeTimes: [180, 360, 520],
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 180, pose: P.spinSlashSpin1, ease: 'linear' },
        { t: 360, pose: P.spinSlashSpin2, ease: 'linear' },
        { t: 520, pose: P.spinSlashSpin3, ease: 'easeOut' },
        { t: 650, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 180, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } },
        { t: 360, name: 'strike', data: { strikeIndex: 1, tag: 'strike' } },
        { t: 520, name: 'strike', data: { strikeIndex: 2, tag: 'strike' } }
      ]
    },

    backflipEvade: {
      name: 'backflipEvade',
      tags: ['dodge'],
      totalMs: 600,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 80, pose: P.jumpCrouch, ease: 'easeOut' },
        { t: 300, pose: P.backflipTuck, ease: 'linear' },
        { t: 480, pose: P.backflipLand, ease: 'easeOut' },
        { t: 600, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 480, name: 'land', data: { count: 4 } }
      ]
    },

    dashThrust: {
      name: 'dashThrust',
      tags: ['attack'],
      totalMs: 500,
      strikeMs: 220,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 80, pose: P.dashThrustDash, ease: 'easeIn' },
        { t: 220, pose: P.dashThrustExtend, ease: 'easeOut' },
        { t: 270, pose: P.dashThrustExtend, ease: 'linear' }, // Contact pause
        { t: 370, pose: P.slashRecover, ease: 'easeInOut' },
        { t: 500, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 80, name: 'dust', data: { count: 3 } },
        { t: 220, name: 'strike', data: { strikeIndex: 0, tag: 'thrust' } }
      ]
    },

    focus: {
      name: 'focus',
      tags: ['persistent'],
      totalMs: 1500,
      strikeMs: null,
      loop: true,
      persistent: true,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 200, pose: P.duck, ease: 'easeInOut' },
        { t: 400, pose: P.focusKneelTyping1, ease: 'easeInOut' },
        { t: 650, pose: P.focusKneelTyping2, ease: 'easeInOut' },
        { t: 900, pose: P.focusKneelTyping1, ease: 'easeInOut' },
        { t: 1150, pose: P.focusKneelTyping2, ease: 'easeInOut' },
        { t: 1500, pose: P.focusKneelTyping1, ease: 'linear' }
      ],
      events: []
    }
  };

  CF.MOVES = MOVES;

  /**
   * Helper to retrieve or build a playable move object given options
   */
  CF.resolveMove = function (name, opts) {
    opts = opts || {};
    if (name === 'enemyAttack') {
      return buildEnemyAttack(opts);
    }
    if (name === 'feint') {
      return buildFeint(opts);
    }
    if (name === 'special') {
      return buildSpecial(opts);
    }
    if (name === 'duck' && opts.holdMs !== undefined) {
      const hold = opts.holdMs;
      return {
        name: 'duck',
        tags: ['dodge'],
        totalMs: 150 + hold + 150,
        strikeMs: null,
        keyframes: [
          { t: 0, pose: P.idle, ease: 'easeOut' },
          { t: 150, pose: P.duck, ease: 'easeOut' },
          { t: 150 + hold, pose: P.duck, ease: 'linear' },
          { t: 300 + hold, pose: P.idle, ease: 'easeOut' }
        ],
        events: []
      };
    }
    if (name === 'block' && opts.holdMs !== undefined) {
      const hold = opts.holdMs;
      return {
        name: 'block',
        tags: ['block'],
        totalMs: 120 + hold + 180,
        strikeMs: null,
        keyframes: [
          { t: 0, pose: P.idle, ease: 'easeOut' },
          { t: 120, pose: P.block, ease: 'easeOut' },
          { t: 120 + hold, pose: P.block, ease: 'linear' },
          { t: 300 + hold, pose: P.idle, ease: 'easeOut' }
        ],
        events: []
      };
    }
    if (MOVES[name]) {
      return MOVES[name];
    }
    return MOVES.idle;
  };

})();
