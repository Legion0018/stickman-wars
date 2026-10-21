/**
 * ARC Stick-Fighter Animation Engine — Poses & Geometry
 * Stage 2 Complete Move Library Poses
 */
(function(root) {
  'use strict';

  var JOINT_KEYS = [
    'head', 'neck', 'hip',
    'kneeL', 'footL', 'kneeR', 'footR',
    'elbowL', 'handL', 'elbowR', 'handR',
    'swordTip'
  ];

  function createPose(joints, dx, dy, rot) {
    return {
      head: joints.head.slice(),
      neck: joints.neck.slice(),
      hip: joints.hip.slice(),
      kneeL: joints.kneeL.slice(),
      footL: joints.footL.slice(),
      kneeR: joints.kneeR.slice(),
      footR: joints.footR.slice(),
      elbowL: joints.elbowL.slice(),
      handL: joints.handL.slice(),
      elbowR: joints.elbowR.slice(),
      handR: joints.handR.slice(),
      swordTip: joints.swordTip.slice(),
      dx: dx !== undefined ? dx : 0,
      dy: dy !== undefined ? dy : 0,
      rot: rot !== undefined ? rot : 0
    };
  }

  // --- Foundational & Core Combat Poses ---
  var idle = createPose({
    head: [2, -84], neck: [0, -70], hip: [-2, -40],
    kneeL: [10, -20], footL: [16, 0],
    kneeR: [-10, -18], footR: [-16, 0],
    elbowL: [10, -56], handL: [18, -50],
    elbowR: [-8, -54], handR: [6, -48],
    swordTip: [36, -66]
  }, 0, 0, 0);

  var windup = createPose({
    head: [-8, -84], neck: [-10, -70], hip: [-8, -38],
    kneeL: [6, -18], footL: [12, 0],
    kneeR: [-16, -18], footR: [-22, 0],
    elbowL: [-18, -72], handL: [-24, -84],
    elbowR: [-10, -66], handR: [-18, -80],
    swordTip: [-42, -98]
  }, -4, 0, -3);

  var strike = createPose({
    head: [18, -76], neck: [14, -64], hip: [6, -36],
    kneeL: [26, -18], footL: [32, 0],
    kneeR: [-8, -16], footR: [-18, 0],
    elbowL: [32, -54], handL: [48, -48],
    elbowR: [18, -48], handR: [42, -46],
    swordTip: [80, -44]
  }, 16, 0, 4);

  var block = createPose({
    head: [-4, -80], neck: [-4, -66], hip: [-6, -38],
    kneeL: [8, -18], footL: [12, 0],
    kneeR: [-12, -18], footR: [-18, 0],
    elbowL: [10, -60], handL: [16, -68],
    elbowR: [2, -56], handR: [12, -66],
    swordTip: [14, -104]
  }, -2, 0, -2);

  var duck = createPose({
    head: [10, -44], neck: [6, -34], hip: [-6, -20],
    kneeL: [16, -10], footL: [20, 0],
    kneeR: [-14, -10], footR: [-18, 0],
    elbowL: [12, -26], handL: [20, -22],
    elbowR: [0, -24], handR: [14, -20],
    swordTip: [36, -22]
  }, 4, 16, 6);

  var hurt = createPose({
    head: [-24, -82], neck: [-18, -68], hip: [-12, -36],
    kneeL: [0, -18], footL: [6, 0],
    kneeR: [-20, -16], footR: [-24, 0],
    elbowL: [-26, -58], handL: [-34, -50],
    elbowR: [-18, -54], handR: [-28, -46],
    swordTip: [-46, -26]
  }, -12, -4, -14);

  // --- Extended Poses for 27 Moves ---
  var jumpPose = createPose({
    head: [0, -82], neck: [0, -68], hip: [0, -42],
    kneeL: [12, -32], footL: [14, -18],
    kneeR: [-12, -32], footR: [-14, -18],
    elbowL: [14, -54], handL: [22, -48],
    elbowR: [-14, -54], handR: [-20, -48],
    swordTip: [36, -72]
  }, 0, -50, 0);

  var hurtHeavyPose = createPose({
    head: [-32, -78], neck: [-26, -64], hip: [-18, -32],
    kneeL: [-4, -16], footL: [2, 0],
    kneeR: [-26, -14], footR: [-30, 0],
    elbowL: [-34, -52], handL: [-42, -42],
    elbowR: [-24, -48], handR: [-34, -38],
    swordTip: [-58, -18]
  }, -35, -4, -15);

  var blockImpactPose = createPose({
    head: [-8, -78], neck: [-8, -64], hip: [-8, -36],
    kneeL: [4, -18], footL: [8, 0],
    kneeR: [-16, -18], footR: [-22, 0],
    elbowL: [6, -58], handL: [10, -64],
    elbowR: [-2, -54], handR: [6, -62],
    swordTip: [8, -98]
  }, -10, 0, -5);

  var stumblePose = createPose({
    head: [-18, -76], neck: [-14, -62], hip: [-8, -34],
    kneeL: [12, -16], footL: [18, 0],
    kneeR: [-18, -16], footR: [-24, 0],
    elbowL: [-16, -48], handL: [-22, -38],
    elbowR: [14, -52], handR: [24, -44],
    swordTip: [34, -30]
  }, -15, 0, -10);

  var knockdownPose = createPose({
    head: [-74, -8], neck: [-60, -8], hip: [-32, -6],
    kneeL: [-14, -8], footL: [4, 0],
    kneeR: [-20, -8], footR: [-2, 0],
    elbowL: [-50, -14], handL: [-42, -4],
    elbowR: [-54, -14], handR: [-46, -4],
    swordTip: [-18, 0]
  }, -20, 44, -85);

  var defeatPose = createPose({
    head: [4, -42], neck: [2, -34], hip: [-4, -20],
    kneeL: [12, -10], footL: [16, 0],
    kneeR: [-8, -8], footR: [-14, 0],
    elbowL: [6, -28], handL: [12, -22],
    elbowR: [-4, -26], handR: [4, -20],
    swordTip: [20, -2]
  }, 0, 0, 0);

  var victoryHop1 = createPose({
    head: [2, -92], neck: [0, -78], hip: [-2, -48],
    kneeL: [8, -26], footL: [12, -12],
    kneeR: [-8, -26], footR: [-12, -12],
    elbowL: [12, -88], handL: [16, -104],
    elbowR: [-10, -64], handR: [-18, -56],
    swordTip: [24, -140]
  }, 0, -16, 0);

  var thrustPose = createPose({
    head: [24, -74], neck: [18, -62], hip: [6, -34],
    kneeL: [30, -18], footL: [36, 0],
    kneeR: [-10, -16], footR: [-20, 0],
    elbowL: [40, -56], handL: [60, -54],
    elbowR: [22, -50], handR: [46, -50],
    swordTip: [102, -54]
  }, 30, 0, 2);

  var horizontalTellPose = createPose({
    head: [-4, -80], neck: [-6, -66], hip: [-6, -36],
    kneeL: [8, -18], footL: [14, 0],
    kneeR: [-14, -18], footR: [-20, 0],
    elbowL: [-16, -54], handL: [-26, -52],
    elbowR: [-6, -50], handR: [-16, -48],
    swordTip: [-62, -52]
  }, -6, 0, -4);

  var overheadTellPose = createPose({
    head: [2, -84], neck: [0, -70], hip: [-2, -38],
    kneeL: [8, -18], footL: [14, 0],
    kneeR: [-12, -18], footR: [-18, 0],
    elbowL: [4, -86], handL: [6, -104],
    elbowR: [-4, -84], handR: [-2, -102],
    swordTip: [10, -144]
  }, 0, 0, 0);

  var feintRelaxPose = createPose({
    head: [0, -80], neck: [0, -66], hip: [-2, -38],
    kneeL: [8, -18], footL: [14, 0],
    kneeR: [-10, -18], footR: [-16, 0],
    elbowL: [12, -48], handL: [18, -36],
    elbowR: [-12, -48], handR: [-18, -36],
    swordTip: [22, -14]
  }, 0, 0, 0);

  var parryPose = createPose({
    head: [0, -82], neck: [0, -68], hip: [-4, -38],
    kneeL: [10, -18], footL: [14, 0],
    kneeR: [-10, -18], footR: [-16, 0],
    elbowL: [14, -64], handL: [22, -72],
    elbowR: [4, -58], handR: [14, -68],
    swordTip: [-12, -112]
  }, 0, 0, 0);

  var chargePose = createPose({
    head: [4, -76], neck: [2, -62], hip: [-2, -32],
    kneeL: [14, -14], footL: [20, 0],
    kneeR: [-12, -14], footR: [-18, 0],
    elbowL: [8, -44], handL: [12, -30],
    elbowR: [-4, -42], handR: [6, -28],
    swordTip: [14, -4]
  }, 0, 8, 2);

  var smashLeapPose = createPose({
    head: [4, -86], neck: [2, -72], hip: [0, -42],
    kneeL: [14, -28], footL: [16, -14],
    kneeR: [-12, -28], footR: [-14, -14],
    elbowL: [6, -92], handL: [8, -112],
    elbowR: [-4, -90], handR: [-2, -110],
    swordTip: [12, -154]
  }, 8, -55, 6);

  var smashSlamPose = createPose({
    head: [20, -52], neck: [16, -42], hip: [4, -24],
    kneeL: [22, -12], footL: [26, 0],
    kneeR: [-12, -10], footR: [-18, 0],
    elbowL: [26, -34], handL: [32, -16],
    elbowR: [14, -30], handR: [26, -14],
    swordTip: [36, 0]
  }, 24, 0, 18);

  var POSES = {
    idle: idle,
    windup: windup,
    strike: strike,
    block: block,
    duck: duck,
    hurt: hurt,
    jump: jumpPose,
    hurtHeavy: hurtHeavyPose,
    blockImpact: blockImpactPose,
    stumble: stumblePose,
    knockdown: knockdownPose,
    defeat: defeatPose,
    victoryHop: victoryHop1,
    thrust: thrustPose,
    horizontalTell: horizontalTellPose,
    overheadTell: overheadTellPose,
    feintRelax: feintRelaxPose,
    parry: parryPose,
    charge: chargePose,
    smashLeap: smashLeapPose,
    smashSlam: smashSlamPose
  };

  function clonePose(src) {
    return createPose(src, src.dx, src.dy, src.rot);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function easeOutQuad(t) {
    return t * (2 - t);
  }

  function normalizeAngleDeg(deg) {
    deg = deg % 360;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    return deg;
  }

  function interpolatePose(from, to, t, out) {
    var eased = easeInOutQuad(Math.max(0, Math.min(1, t)));
    for (var i = 0; i < JOINT_KEYS.length; i++) {
      var k = JOINT_KEYS[i];
      out[k][0] = lerp(from[k][0], to[k][0], eased);
      out[k][1] = lerp(from[k][1], to[k][1], eased);
    }
    out.dx = lerp(from.dx || 0, to.dx || 0, eased);
    out.dy = lerp(from.dy || 0, to.dy || 0, eased);
    out.rot = lerp(from.rot || 0, to.rot || 0, eased);
    return out;
  }

  root.Poses = {
    JOINT_KEYS: JOINT_KEYS,
    POSES: POSES,
    createPose: createPose,
    clonePose: clonePose,
    lerp: lerp,
    easeInOutQuad: easeInOutQuad,
    easeOutQuad: easeOutQuad,
    normalizeAngleDeg: normalizeAngleDeg,
    interpolatePose: interpolatePose
  };
})(typeof window !== 'undefined' ? window : globalThis);
