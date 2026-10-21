/**
 * ARC Stick-Fighter Animation Engine — Configuration
 * Standalone Foundation (Stage 1)
 */
(function(root) {
  'use strict';

  var CONFIG = {
    canvas: {
      width: 800,
      height: 450,
      floorY: 330,
      backgroundDark: '#12151c',
      backgroundLight: '#f4f6fa',
      floorLineDark: '#EF9F27',
      floorLineLight: '#d97706',
    },
    fighters: {
      fighterA: {
        id: 'A',
        x: 260,
        facing: 1, // 1 = right, -1 = left
        color: '#f1f5f9',
        colorLight: '#1e293b',
        swordColor: '#EF9F27',
      },
      fighterB: {
        id: 'B',
        x: 540,
        facing: -1,
        color: '#94a3b8',
        colorLight: '#475569',
        swordColor: '#38bdf8',
      },
    },
    animation: {
      maxDeltaMs: 50,
      defaultTransitionMs: 140,
      returnToIdleMs: 180,
      maxParticles: 100,
    },
    speeds: [1.0, 0.5, 0.25]
  };

  root.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
