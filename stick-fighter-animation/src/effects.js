/**
 * ARC Stick-Fighter Animation Engine — Effects Manager
 * Stage 1 Foundation: Low-allocation Canvas effects & particle pool
 */
(function(root) {
  'use strict';

  var MAX_PARTICLES = 100;

  function Particle() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.color = '#ffffff';
    this.type = 'spark'; // 'spark' | 'dust' | 'afterimage'
    this.alpha = 1;
    this.decay = 0.96;
  }

  function EffectsManager() {
    this.particles = [];
    for (var i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(new Particle());
    }

    // Screen Shake
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Flash
    this.flashTimer = 0;
    this.flashDuration = 0;
    this.flashColor = 'rgba(255, 255, 255, 0.4)';

    // Floating text items (max 6)
    this.floatingTexts = [];

    // Slash arcs
    this.slashArcs = [];

    // Shockwaves (expanding rings)
    this.shockwaves = [];

    // Speed lines & Afterimages
    this.speedLines = [];
    this.afterimages = [];

    // Motion preference detection
    this.reducedMotion = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      var m = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = !!(m && m.matches);
      if (m && m.addEventListener) {
        var self = this;
        m.addEventListener('change', function(e) {
          self.reducedMotion = e.matches;
        });
      }
    }
  }

  EffectsManager.prototype.getFreeParticle = function() {
    for (var i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        return this.particles[i];
      }
    }
    // Pool full: steal oldest particle (index 0)
    return this.particles[0];
  };

  /**
   * Spawn sparks at (x, y)
   */
  EffectsManager.prototype.spawnSparks = function(x, y, count, color) {
    if (this.reducedMotion) count = Math.min(count, 3);
    color = color || '#EF9F27';

    for (var i = 0; i < count; i++) {
      var p = this.getFreeParticle();
      p.active = true;
      p.x = x;
      p.y = y;
      var angle = Math.random() * Math.PI * 2;
      var speed = 1.5 + Math.random() * 4.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = 200 + Math.random() * 250;
      p.life = p.maxLife;
      p.size = 2 + Math.random() * 2.5;
      p.color = color;
      p.type = 'spark';
      p.alpha = 1;
      p.decay = 0.95;
    }
  };

  /**
   * Spawn dust near floor at (x, y)
   */
  EffectsManager.prototype.spawnDust = function(x, y, facing, count) {
    if (this.reducedMotion) return;
    count = count || 4;

    for (var i = 0; i < count; i++) {
      var p = this.getFreeParticle();
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 16;
      p.y = y - Math.random() * 4;
      p.vx = -facing * (0.8 + Math.random() * 2.2);
      p.vy = -(0.4 + Math.random() * 1.2);
      p.maxLife = 250 + Math.random() * 200;
      p.life = p.maxLife;
      p.size = 3 + Math.random() * 3;
      p.color = 'rgba(148, 163, 184, 0.4)';
      p.type = 'dust';
      p.alpha = 0.5;
      p.decay = 0.92;
    }
  };

  /**
   * Trigger screen shake
   */
  EffectsManager.prototype.screenShake = function(durationMs, intensity) {
    if (this.reducedMotion) return;
    this.shakeDuration = durationMs || 150;
    this.shakeTimer = this.shakeDuration;
    this.shakeIntensity = intensity || 5;
  };

  /**
   * Trigger screen flash
   */
  EffectsManager.prototype.flash = function(durationMs, color) {
    this.flashDuration = durationMs || 100;
    this.flashTimer = this.flashDuration;
    this.flashColor = color || 'rgba(255, 255, 255, 0.35)';
  };

  /**
   * Add floating text above target
   */
  EffectsManager.prototype.addFloatingText = function(text, x, y, color) {
    if (this.floatingTexts.length >= 6) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color || '#f1f5f9',
      life: 900,
      maxLife: 900,
      vy: -0.05
    });
  };

  /**
   * Add slash arc curve
   */
  EffectsManager.prototype.addSlashArc = function(cx, cy, radius, startAngle, endAngle, color) {
    if (this.slashArcs.length >= 4) {
      this.slashArcs.shift();
    }
    this.slashArcs.push({
      cx: cx,
      cy: cy,
      radius: radius || 50,
      startAngle: startAngle,
      endAngle: endAngle,
      color: color || '#EF9F27',
      life: 140,
      maxLife: 140
    });
  };

  /**
   * Add shockwave ring at (x, y)
   */
  EffectsManager.prototype.spawnShockwave = function(x, y, maxRadius, color) {
    if (this.reducedMotion) return;
    if (this.shockwaves.length >= 4) this.shockwaves.shift();
    this.shockwaves.push({
      x: x, y: y,
      radius: 5,
      maxRadius: maxRadius || 70,
      life: 250,
      maxLife: 250,
      color: color || '#EF9F27'
    });
  };

  /**
   * Record afterimage of fighter
   */
  EffectsManager.prototype.spawnAfterimage = function(x, y, facing, pose, color) {
    if (this.reducedMotion) return;
    if (this.afterimages.length >= 6) this.afterimages.shift();
    this.afterimages.push({
      x: x, y: y, facing: facing,
      pose: root.Poses ? root.Poses.clonePose(pose) : pose,
      color: color || 'rgba(56, 189, 248, 0.4)',
      life: 180,
      maxLife: 180
    });
  };

  /**
   * Spawn horizontal speed lines
   */
  EffectsManager.prototype.spawnSpeedLines = function(x, y, facing, count) {
    if (this.reducedMotion) return;
    count = count || 4;
    for (var i = 0; i < count; i++) {
      if (this.speedLines.length >= 8) this.speedLines.shift();
      this.speedLines.push({
        x1: x - (facing * (20 + Math.random() * 40)),
        y1: y - 80 + Math.random() * 70,
        x2: x + (facing * (40 + Math.random() * 60)),
        life: 120,
        maxLife: 120
      });
    }
  };

  EffectsManager.prototype.update = function(dt) {
    // 1. Screen Shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      var ratio = Math.max(0, this.shakeTimer / Math.max(1, this.shakeDuration));
      var currentIntensity = this.shakeIntensity * ratio;
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 2. Flash
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    // 3. Particles
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    // 4. Floating text
    for (var j = this.floatingTexts.length - 1; j >= 0; j--) {
      var ft = this.floatingTexts[j];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(j, 1);
      }
    }

    // 5. Slash Arcs
    for (var k = this.slashArcs.length - 1; k >= 0; k--) {
      var arc = this.slashArcs[k];
      arc.life -= dt;
      if (arc.life <= 0) {
        this.slashArcs.splice(k, 1);
      }
    }

    // 6. Shockwaves
    for (var s = this.shockwaves.length - 1; s >= 0; s--) {
      var sw = this.shockwaves[s];
      sw.life -= dt;
      var prog = 1 - Math.max(0, sw.life / sw.maxLife);
      sw.radius = 5 + sw.maxRadius * prog;
      if (sw.life <= 0) {
        this.shockwaves.splice(s, 1);
      }
    }

    // 7. Afterimages
    for (var ai = this.afterimages.length - 1; ai >= 0; ai--) {
      this.afterimages[ai].life -= dt;
      if (this.afterimages[ai].life <= 0) {
        this.afterimages.splice(ai, 1);
      }
    }

    // 8. Speed lines
    for (var sl = this.speedLines.length - 1; sl >= 0; sl--) {
      this.speedLines[sl].life -= dt;
      if (this.speedLines[sl].life <= 0) {
        this.speedLines.splice(sl, 1);
      }
    }
  };

  /**
   * Apply screen shake translation to canvas context
   */
  EffectsManager.prototype.applyCameraShake = function(ctx) {
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }
  };

  /**
   * Draw all active effects
   */
  EffectsManager.prototype.draw = function(ctx, canvasWidth, canvasHeight) {
    // 1. Draw Slash Arcs
    for (var a = 0; a < this.slashArcs.length; a++) {
      var arc = this.slashArcs[a];
      var progress = 1 - (arc.life / arc.maxLife);
      ctx.save();
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 4 * (1 - progress);
      ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife);
      ctx.beginPath();
      ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle);
      ctx.stroke();
      ctx.restore();
    }

    // 1b. Draw Shockwaves
    for (var swi = 0; swi < this.shockwaves.length; swi++) {
      var swv = this.shockwaves[swi];
      ctx.save();
      ctx.strokeStyle = swv.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = Math.max(0, swv.life / swv.maxLife);
      ctx.beginPath();
      ctx.ellipse(swv.x, swv.y, swv.radius, swv.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 1c. Draw Speed Lines
    for (var sli = 0; sli < this.speedLines.length; sli++) {
      var slv = this.speedLines[sli];
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = Math.max(0, slv.life / slv.maxLife);
      ctx.beginPath();
      ctx.moveTo(slv.x1, slv.y1);
      ctx.lineTo(slv.x2, slv.y1);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Particles
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'dust') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spark
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Draw Floating Text
    for (var j = 0; j < this.floatingTexts.length; j++) {
      var ft = this.floatingTexts[j];
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 4. Draw Flash overlay
    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.flashTimer / Math.max(1, this.flashDuration));
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
  };

  root.EffectsManager = EffectsManager;
})(typeof window !== 'undefined' ? window : globalThis);
