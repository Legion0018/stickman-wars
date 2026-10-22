// anim/moves.js - Code Fighters Move Catalog & Keyframe Sequences
// Classic script format: attaches directly to window.CF
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
      totalMs: 320,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Quick sidestep to the left (evades vertical attacks)'
    },
    stepRight: {
      totalMs: 320,
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
      totalMs: 350,
      strikeMs: null,
      persistent: false,
      tags: ['dodge'],
      description: 'Low crouch under attack (evades horizontal attacks)'
    },
    block: {
      totalMs: 400,
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
      totalMs: 300,
      strikeMs: 130,
      persistent: false,
      tags: ['attack'],
      description: 'Fast, low-damage quick jab slash'
    },
    strongSlash: {
      totalMs: 600,
      strikeMs: 320,
      persistent: false,
      tags: ['attack'],
      description: 'Heavy overhead power strike with long windup'
    },
    comboHeavy: {
      totalMs: 900,
      strikeMs: 200,
      strikeTimes: [200, 480, 750],
      persistent: false,
      tags: ['attack'],
      description: 'Three-hit relentless heavy combination'
    },
    stumble: {
      totalMs: 650,
      strikeMs: null,
      persistent: false,
      tags: ['reaction'],
      description: 'Off-balance stagger recovery from blocked or parried hit'
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
      persistent: false,
      tags: ['reaction'],
      description: 'Knocked flat to the ground from heavy hit'
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
      description: 'Telegraphed strike with neutral coil, visual tell and strike'
    },
    feint: {
      totalMs: 3400,
      strikeMs: null,
      persistent: false,
      tags: ['attack'],
      description: 'Deceptive attack with identical tell that cancels into a shrug'
    },
    special: {
      totalMs: 1800,
      strikeMs: 1200,
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
   * CF.getMoveInfo(name)
   * Exact CONTRACT.md specification:
   * Returns {totalMs, strikeMs or strikeTimes[], persistent, tags}
   */
  CF.getMoveInfo = function (name) {
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

    const tellPoseName = (dir === 'v') ? 'tellV' : 'tellH';
    const strikePoseName = (dir === 'v') ? 'strikeV' : 'strikeH';

    const keyframes = [
      { t: 0, pose: P.enemyCoil, ease: 'easeOut' },
      { t: tellMs, pose: P.enemyCoil, ease: 'linear' },
      { t: Math.min(windupMs, tellMs + 220), pose: P[tellPoseName] || P.tellH, ease: 'easeInOut' },
      { t: windupMs, pose: P[tellPoseName] || P.tellH, ease: 'easeIn' },
      { t: windupMs + sweepMs, pose: P[strikePoseName] || P.strikeH, ease: 'easeOut' },
      { t: windupMs + sweepMs + 160, pose: P.slashRecover, ease: 'easeInOut' },
      { t: totalMs, pose: P.idle, ease: 'easeOut' }
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
    const shrugMs = 200;
    const holdShrugMs = 150;
    const recoverMs = 200;
    const totalMs = windupMs + shrugMs + holdShrugMs + recoverMs;

    const tellPoseName = (dir === 'v') ? 'tellV' : 'tellH';

    const keyframes = [
      { t: 0, pose: P.enemyCoil, ease: 'easeOut' },
      { t: tellMs, pose: P.enemyCoil, ease: 'linear' },
      { t: Math.min(windupMs, tellMs + 220), pose: P[tellPoseName] || P.tellH, ease: 'easeInOut' },
      { t: windupMs, pose: P[tellPoseName] || P.tellH, ease: 'easeIn' },
      { t: windupMs + shrugMs, pose: P.feintShrug, ease: 'easeOut' },
      { t: windupMs + shrugMs + holdShrugMs, pose: P.feintShrug, ease: 'linear' },
      { t: totalMs, pose: P.idle, ease: 'easeOut' }
    ];

    // Feint fires 'tell' event, but NEVER fires 'strike' event
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

  // Build keyframes for special move
  function buildSpecial(opts) {
    const bannerMs = 400;
    const chargeMs = 300;
    const leapMs = 300;
    const slamMs = 200;
    const impactTime = bannerMs + chargeMs + leapMs + slamMs; // 1200ms
    const recoverMs = 300;
    const returnMs = 300;
    const totalMs = impactTime + recoverMs + returnMs; // 1800ms

    const keyframes = [
      { t: 0, pose: P.specialCharge, ease: 'easeOut' },
      { t: bannerMs, pose: P.specialCharge, ease: 'linear' },
      { t: bannerMs + chargeMs, pose: P.specialCharge, ease: 'easeIn' },
      { t: bannerMs + chargeMs + leapMs, pose: P.specialLeap, ease: 'easeOut' },
      { t: impactTime, pose: P.specialSlam, ease: 'easeIn' },
      { t: impactTime + recoverMs, pose: P.specialRecover, ease: 'easeInOut' },
      { t: totalMs, pose: P.idle, ease: 'easeOut' }
    ];

    const events = [
      { t: 0, name: 'banner', data: { text: 'SPECIAL SLAM', subtext: 'DEVASTATING CRASH' } },
      { t: impactTime, name: 'strike', data: { strikeIndex: 0, tag: 'slam' } }
    ];

    return {
      name: 'special',
      tags: ['attack', 'special'],
      totalMs: totalMs,
      strikeMs: impactTime,
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
    // 2. DEFENCE & DODGES
    // -------------------------------------------------------------------------
    stepLeft: {
      name: 'stepLeft',
      tags: ['dodge'],
      totalMs: 320,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 140, pose: P.stepLeftOut, ease: 'easeOut' },
        { t: 320, pose: P.idle, ease: 'easeInOut' }
      ],
      events: []
    },

    stepRight: {
      name: 'stepRight',
      tags: ['dodge'],
      totalMs: 320,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 140, pose: P.stepRightOut, ease: 'easeOut' },
        { t: 320, pose: P.idle, ease: 'easeInOut' }
      ],
      events: []
    },

    jump: {
      name: 'jump',
      tags: ['dodge'],
      totalMs: 550,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 70, pose: P.jumpCrouch, ease: 'easeOut' },
        { t: 260, pose: P.jumpApex, ease: 'easeIn' },
        { t: 400, pose: P.jumpFall, ease: 'easeIn' },
        { t: 470, pose: P.jumpLand, ease: 'easeOut' },
        { t: 550, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 70, name: 'dust', data: { count: 6 } },
        { t: 470, name: 'land', data: { count: 8 } }
      ]
    },

    duck: {
      name: 'duck',
      tags: ['dodge'],
      totalMs: 350,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 90, pose: P.duck, ease: 'linear' },
        { t: 250, pose: P.duck, ease: 'easeInOut' },
        { t: 350, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    block: {
      name: 'block',
      tags: ['block'],
      totalMs: 400,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 90, pose: P.block, ease: 'linear' },
        { t: 300, pose: P.block, ease: 'easeInOut' },
        { t: 400, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    // -------------------------------------------------------------------------
    // 3. BASIC ATTACK & REACTIONS
    // -------------------------------------------------------------------------
    slash: {
      name: 'slash',
      tags: ['attack'],
      totalMs: 400,
      strikeMs: 180,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 90, pose: P.slashWindup, ease: 'easeIn' },
        { t: 180, pose: P.slashStrike, ease: 'easeOut' },
        { t: 280, pose: P.slashRecover, ease: 'easeInOut' },
        { t: 400, pose: P.idle, ease: 'easeOut' }
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
        { t: 70, pose: P.hurt, ease: 'easeInOut' },
        { t: 220, pose: P.hurtRecover, ease: 'easeInOut' },
        { t: 350, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    // Block recoil reaction when taking a hit while blocking
    blockRecoil: {
      name: 'blockRecoil',
      tags: ['reaction', 'block'],
      totalMs: 320,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.block, ease: 'easeOut' },
        { t: 60, pose: P.blockRecoil, ease: 'easeInOut' },
        { t: 220, pose: P.block, ease: 'easeInOut' },
        { t: 320, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    // -------------------------------------------------------------------------
    // 4. GROUP 2 MOVES
    // -------------------------------------------------------------------------
    weakSlash: {
      name: 'weakSlash',
      tags: ['attack'],
      totalMs: 300,
      strikeMs: 130,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 70, pose: P.weakSlashWindup, ease: 'easeIn' },
        { t: 130, pose: P.weakSlashStrike, ease: 'easeOut' },
        { t: 220, pose: P.slashRecover, ease: 'easeInOut' },
        { t: 300, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 130, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } }
      ]
    },

    strongSlash: {
      name: 'strongSlash',
      tags: ['attack'],
      totalMs: 600,
      strikeMs: 320,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 180, pose: P.strongSlashWindup, ease: 'easeIn' },
        { t: 320, pose: P.strongSlashStrike, ease: 'easeOut' },
        { t: 460, pose: P.slashRecover, ease: 'easeInOut' },
        { t: 600, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 320, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } }
      ]
    },

    comboHeavy: {
      name: 'comboHeavy',
      tags: ['attack'],
      totalMs: 900,
      strikeMs: 200,
      strikeTimes: [200, 480, 750],
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 90, pose: P.slashWindup, ease: 'easeIn' },
        { t: 200, pose: P.comboSlash1, ease: 'easeOut' },
        { t: 340, pose: P.tellH, ease: 'easeInOut' },
        { t: 480, pose: P.comboSlash2, ease: 'easeOut' },
        { t: 620, pose: P.tellV, ease: 'easeInOut' },
        { t: 750, pose: P.comboOverhead, ease: 'easeOut' },
        { t: 900, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 200, name: 'strike', data: { strikeIndex: 0, tag: 'strike' } },
        { t: 480, name: 'strike', data: { strikeIndex: 1, tag: 'strike' } },
        { t: 750, name: 'strike', data: { strikeIndex: 2, tag: 'strike' } }
      ]
    },

    stumble: {
      name: 'stumble',
      tags: ['reaction'],
      totalMs: 650,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeOut' },
        { t: 120, pose: P.stumbleWindup, ease: 'easeInOut' },
        { t: 320, pose: P.stumbleOverbalance, ease: 'easeInOut' },
        { t: 500, pose: P.stumbleRecover, ease: 'easeInOut' },
        { t: 650, pose: P.idle, ease: 'easeOut' }
      ],
      events: []
    },

    knockdown: {
      name: 'knockdown',
      tags: ['reaction'],
      totalMs: 900,
      strikeMs: null,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 250, pose: P.knockdownFall, ease: 'easeIn' },
        { t: 500, pose: P.knockdownFlat, ease: 'linear' },
        { t: 750, pose: P.duck, ease: 'easeOut' },
        { t: 900, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 480, name: 'dust', data: { count: 12 } }
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
        { t: 200, pose: P.jumpCrouch, ease: 'easeOut' },
        { t: 400, pose: P.victoryHop, ease: 'easeInOut' },
        { t: 600, pose: P.victoryPose, ease: 'easeOut' },
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
        { t: 90, pose: P.jumpCrouch, ease: 'easeOut' },
        { t: 300, pose: P.backflipTuck, ease: 'linear' },
        { t: 480, pose: P.backflipLand, ease: 'easeOut' },
        { t: 600, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 480, name: 'land', data: { count: 8 } }
      ]
    },

    dashThrust: {
      name: 'dashThrust',
      tags: ['attack'],
      totalMs: 500,
      strikeMs: 220,
      keyframes: [
        { t: 0, pose: P.idle, ease: 'easeIn' },
        { t: 90, pose: P.dashThrustDash, ease: 'easeIn' },
        { t: 220, pose: P.dashThrustExtend, ease: 'easeOut' },
        { t: 360, pose: P.slashRecover, ease: 'easeInOut' },
        { t: 500, pose: P.idle, ease: 'easeOut' }
      ],
      events: [
        { t: 90, name: 'dust', data: { count: 6 } },
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
    if (name === 'enemyAttack') {
      return buildEnemyAttack(opts);
    }
    if (name === 'feint') {
      return buildFeint(opts);
    }
    if (name === 'special') {
      return buildSpecial(opts);
    }
    if (MOVES[name]) {
      return MOVES[name];
    }
    return MOVES.idle;
  };

})();
