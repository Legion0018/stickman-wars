// anim/effects.js - Code Fighters Visual Effects Engine
// Classic script format: attaches directly to window.CF
window.CF = window.CF || {};

(function () {
  'use strict';

  const MAX_PARTICLES = 120;
  const MAX_FLOATING_TEXTS = 8;
  const MAX_SHOCKWAVES = 6;
  const MAX_TRAIL_POINTS = 16;

  // Pre-allocated particle entity
  function Particle() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.color = '#FFFFFF';
    this.alpha = 1;
    this.decay = 0.96;
    this.type = 'spark'; // 'spark' | 'dust' | 'shard'
    this.rotation = 0;
    this.vRot = 0;
  }

  // Pre-allocated floating text entity
  function FloatingText() {
    this.active = false;
    this.text = '';
    this.x = 0;
    this.y = 0;
    this.vy = -0.8;
    this.life = 0;
    this.maxLife = 600; // ms
    this.color = '#F59E0B';
    this.fontSize = 14;
    this.alpha = 1;
  }

  // Pre-allocated expanding shockwave ring
  function Shockwave() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.maxRadius = 70;
    this.life = 0;
    this.maxLife = 400; // ms
    this.color = '#F59E0B';
    this.lineWidth = 3;
    this.alpha = 1;
  }

  function EffectsManager() {
    // Particle pool
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(new Particle());
    }
    this.particleCursor = 0;

    // Floating text pool
    this.floatingTexts = [];
    for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
      this.floatingTexts.push(new FloatingText());
    }
    this.textCursor = 0;

    // Shockwave pool
    this.shockwaves = [];
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      this.shockwaves.push(new Shockwave());
    }
    this.shockwaveCursor = 0;

    // Screen Shake
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Hit Stop (brief freeze frame on impact)
    this.hitStopTimer = 0;

    // Screen Flash
    this.flashTimer = 0;
    this.flashDuration = 0;
    this.flashColor = 'rgba(255, 255, 255, 0.4)';

    // Special Slam Cinematic Banner
    this.banner = {
      active: false,
      text: '',
      subtext: '',
      elapsed: 0,
      duration: 0
    };

    // Sword trails storage: maps fighter ID or instance to array of points
    this.trails = {};
  }

  EffectsManager.prototype.getFreeParticle = function () {
    for (let i = 0; i < this.particles.length; i++) {
      const idx = (this.particleCursor + i) % this.particles.length;
      if (!this.particles[idx].active) {
        this.particleCursor = (idx + 1) % this.particles.length;
        return this.particles[idx];
      }
    }
    // Recycle oldest
    const victim = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % this.particles.length;
    return victim;
  };

  // --- Public Effect Spawners ---

  // Spark burst (e.g. sword clash, weapon hit)
  EffectsManager.prototype.addSparks = function (x, y, count, color) {
    count = count || 12;
    color = color || '#EF9F27';
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      p.active = true;
      p.type = 'spark';
      p.x = x;
      p.y = y;
      const angle = (Math.random() * Math.PI * 2);
      const speed = 1.5 + Math.random() * 4.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 0.5;
      p.gravity = 0.12;
      p.life = 0;
      p.maxLife = 200 + Math.random() * 250;
      p.size = 1.5 + Math.random() * 2;
      p.color = color;
      p.alpha = 1;
      p.decay = 0.94;
    }
  };

  // Dust puff (e.g. landing, jumping, dash)
  EffectsManager.prototype.addDust = function (x, y, count, color) {
    count = count || 6;
    color = color || 'rgba(160, 174, 192, 0.6)';
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      p.active = true;
      p.type = 'dust';
      p.x = x + (Math.random() - 0.5) * 14;
      p.y = y + (Math.random() - 0.5) * 4;
      p.vx = (Math.random() - 0.5) * 1.8;
      p.vy = -0.3 - Math.random() * 1.0;
      p.gravity = -0.01; // drifts slightly up
      p.life = 0;
      p.maxLife = 250 + Math.random() * 200;
      p.size = 2.5 + Math.random() * 3.5;
      p.color = color;
      p.alpha = 0.7;
      p.decay = 0.95;
    }
  };

  // Shield shard explosion on shieldBreak()
  EffectsManager.prototype.addShieldShards = function (x, y, count, color) {
    count = count || 18;
    color = color || '#38BDF8';
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      p.active = true;
      p.type = 'shard';
      p.x = x + (Math.random() - 0.5) * 20;
      p.y = y + (Math.random() - 0.5) * 40;
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2.0 + Math.random() * 5.0;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = 0.15;
      p.life = 0;
      p.maxLife = 400 + Math.random() * 300;
      p.size = 3.0 + Math.random() * 3.0;
      p.color = color;
      p.alpha = 1;
      p.decay = 0.97;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 0.3;
    }
  };

  // Floating combat text ("HIT", "BLOCKED", "PARRIED", "DODGED", "FEINT!")
  EffectsManager.prototype.addFloatingText = function (text, x, y, color) {
    const item = this.floatingTexts[this.textCursor];
    this.textCursor = (this.textCursor + 1) % this.floatingTexts.length;
    item.active = true;
    item.text = text;
    item.x = x;
    item.y = y;
    item.vy = -0.9;
    item.life = 0;
    item.maxLife = 700; // ms
    item.color = color || '#F59E0B';
    item.fontSize = 13;
    item.alpha = 1;
  };

  // Expanding ground shockwave (e.g. Special Slam)
  EffectsManager.prototype.addShockwave = function (x, y, maxRadius, color) {
    const sw = this.shockwaves[this.shockwaveCursor];
    this.shockwaveCursor = (this.shockwaveCursor + 1) % this.shockwaves.length;
    sw.active = true;
    sw.x = x;
    sw.y = y;
    sw.radius = 4;
    sw.maxRadius = maxRadius || 75;
    sw.life = 0;
    sw.maxLife = 380;
    sw.color = color || '#EF4444';
    sw.lineWidth = 3.5;
    sw.alpha = 1;
  };

  // Screen shake
  EffectsManager.prototype.shake = function (intensity, durationMs) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity || 5);
    this.shakeDuration = Math.max(this.shakeDuration, durationMs || 200);
    this.shakeTimer = this.shakeDuration;
  };

  // Screen flash
  EffectsManager.prototype.flash = function (color, durationMs) {
    this.flashColor = color || 'rgba(255, 255, 255, 0.4)';
    this.flashDuration = durationMs || 100;
    this.flashTimer = this.flashDuration;
  };

  // Hit stop freeze frame
  EffectsManager.prototype.hitStop = function (durationMs) {
    this.hitStopTimer = durationMs || 60;
  };

  EffectsManager.prototype.isHitStopActive = function () {
    return this.hitStopTimer > 0;
  };

  // Special slam dramatic banner across the screen
  EffectsManager.prototype.showBanner = function (text, subtext, durationMs) {
    this.banner.active = true;
    this.banner.text = text || 'SPECIAL SLAM';
    this.banner.subtext = subtext || 'MAXIMUM IMPACT';
    this.banner.elapsed = 0;
    this.banner.duration = durationMs || 420;
  };

  EffectsManager.prototype.isBannerActive = function () {
    return this.banner.active;
  };

  // Sword Trail management
  EffectsManager.prototype.recordTrailPoint = function (id, x, y, active) {
    if (!this.trails[id]) {
      this.trails[id] = [];
    }
    const trail = this.trails[id];
    if (active) {
      trail.push({ x: x, y: y, alpha: 1 });
      if (trail.length > MAX_TRAIL_POINTS) {
        trail.shift();
      }
    } else {
      // Fade out remaining
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
    // 1. Hit stop timer
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtMs;
      if (this.hitStopTimer < 0) this.hitStopTimer = 0;
      // When hitstop is active, do not advance particles
      return;
    }

    // 2. Banner update
    if (this.banner.active) {
      this.banner.elapsed += dtMs;
      if (this.banner.elapsed >= this.banner.duration) {
        this.banner.active = false;
      }
    }

    // 3. Screen shake calculation
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dtMs;
      const progress = 1 - (this.shakeTimer / this.shakeDuration);
      const decay = 1 - progress;
      const currentAmp = this.shakeIntensity * decay;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentAmp;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentAmp;
      if (this.shakeTimer <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeIntensity = 0;
      }
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 4. Flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dtMs;
      if (this.flashTimer < 0) this.flashTimer = 0;
    }

    // 5. Update Particles
    const dtSec = dtMs / 1000;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dtMs;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.rotation += p.vRot;

      const progress = p.life / p.maxLife;
      p.alpha = Math.max(0, 1 - progress);
    }

    // 6. Update Floating Text
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const item = this.floatingTexts[i];
      if (!item.active) continue;

      item.life += dtMs;
      if (item.life >= item.maxLife) {
        item.active = false;
        continue;
      }

      item.y += item.vy;
      const progress = item.life / item.maxLife;
      item.alpha = Math.max(0, 1 - (progress * progress)); // fade near end
    }

    // 7. Update Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;

      sw.life += dtMs;
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        continue;
      }

      const progress = sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * progress;
      sw.alpha = Math.max(0, 1 - progress);
    }

    // 8. Decay trails
    for (const id in this.trails) {
      const trail = this.trails[id];
      for (let i = 0; i < trail.length; i++) {
        trail[i].alpha *= 0.88;
      }
    }
  };

  // --- Drawing System ---

  // Apply screen shake to context before rendering world
  EffectsManager.prototype.applyCamera = function (ctx) {
    ctx.save();
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }
  };

  // Restore camera after rendering world
  EffectsManager.prototype.restoreCamera = function (ctx) {
    ctx.restore();
  };

  // Draw background effects (shockwaves, floor dust)
  EffectsManager.prototype.drawBackground = function (ctx) {
    // Shockwaves on the ground
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active || sw.alpha <= 0) continue;

      ctx.save();
      ctx.beginPath();
      // Draw as flat oval on floor
      ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth * (1 - sw.life / sw.maxLife);
      ctx.globalAlpha = sw.alpha * 0.85;
      ctx.stroke();
      ctx.restore();
    }
  };

  // Draw sword trails
  EffectsManager.prototype.drawTrails = function (ctx, color) {
    color = color || '#EF9F27';
    for (const id in this.trails) {
      const trail = this.trails[id];
      if (trail.length < 2) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const alpha = Math.min(p1.alpha, p2.alpha);
        if (alpha <= 0.02) continue;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 + (i / trail.length) * 4;
        ctx.globalAlpha = alpha * 0.7;
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  // Draw particles (sparks, dust, shards)
  EffectsManager.prototype.drawParticles = function (ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active || p.alpha <= 0.02) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shard') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.5);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(-p.size * 0.3, p.size);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  };

  // Draw floating combat text
  EffectsManager.prototype.drawFloatingTexts = function (ctx) {
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const item = this.floatingTexts[i];
      if (!item.active || item.alpha <= 0.02) continue;

      ctx.save();
      ctx.globalAlpha = item.alpha;
      ctx.font = 'bold ' + item.fontSize + 'px monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.strokeText(item.text, item.x, item.y);

      // Text
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
      ctx.restore();
    }
  };

  // Draw glowing shield dome around fighter
  EffectsManager.prototype.drawShieldDome = function (ctx, x, y, radius, color, breath) {
    radius = radius || 38;
    color = color || '#38BDF8';
    breath = breath || 0;

    const pulse = 1 + Math.sin(breath * 4) * 0.05;
    const r = radius * pulse;

    ctx.save();
    ctx.translate(x, y);

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.7 + Math.sin(breath * 4) * 0.2;
    ctx.stroke();

    // Translucent fill
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.12 + Math.sin(breath * 4) * 0.04;
    ctx.fill();

    // Small hexagonal energy facets
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const ex = Math.cos(a) * r;
      const ey = Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw full-canvas post-processing: screen flash and special slam cinematic banner
  EffectsManager.prototype.drawOverlay = function (ctx, width, height) {
    // 1. Flash
    if (this.flashTimer > 0) {
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
      // Animate letterbox height (0 to 32px)
      let barH = 32;
      let alpha = 1;
      if (progress < 0.2) {
        const k = progress / 0.2;
        barH = 32 * k;
        alpha = k;
      } else if (progress > 0.8) {
        const k = (1 - progress) / 0.2;
        barH = 32 * k;
        alpha = k;
      }

      ctx.save();

      // Top and bottom letterbox bars
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, width, barH);
      ctx.fillRect(0, height - barH, width, barH);

      // Center banner strip
      const midY = height / 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, midY - 26, width, 52);

      // Gold accent lines
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, midY - 26);
      ctx.lineTo(width, midY - 26);
      ctx.moveTo(0, midY + 26);
      ctx.lineTo(width, midY + 26);
      ctx.stroke();

      // Banner text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px monospace, sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(this.banner.text, width / 2, midY - 4);

      // Subtext
      ctx.font = '11px monospace, sans-serif';
      ctx.fillStyle = '#EF4444';
      ctx.fillText(this.banner.subtext, width / 2, midY + 14);

      ctx.restore();
    }
  };

  // Clear everything
  EffectsManager.prototype.clear = function () {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
    }
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].active = false;
    }
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].active = false;
    }
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.flashTimer = 0;
    this.hitStopTimer = 0;
    this.banner.active = false;
    this.trails = {};
  };

  // Singleton instance available on CF.Effects
  const effectsInstance = new EffectsManager();
  CF.Effects = effectsInstance;
  CF.EffectsManager = EffectsManager;
})();
