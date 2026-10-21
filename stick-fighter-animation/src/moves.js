/**
 * ARC Stick-Fighter Animation Engine — Move Catalogue
 * Stage 2 Complete 27-Move Library
 */
(function(root) {
  'use strict';

  var P = root.Poses.POSES;
  var createPose = root.Poses.createPose;

  /**
   * Helper to build a move object
   */
  function move(name, category, phases, events, options) {
    options = options || {};
    var totalMs = 0;
    for (var i = 0; i < phases.length; i++) {
      totalMs += phases[i].durationMs;
    }
    return {
      name: name,
      category: category,
      phases: phases,
      events: events || [],
      totalDurationMs: totalMs,
      loop: !!options.loop,
      description: options.description || name
    };
  }

  // --- Dynamic Pose Derivatives for Multi-Phase Moves ---
  var whirlwindRot1 = createPose(P.strike, 0, -25, 240);
  var whirlwindRot2 = createPose(P.strike, 0, -20, 480);
  var whirlwindRot3 = createPose(P.strike, 0, 0, 720);

  var flipMid = createPose(P.duck, -30, -55, -180);
  var flipEnd = createPose(P.idle, -60, 0, -360);

  var sidestepBackPose = createPose(P.idle, -45, -4, 0);
  var sidestepFwdPose = createPose(P.idle, 45, -4, 0);

  var dashPrep = createPose(P.duck, -10, 8, 4);
  var dashBurst = createPose(P.thrust, 140, 0, 2);

  var combo1Strike = createPose(P.strike, 12, 0, 0);
  var combo2Swing = createPose(P.thrust, 22, -4, 4);
  var combo3Overhead = createPose(P.smashSlam, 28, 0, 16);

  var victoryHop2 = createPose(P.victoryHop, 0, -18, 0);

  /**
   * Move Builders for Configurable Timing Attacks (horizontal, vertical, feint)
   */
  function buildAttackHorizontal(options) {
    options = options || {};
    var tellAtMs = options.tellAtMs !== undefined ? options.tellAtMs : 2000;
    var windupMs = options.windupMs !== undefined ? options.windupMs : 3000;
    var sweepMs = 120;
    var recoveryMs = 350;

    var phases = [
      { pose: P.horizontalTell, durationMs: tellAtMs },
      { pose: P.horizontalTell, durationMs: Math.max(10, windupMs - tellAtMs) },
      { pose: P.strike, durationMs: sweepMs },
      { pose: P.strike, durationMs: recoveryMs }
    ];

    var events = [
      { name: 'tell', timeMs: tellAtMs },
      { name: 'strikeLands', timeMs: windupMs + sweepMs }
    ];

    return move('attack_horizontal', 'basic', phases, events, {
      description: 'Horizontal slash with long visual tell'
    });
  }

  function buildAttackVertical(options) {
    options = options || {};
    var tellAtMs = options.tellAtMs !== undefined ? options.tellAtMs : 2000;
    var windupMs = options.windupMs !== undefined ? options.windupMs : 3000;
    var chopMs = 120;
    var recoveryMs = 350;

    var phases = [
      { pose: P.overheadTell, durationMs: tellAtMs },
      { pose: P.overheadTell, durationMs: Math.max(10, windupMs - tellAtMs) },
      { pose: P.smashSlam, durationMs: chopMs },
      { pose: P.smashSlam, durationMs: recoveryMs }
    ];

    var events = [
      { name: 'tell', timeMs: tellAtMs },
      { name: 'strikeLands', timeMs: windupMs + chopMs }
    ];

    return move('attack_vertical', 'basic', phases, events, {
      description: 'Vertical downward chop with overhead tell'
    });
  }

  function buildFeint(options) {
    options = options || {};
    var tellAtMs = options.tellAtMs !== undefined ? options.tellAtMs : 2000;
    var holdUntilMs = 2800;
    var relaxMs = 350;

    var phases = [
      { pose: P.horizontalTell, durationMs: tellAtMs },
      { pose: P.horizontalTell, durationMs: Math.max(10, holdUntilMs - tellAtMs) },
      { pose: P.feintRelax, durationMs: relaxMs }
    ];

    var events = [
      { name: 'tell', timeMs: tellAtMs },
      { name: 'feintRelax', timeMs: holdUntilMs }
    ];

    return move('feint', 'basic', phases, events, {
      description: 'Telegraphed attack that relaxes without striking'
    });
  }

  /**
   * The Master Move Catalogue (27 named move entries / 29 variants)
   */
  var CATALOGUE = {
    // 1. Idle
    idle: move('idle', 'basic', [
      { pose: P.idle, durationMs: 1000 }
    ], [], { loop: true, description: 'Breathing combat stance' }),

    // 2. Slash
    slash: move('slash', 'basic', [
      { pose: P.windup, durationMs: 220 },
      { pose: P.strike, durationMs: 90 },
      { pose: P.strike, durationMs: 120 }
    ], [
      { name: 'strikeLands', timeMs: 310 }
    ], { description: 'Standard quick forward slash' }),

    // 3. Block
    block: move('block', 'defense', [
      { pose: P.block, durationMs: 150 },
      { pose: P.block, durationMs: 700 }
    ], [
      { name: 'guardUp', timeMs: 150 },
      { name: 'guardEnd', timeMs: 850 }
    ], { description: 'Defensive sword guard parry stance' }),

    // 4. Duck
    duck: move('duck', 'defense', [
      { pose: P.duck, durationMs: 150 },
      { pose: P.duck, durationMs: 700 }
    ], [
      { name: 'dodgeActive', timeMs: 150 },
      { name: 'dodgeEnd', timeMs: 850 }
    ], { description: 'Low crouch dodging high attacks' }),

    // 5. Sidestep Back & Forward
    sidestep_back: move('sidestep_back', 'defense', [
      { pose: sidestepBackPose, durationMs: 140 },
      { pose: sidestepBackPose, durationMs: 400 },
      { pose: P.idle, durationMs: 200 }
    ], [
      { name: 'dodgeActive', timeMs: 140 },
      { name: 'dodgeEnd', timeMs: 540 }
    ], { description: 'Quick backward evasive hop' }),

    sidestep_forward: move('sidestep_forward', 'defense', [
      { pose: sidestepFwdPose, durationMs: 140 },
      { pose: sidestepFwdPose, durationMs: 400 },
      { pose: P.idle, durationMs: 200 }
    ], [
      { name: 'dodgeActive', timeMs: 140 },
      { name: 'dodgeEnd', timeMs: 540 }
    ], { description: 'Quick forward evasive dash' }),

    // 6. Jump
    jump: move('jump', 'defense', [
      { pose: P.jump, durationMs: 180 },
      { pose: P.idle, durationMs: 180 }
    ], [
      { name: 'land', timeMs: 360 }
    ], { description: 'Upward leap over low sweeps' }),

    // 7. Hurt Light
    hurt_light: move('hurt_light', 'reactions', [
      { pose: P.hurt, durationMs: 100 },
      { pose: P.idle, durationMs: 250 }
    ], [], { description: 'Light hit flinch and recoil' }),

    // 8. Hurt Heavy
    hurt_heavy: move('hurt_heavy', 'reactions', [
      { pose: P.hurtHeavy, durationMs: 120 },
      { pose: P.idle, durationMs: 450 }
    ], [], { description: 'Heavy blow knockback and stumble' }),

    // 9. Block Impact
    block_impact: move('block_impact', 'reactions', [
      { pose: P.blockImpact, durationMs: 80 },
      { pose: P.block, durationMs: 200 }
    ], [], { description: 'Guard deflection recoil' }),

    // 10. Stumble
    stumble: move('stumble', 'reactions', [
      { pose: P.stumble, durationMs: 450 }
    ], [], { description: 'Off-balance stagger' }),

    // 11. Knockdown
    knockdown: move('knockdown', 'reactions', [
      { pose: P.knockdown, durationMs: 500 },
      { pose: P.knockdown, durationMs: 500 }
    ], [], { description: 'Full fall to ground' }),

    // 12. Get Up
    get_up: move('get_up', 'reactions', [
      { pose: P.duck, durationMs: 300 },
      { pose: P.idle, durationMs: 300 }
    ], [], { description: 'Stand up recovery from knockdown' }),

    // 13. Victory
    victory: move('victory', 'charge_celebration', [
      { pose: P.victoryHop, durationMs: 300 },
      { pose: victoryHop2, durationMs: 300 },
      { pose: P.victoryHop, durationMs: 300 },
      { pose: P.idle, durationMs: 300 }
    ], [], { loop: true, description: 'Victorious celebration hops' }),

    // 14. Defeat
    defeat: move('defeat', 'charge_celebration', [
      { pose: P.defeat, durationMs: 300 },
      { pose: P.defeat, durationMs: 700 }
    ], [], { description: 'Kneel in defeat with lowered sword' }),

    // 15. Hit Weak
    hit_weak: move('hit_weak', 'basic', [
      { pose: P.windup, durationMs: 120 },
      { pose: P.strike, durationMs: 70 },
      { pose: P.idle, durationMs: 100 }
    ], [
      { name: 'strikeLands', timeMs: 190 }
    ], { description: 'Quick light poke attack' }),

    // 16. Hit Strong
    hit_strong: move('hit_strong', 'basic', [
      { pose: P.windup, durationMs: 280 },
      { pose: P.strike, durationMs: 100 },
      { pose: P.strike, durationMs: 220 }
    ], [
      { name: 'strikeLands', timeMs: 380 }
    ], { description: 'Heavy windup power blow' }),

    // 17. Combo Bonus
    combo_bonus: move('combo_bonus', 'basic', [
      { pose: P.windup, durationMs: 180 },
      { pose: combo1Strike, durationMs: 120 },
      { pose: combo2Swing, durationMs: 260 },
      { pose: combo3Overhead, durationMs: 300 },
      { pose: P.strike, durationMs: 240 }
    ], [
      { name: 'hit1', timeMs: 300 },
      { name: 'hit2', timeMs: 560 },
      { name: 'hit3', timeMs: 860 }
    ], { description: '3-hit fluid attack sequence' }),

    // 18. Parry
    parry: move('parry', 'defense', [
      { pose: P.parry, durationMs: 100 },
      { pose: P.parry, durationMs: 200 }
    ], [
      { name: 'parryStart', timeMs: 0 },
      { name: 'parryEnd', timeMs: 250 }
    ], { description: 'Precision deflection window' }),

    // 19. Counter Riposte
    counter_riposte: move('counter_riposte', 'basic', [
      { pose: P.parry, durationMs: 80 },
      { pose: P.thrust, durationMs: 70 },
      { pose: P.strike, durationMs: 80 }
    ], [
      { name: 'strikeLands', timeMs: 100 }
    ], { description: 'Immediate counter thrust lunge' }),

    // 20. Attack Horizontal (Default Generator)
    attack_horizontal: buildAttackHorizontal(),

    // 21. Attack Vertical (Default Generator)
    attack_vertical: buildAttackVertical(),

    // 22. Feint (Default Generator)
    feint: buildFeint(),

    // 23. Power Slash
    power_slash: move('power_slash', 'specials', [
      { pose: P.windup, durationMs: 300 },
      { pose: P.strike, durationMs: 100 },
      { pose: P.strike, durationMs: 300 }
    ], [
      { name: 'strikeLands', timeMs: 400 }
    ], { description: 'Charged glowing arc slash' }),

    // 24. Dash Lunge
    dash_lunge: move('dash_lunge', 'specials', [
      { pose: dashPrep, durationMs: 200 },
      { pose: dashBurst, durationMs: 90 },
      { pose: dashBurst, durationMs: 150 },
      { pose: P.idle, durationMs: 350 }
    ], [
      { name: 'strikeLands', timeMs: 290 }
    ], { description: 'High-speed thrust burst with afterimages' }),

    // 25. Whirlwind
    whirlwind: move('whirlwind', 'specials', [
      { pose: P.jump, durationMs: 150 },
      { pose: whirlwindRot1, durationMs: 150 },
      { pose: whirlwindRot2, durationMs: 200 },
      { pose: whirlwindRot3, durationMs: 200 },
      { pose: P.idle, durationMs: 400 }
    ], [
      { name: 'hit1', timeMs: 300 },
      { name: 'hit2', timeMs: 500 },
      { name: 'hit3', timeMs: 700 }
    ], { description: '720-degree spinning aerial blade dance' }),

    // 26. Backflip Dodge
    backflip_dodge: move('backflip_dodge', 'specials', [
      { pose: P.duck, durationMs: 80 },
      { pose: flipMid, durationMs: 250 },
      { pose: flipEnd, durationMs: 230 },
      { pose: P.idle, durationMs: 90 }
    ], [
      { name: 'dodgeActive', timeMs: 80 },
      { name: 'dodgeEnd', timeMs: 560 },
      { name: 'land', timeMs: 650 }
    ], { description: '360-degree acrobatic backward evasive flip' }),

    // 27. Ground Smash
    ground_smash: move('ground_smash', 'specials', [
      { pose: P.duck, durationMs: 250 },
      { pose: P.smashLeap, durationMs: 300 },
      { pose: P.smashSlam, durationMs: 80 },
      { pose: P.smashSlam, durationMs: 450 }
    ], [
      { name: 'strikeLands', timeMs: 630 }
    ], { description: 'Overhead leap crushing earthquake slam' }),

    // 28. Focus Charge
    focus_charge: move('focus_charge', 'charge_celebration', [
      { pose: P.charge, durationMs: 800 },
      { pose: P.charge, durationMs: 800 }
    ], [
      { name: 'charged', timeMs: 800 }
    ], { loop: true, description: 'Power aura concentration stance' })
  };

  root.MoveCatalogue = CATALOGUE;
  root.MoveBuilders = {
    buildAttackHorizontal: buildAttackHorizontal,
    buildAttackVertical: buildAttackVertical,
    buildFeint: buildFeint
  };

  // Keep Poses.MOVES backward compatible
  if (root.Poses) {
    root.Poses.MOVES = CATALOGUE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
