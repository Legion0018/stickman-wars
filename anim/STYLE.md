# Code Fighters — Animation Visual Style Guide

This guide establishes the visual design principles, rendering standards, and motion aesthetics for the Code Fighters stick-figure animation engine.

---

## 🎨 Core Style Rules

### 1. Simple, Nothing Extra
- **Body:** Single uniform line weight (`lineWidth 4`) with round caps (`lineCap = 'round'`) and round joins (`lineJoin = 'round'`) across the torso, arms, and legs.
- **Sword:** Drawn in the fighter's accent color with `lineWidth 3` and round caps.
- **Head:** Plain outline circle (`lineWidth 4`, radius `9px`). No facial features, no eye dots.
- **No Fills or Gradients:** The body consists purely of clean geometric strokes. No drop shadows, blur filters, or linear gradients on fighters.
- **Headband:** Exactly one thin accent line across the forehead (`lineWidth 2`) for player identification.

### 2. Sharp Rendering
- **Device Pixel Ratio (DPR) Scaling:** Scale the canvas backing store by `window.devicePixelRatio`:
  ```javascript
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(logicalW * dpr);
  canvas.height = Math.floor(logicalH * dpr);
  canvas.style.width = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ```
- **Fixed Logical Dimensions:** Do not stretch the canvas with CSS `width: 100%` and `height: auto` at fractional pixel sizes. Keep the stage fixed at $640 \times 220$ logical pixels.
- **Subpixel Coordinate Rounding:** Round all drawn line coordinates and circle centers to the nearest `0.5px` (`Math.round(coord * 2) * 0.5`) to eliminate anti-aliasing blur.
- **Crisp Buffers:** Disable image smoothing (`ctx.imageSmoothingEnabled = false`) on offscreen surfaces.

### 3. Readable Silhouette
- Every key pose must be readable as a **solid black silhouette**.
- **No Torso Overlaps:** Arms and sword must extend away from the torso rather than collapsing onto it.
- **Separation:** The sword must remain visually distinct from the forearm and upper arm.
- **Wide Stances:** Keep the front and back feet clearly separated ($20\text{px}-60\text{px}$ apart) to maintain a grounded combat base.
- **Silhouette Mode:** The Animation Lab includes a dedicated "Silhouette" toggle that renders all geometry solid black against a light arena backdrop to verify silhouette readability.

### 4. Snappy Combat Timing
- **Windup (Anticipation):** Smooth `easeInOut` anticipation curve.
- **Action (Strike):** Ultra-fast `easeOut` strike (keyframes between $50\text{ms}$ and $90\text{ms}$).
- **Contact Pause:** Hit-stop of $60\text{ms}-100\text{ms}$ upon impact, holding the strike pose for 2–3 frames.
- **Recovery:** Smooth `easeOut` recovery that is visibly slower than the strike itself.
- **Formula:** $\text{Slow Anticipation} \longrightarrow \text{Snap Action} \longrightarrow \text{Micro Contact Pause} \longrightarrow \text{Deliberate Recovery}$.

### 5. Anticipation and Overshoot
- **Anticipation:** Prior to an attack, the body shifts slightly in the opposite direction (leaning back $-10^\circ$ to $-14^\circ$, pulling weapon back).
- **Overshoot:** On strikes and landing impacts, overshoot the target pose by $5\%-8\%$ and settle back over $\sim 80\text{ms}$.

### 6. Weight and Balance
- **Motion Hierarchy:** Hips lead the motion, torso lean follows, and the sword tip arrives last.
- **Foot Locking:** Grounded feet must never slide or jitter. When shifting weight, adjust hip `dx` and leg angles rather than sliding the whole figure across the floor.

### 7. Zero Jitter
- **Idle Breathing Only:** Subtle breathing applies exclusively when `currentMove === 'idle'`. Breathing fades to zero immediately during any combat move.
- **Stable Camera:** Screen shake is reserved for high-impact hits and shockwaves; no random jitter is applied during standard motion.
- **Tension Tremble:** The only allowed vibration during moves is a slight $1\text{px}$ tension tremble during the held tell pose of `enemyAttack`.

### 8. Minimal Effects
Keep the visual field clean and legible. Only the following minimal effects are permitted by default:
1. **Sword Trail:** Short 4-point trail fading in $<100\text{ms}$, active only during fast strike frames.
2. **Hit Spark:** Small starburst of 4–6 short crisp lines radiating from the contact point.
3. **Block Spark:** Small blue/cyan starburst upon weapon guard contact.
4. **Dust Puffs:** 3–5 small ground particles upon footsteps, landing, and dashes.
5. **Shockwave Ring:** Single clean expanding ground ring on the Special Slam impact.
6. **Floating Word:** One concise word per reaction (`HIT`, `BLOCKED`, `DODGED`, `PARRY`) fading over $400\text{ms}$.
7. **Shield Dome:** Clean hexagonal energy dome, shattering into crisp shards on `shieldBreak()`.
8. **Cinematic Slam Banner:** Top and bottom letterbox bars with bold center banner.
*All extraneous visual decorations (auras, afterimages, speed lines) are disabled or quarantined behind the "Extra FX" lab toggle (OFF by default).*
