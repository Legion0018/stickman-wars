// anim/effects.js - Code Fighters Minimal Visual Effects Engine
// Classic script format: attaches directly to window.CF
// Follows anim/STYLE.md Rule 8 (Minimal effects only) & Rule 7 (No jitter).
window.CF = window.CF || {};

(function () {
  'use strict';

  const MAX_SPARKS = 24;
  const MAX_DUST = 20;
  const MAX_SHARDS = 20;
  const MAX_TEXTS = 6;
  const MAX_SHOCKWAVES = 4;
  const MAX_TRAIL_POINTS = 5; // Short trail (Rule 8)

  // Starburst spark entity: draws 4 to 6 short lines radiating from center
  function StarSpark() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.color = '#EF9F27';
    this.life = 0;
    this.maxLife = 140; // ms (fast, crisp fade)
    this.rays = 5;
    this.rayLength = 8;
    this.angleOffset = 0;
  }

  // Dust particle
  function DustParticle() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 200; // ms
    this.size = 2;
    this.color = '#94A3B8';
  }

  // Shield shard entity
  function Shard() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.rot = 0;
    this.vRot = 0;
    this.size = 3;
    this.life = 0;
    this.maxLife = 300;
    this.color = '#38BDF8';
  }

  // Floating reaction word
  function FloatingWord() {
    this.active = false;
    this.text = '';
    this.x = 0;
    this.y = 0;
    this.startY = 0;
    this.life = 0;
    this.maxLife = 400; // ms (fades quickly)
    this.color = '#F59E0B';
  }

  // Shockwave ring
  function Shockwave() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.maxRadius = 70;
    this.life = 0;
    this.maxLife = 350;
    this.color = '#EF4444';
  }

  function EffectsManager() {
    // Extra FX toggle (OFF by default as required by Rule 8)
    this.extraFx = false;

    // Reduced FX toggle (OFF by default for full compatibility; enable for low-power laptops)
    this.reducedFx = false;

    // Spark starburst pool
    this.sparks = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks.push(new StarSpark());
    }
    this.sparkCursor = 0;

    // Dust pool
    this.dust = [];
    for (let i = 0; i < MAX_DUST; i++) {
      this.dust.push(new DustParticle());
    }
    this.dustCursor = 0;

    // Shield shard pool
    this.shards = [];
    for (let i = 0; i < MAX_SHARDS; i++) {
      this.shards.push(new Shard());
    }
    this.shardCursor = 0;

    // Floating text pool
    this.floatingWords = [];
    for (let i = 0; i < MAX_TEXTS; i++) {
      this.floatingWords.push(new FloatingWord());
    }
    this.wordCursor = 0;

    // Shockwave pool
    this.shockwaves = [];
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      this.shockwaves.push(new Shockwave());
    }
    this.shockwaveCursor = 0;

    // Screen Shake (Controlled impulse, decaying quickly without random jitter)
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Hit-Stop timer (ms)
    this.hitStopTimer = 0;

    // Screen flash (used only if extraFx is on)
    this.flashTimer = 0;
    this.flashDuration = 0;
    this.flashColor = 'rgba(255, 255, 255, 0.3)';

    // Cinematic Slam Banner
    this.banner = {
      active: false,
      text: '',
      subtext: '',
      elapsed: 0,
      duration: 0
    };

    // Sword trails (short, only on strikes)
    this.trails = {};
  }

  // --- Configuration ---

  EffectsManager.prototype.setReducedFx = function (enabled) {
    this.reducedFx = !!enabled;
    return this.reducedFx;
  };

  EffectsManager.prototype.isReducedFx = function () {
    return this.reducedFx;
  };

  // Check if any visual effects or timers are active (for quiescent / idle scene detection)
  EffectsManager.prototype.hasActiveEffects = function () {
    if (this.hitStopTimer > 0 || this.shakeTimer > 0 || this.flashTimer > 0 || this.banner.active) {
      return true;
    }
    for (let i = 0; i < this.sparks.length; i++) {
      if (this.sparks[i].active) return true;
    }
    for (let i = 0; i < this.dust.length; i++) {
      if (this.dust[i].active) return true;
    }
    for (let i = 0; i < this.shards.length; i++) {
      if (this.shards[i].active) return true;
    }
    for (let i = 0; i < this.floatingWords.length; i++) {
      if (this.floatingWords[i].active) return true;
    }
    for (let i = 0; i < this.shockwaves.length; i++) {
      if (this.shockwaves[i].active) return true;
    }
    for (const id in this.trails) {
      if (this.trails[id] && this.trails[id].length > 0) return true;
    }
    return false;
  };

  // --- Effect Spawners ---

  // Hit spark: small star of 4 to 6 short lines (Rule 8), or 3 short lines in reducedFx mode
  EffectsManager.prototype.addHitSpark = function (x, y, color) {
    const s = this.sparks[this.sparkCursor];
    this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
    s.active = true;
    s.x = x;
    s.y = y;
    s.color = color || '#EF9F27';
    s.life = 0;
    if (this.reducedFx) {
      s.maxLife = 90;
      s.rays = 3;
      s.rayLength = 6;
    } else {
      s.maxLife = 140;
      s.rays = 5;
      s.rayLength = 9;
    }
    s.angleOffset = Math.random() * Math.PI;
  };

  // Blue block spark (Rule 8), or 3 short lines in reducedFx mode
  EffectsManager.prototype.addBlockSpark = function (x, y) {
    const s = this.sparks[this.sparkCursor];
    this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
    s.active = true;
    s.x = x;
    s.y = y;
    s.color = '#38BDF8';
    s.life = 0;
    if (this.reducedFx) {
      s.maxLife = 80;
      s.rays = 3;
      s.rayLength = 5;
    } else {
      s.maxLife = 130;
      s.rays = 5;
      s.rayLength = 8;
    }
    s.angleOffset = Math.random() * Math.PI;
  };

  // Backwards compatibility alias
  EffectsManager.prototype.addSparks = function (x, y, count, color) {
    if (color && color.indexOf('38BDF8') !== -1) {
      this.addBlockSpark(x, y);
    } else {
      this.addHitSpark(x, y, color);
    }
  };

  // Small dust puffs on steps and landings (3-5 tiny dots; skipped entirely in reducedFx mode)
  EffectsManager.prototype.addDust = function (x, y, count) {
    if (this.reducedFx) {
      return;
    }
    count = Math.min(count || 4, 5);
    for (let i = 0; i < count; i++) {
      const p = this.dust[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % this.dust.length;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 12;
      p.y = y - 1;
      p.vx = (Math.random() - 0.5) * 1.2;
      p.vy = -0.3 - Math.random() * 0.6;
      p.life = 0;
      p.maxLife = 180 + Math.random() * 60;
      p.size = 2;
      p.color = '#94A3B8';
    }
  };

  // Shield shard explosion on shieldBreak() (capped in reducedFx mode)
  EffectsManager.prototype.addShieldShards = function (x, y, count) {
    const maxShards = this.reducedFx ? 6 : 16;
    count = Math.min(count || (this.reducedFx ? 6 : 12), maxShards);
    for (let i = 0; i < count; i++) {
      const s = this.shards[this.shardCursor];
      this.shardCursor = (this.shardCursor + 1) % this.shards.length;
      s.active = true;
      s.x = x + (Math.random() - 0.5) * 16;
      s.y = y + (Math.random() - 0.5) * 30;
      const angle = (Math.random() * Math.PI * 2);
      const speed = 1.8 + Math.random() * 3.5;
      s.vx = Math.cos(angle) * speed;
      s.vy = Math.sin(angle) * speed;
      s.rot = Math.random() * Math.PI * 2;
      s.vRot = (Math.random() - 0.5) * 0.2;
      s.size = this.reducedFx ? 2.5 : 3;
      s.life = 0;
      s.maxLife = this.reducedFx ? (160 + Math.random() * 60) : (260 + Math.random() * 100);
      s.color = '#38BDF8';
    }
  };

  // Floating word (HIT, BLOCKED, DODGED, PARRY) fading quickly (Rule 8)
  EffectsManager.prototype.addFloatingText = function (text, x, y, color) {
    const w = this.floatingWords[this.wordCursor];
    this.wordCursor = (this.wordCursor + 1) % this.floatingWords.length;
    w.active = true;
    w.text = text;
    w.x = x;
    w.y = y;
    w.startY = y;
    w.life = 0;
    w.maxLife = 400; // ms
    w.color = color || '#F59E0B';
  };

  // Special shockwave ring (Rule 8)
  EffectsManager.prototype.addShockwave = function (x, y, maxRadius, color) {
    const sw = this.shockwaves[this.shockwaveCursor];
    this.shockwaveCursor = (this.shockwaveCursor + 1) % this.shockwaves.length;
    sw.active = true;
    sw.x = x;
    sw.y = y;
    sw.radius = 4;
    sw.maxRadius = maxRadius || 65;
    sw.life = 0;
    sw.maxLife = this.reducedFx ? 180 : 320;
    sw.color = color || '#EF4444';
  };

  // Screen shake (controlled impulse without continuous jitter)
  EffectsManager.prototype.shake = function (intensity, durationMs) {
    this.shakeIntensity = Math.min(intensity || 4, 6);
    this.shakeDuration = durationMs || 140;
    this.shakeTimer = this.shakeDuration;
  };

  // Screen flash (only active when extraFx is enabled)
  EffectsManager.prototype.flash = function (color, durationMs) {
    if (!this.extraFx) return;
    this.flashColor = color || 'rgba(255, 255, 255, 0.25)';
    this.flashDuration = durationMs || 100;
    this.flashTimer = this.flashDuration;
  };

  // Hit-stop freeze frame
  EffectsManager.prototype.hitStop = function (durationMs) {
    this.hitStopTimer = durationMs || 70;
  };

  EffectsManager.prototype.isHitStopActive = function () {
    return this.hitStopTimer > 0;
  };

  // Slam banner (Rule 8)
  EffectsManager.prototype.showBanner = function (text, subtext, durationMs) {
    this.banner.active = true;
    this.banner.text = text || 'SPECIAL SLAM';
    this.banner.subtext = subtext || 'IMPACT';
    this.banner.elapsed = 0;
    this.banner.duration = durationMs || 400;
  };

  EffectsManager.prototype.isBannerActive = function () {
    return this.banner.active;
  };

  // Sword trail: short, fading, only on strikes (Rule 8; capped shorter in reducedFx mode)
  EffectsManager.prototype.recordTrailPoint = function (id, x, y, isStriking) {
    if (!this.trails[id]) {
      this.trails[id] = [];
    }
    const trail = this.trails[id];
    const maxPoints = this.reducedFx ? 3 : MAX_TRAIL_POINTS;
    if (isStriking) {
      trail.push({ x: x, y: y, alpha: 1.0 });
      if (trail.length > maxPoints) {
        trail.shift();
      }
    } else {
      if (trail.length > 0) {
        trail.shift();
      }
    }
  };

  EffectsManager.prototype.clearTrail = function (id) {
    if (this.trails[id]) {
      this.trails[id].length = 0;
    }
  };

  // --- Update Loop (dtMs) ---
  EffectsManager.prototype.update = function (dtMs) {
    // 1. Hit-stop check
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtMs;
      if (this.hitStopTimer < 0) this.hitStopTimer = 0;
      return;
    }

    // 2. Banner
    if (this.banner.active) {
      this.banner.elapsed += dtMs;
      if (this.banner.elapsed >= this.banner.duration) {
        this.banner.active = false;
      }
    }

    // 3. Screen shake (fast decay without jitter)
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dtMs;
      const progress = 1 - (this.shakeTimer / this.shakeDuration);
      const decay = 1 - progress;
      const amp = this.shakeIntensity * decay;
      // Controlled directional impulse, not random white noise
      const sign = (Math.floor(this.shakeTimer / 30) % 2 === 0) ? 1 : -1;
      this.shakeOffsetX = sign * amp * 0.8;
      this.shakeOffsetY = -sign * amp * 0.4;
      if (this.shakeTimer <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeIntensity = 0;
      }
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 4. Flash
    if (this.flashTimer > 0) {
      this.flashTimer -= dtMs;
      if (this.flashTimer < 0) this.flashTimer = 0;
    }

    // 5. Star Sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      s.life += dtMs;
      if (s.life >= s.maxLife) {
        s.active = false;
      }
    }

    // 6. Dust
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      if (!d.active) continue;
      d.life += dtMs;
      if (d.life >= d.maxLife) {
        d.active = false;
        continue;
      }
      d.x += d.vx;
      d.y += d.vy;
    }

    // 7. Shards
    for (let i = 0; i < this.shards.length; i++) {
      const s = this.shards[i];
      if (!s.active) continue;
      s.life += dtMs;
      if (s.life >= s.maxLife) {
        s.active = false;
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15; // gravity
      s.rot += s.vRot;
    }

    // 8. Floating Words
    for (let i = 0; i < this.floatingWords.length; i++) {
      const w = this.floatingWords[i];
      if (!w.active) continue;
      w.life += dtMs;
      if (w.life >= w.maxLife) {
        w.active = false;
        continue;
      }
      const p = w.life / w.maxLife;
      w.y = w.startY - p * 16;
    }

    // 9. Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.life += dtMs;
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        continue;
      }
      const p = sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * p;
    }

    // 10. Trails
    for (const id in this.trails) {
      const trail = this.trails[id];
      for (let i = 0; i < trail.length; i++) {
        trail[i].alpha *= 0.82;
      }
    }
  };

  // --- Rendering ---
  function r05(v) {
    return Math.round(v * 2) * 0.5;
  }

  EffectsManager.prototype.applyCamera = function (ctx) {
    ctx.save();
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.translate(r05(this.shakeOffsetX), r05(this.shakeOffsetY));
    }
  };

  EffectsManager.prototype.restoreCamera = function (ctx) {
    ctx.restore();
  };

  // Draw background effects (Shockwave ring on floor)
  EffectsManager.prototype.drawBackground = function (ctx) {
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      const alpha = Math.max(0, 1 - sw.life / sw.maxLife);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(r05(sw.x), r05(sw.y), r05(sw.radius), r05(sw.radius * 0.3), 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.restore();
    }
  };

  // Draw short fading sword trail (Rule 8)
  EffectsManager.prototype.drawTrails = function (ctx, defaultColor) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const id in this.trails) {
      const trail = this.trails[id];
      if (trail.length < 2) continue;

      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const alpha = Math.min(p1.alpha, p2.alpha);
        if (alpha <= 0.05) continue;

        ctx.beginPath();
        ctx.moveTo(r05(p1.x), r05(p1.y));
        ctx.lineTo(r05(p2.x), r05(p2.y));
        ctx.strokeStyle = defaultColor || '#EF9F27';
        ctx.lineWidth = 2 + (i / trail.length) * 2;
        ctx.globalAlpha = alpha * 0.6;
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Draw minimal particles: Star sparks, dust puffs, shield shards
  EffectsManager.prototype.drawParticles = function (ctx) {
    ctx.save();

    // 1. Star sparks (small star of 4-6 lines)
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      const alpha = Math.max(0, 1 - s.life / s.maxLife);
      const r = s.rayLength * (0.5 + 0.5 * (s.life / s.maxLife));

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha;
      const cx = r05(s.x);
      const cy = r05(s.y);

      for (let j = 0; j < s.rays; j++) {
        const angle = s.angleOffset + (j * Math.PI * 2) / s.rays;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(r05(cx + Math.cos(angle) * r), r05(cy + Math.sin(angle) * r));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Dust puffs
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      if (!d.active) continue;
      const alpha = Math.max(0, 1 - d.life / d.maxLife);

      ctx.save();
      ctx.fillStyle = d.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.arc(r05(d.x), r05(d.y), d.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Shield shards
    for (let i = 0; i < this.shards.length; i++) {
      const sh = this.shards[i];
      if (!sh.active) continue;
      const alpha = Math.max(0, 1 - sh.life / sh.maxLife);

      ctx.save();
      ctx.translate(r05(sh.x), r05(sh.y));
      ctx.rotate(sh.rot);
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(-sh.size, -sh.size * 0.5);
      ctx.lineTo(sh.size, 0);
      ctx.lineTo(0, sh.size);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  // Draw floating reaction word (Rule 8: one word, fades quickly)
  EffectsManager.prototype.drawFloatingTexts = function (ctx) {
    for (let i = 0; i < this.floatingWords.length; i++) {
      const w = this.floatingWords[i];
      if (!w.active) continue;
      const alpha = Math.max(0, 1 - w.life / w.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Crisp text
      ctx.fillStyle = w.color;
      ctx.fillText(w.text, r05(w.x), r05(w.y));
      ctx.restore();
    }
  };

  // Draw clean shield dome (Rule 8)
  EffectsManager.prototype.drawShieldDome = function (ctx, x, y, radius, color) {
    radius = radius || 38;
    color = color || '#38BDF8';

    ctx.save();
    ctx.translate(r05(x), r05(y));

    // Clean outer ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    // Subtle 6-facet inner lines
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Post-processing overlay: screen flash (if extraFx) and special slam banner
  EffectsManager.prototype.drawOverlay = function (ctx, width, height) {
    // 1. Flash (only if extraFx is on)
    if (this.extraFx && this.flashTimer > 0) {
      const alpha = this.flashTimer / this.flashDuration;
      ctx.save();
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 2. Cinematic Slam Banner
    if (this.banner.active) {
      const progress = this.banner.elapsed / this.banner.duration;
      let barH = 28;
      let alpha = 1;
      if (progress < 0.2) {
        const k = progress / 0.2;
        barH = 28 * k;
        alpha = k;
      } else if (progress > 0.8) {
        const k = (1 - progress) / 0.2;
        barH = 28 * k;
        alpha = k;
      }

      ctx.save();

      // Top and bottom letterbox bars
      ctx.fillStyle = '#05070B';
      ctx.fillRect(0, 0, width, barH);
      ctx.fillRect(0, height - barH, width, barH);

      // Center banner strip
      const midY = height / 2;
      ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
      ctx.fillRect(0, midY - 24, width, 48);

      // Accent border
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, midY - 24);
      ctx.lineTo(width, midY - 24);
      ctx.moveTo(0, midY + 24);
      ctx.lineTo(width, midY + 24);
      ctx.stroke();

      // Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(this.banner.text, width / 2, midY - 3);

      ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillStyle = '#EF4444';
      ctx.fillText(this.banner.subtext, width / 2, midY + 12);

      ctx.restore();
    }
  };

  EffectsManager.prototype.clear = function () {
    for (let i = 0; i < this.sparks.length; i++) this.sparks[i].active = false;
    for (let i = 0; i < this.dust.length; i++) this.dust[i].active = false;
    for (let i = 0; i < this.shards.length; i++) this.shards[i].active = false;
    for (let i = 0; i < this.floatingWords.length; i++) this.floatingWords[i].active = false;
    for (let i = 0; i < this.shockwaves.length; i++) this.shockwaves[i].active = false;
    this.sparkCursor = 0;
    this.dustCursor = 0;
    this.shardCursor = 0;
    this.wordCursor = 0;
    this.shockwaveCursor = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.flashTimer = 0;
    this.hitStopTimer = 0;
    this.banner.active = false;
    this.trails = {};
  };

  const effectsInstance = new EffectsManager();
  CF.Effects = effectsInstance;
  CF.EffectsManager = EffectsManager;
})();
