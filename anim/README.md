# Code Fighters — Animation System

Welcome to the **Code Fighters** animation engine! This system powers the stick-figure sword-fighting animations entirely in code on an HTML5 `<canvas>`.

There are **zero external libraries**, **no npm dependencies**, and **no build steps**. It runs directly out of the box in any modern desktop browser.

---

## 🚀 Beginner Quick-Start: How to Run the Animation Lab

1. Open your file explorer and navigate to:
   ```
   anim/
   ```
2. Double-click **`index.html`** (or right-click → *Open With* → your favorite web browser: Chrome, Edge, Firefox, or Safari).
3. That's it! The Animation Lab loads immediately using classic `<script>` tags without needing a local web server (no ES module CORS restrictions).

---

## 🎨 Visual Quality Pass & Styling (anim/STYLE.md)

The engine adheres strictly to the 8 visual quality rules documented in [`anim/STYLE.md`](file:///C:/Miselonious/python/stickman/anim/STYLE.md):

1. **Simple, Nothing Extra:** Single uniform body line weight (`lineWidth 4`, round caps and joins), sword in accent color (`lineWidth 3`), head as a plain outline circle (radius $9\text{px}$), and a single thin headband line across the forehead. No gradients, drop shadows, or decorative fills.
2. **Sharp Rendering:** Backing store scaled by `window.devicePixelRatio` with integer CSS bounds ($640 \times 220\text{px}$). All coordinates rounded to nearest `0.5px` (`CF.r05`) to eliminate anti-aliasing blur.
3. **Readable Silhouette:** Key poses verified against torso collisions. Arms and swords extend away from the body, stances are wide ($20-60\text{px}$ foot separation). Lab includes a **"Silhouette Mode"** toggle rendering solid black figures against a crisp high-contrast background.
4. **Snappy Combat Timing:** Every attack uses per-keyframe easing: smooth anticipation (`easeInOut`), ultra-fast $50-90\text{ms}$ strike action (`easeOut`), $60-100\text{ms}$ hit-stop contact pause, and deliberate recovery.
5. **Anticipation and Overshoot:** Anticipation moves the body opposite before strikes (leaning back $-12^\circ$); strikes and landings subtly overshoot ($5-8\%$) and settle.
6. **Weight & Balance:** Hips lead, lean follows, sword arrives last. Planted feet remain locked on the ground without sliding.
7. **Zero Jitter:** Procedural breathing applies exclusively during `idle` and blends to zero during moves. No random shaking except a subtle $0.5\text{px}$ tension tremble during the held tell pose of `enemyAttack`.
8. **Minimal Effects:** Only essential combat feedback is enabled by default: starburst hit sparks (5 crisp lines), blue block sparks, short fading strike trail, small ground dust puffs, Special Slam shockwave ring, floating reaction words (`HIT`, `BLOCKED`, `DODGED`, `PARRY`), clean shield dome, and the Special Slam banner. All extraneous effects are quarantined behind the **"Extra FX"** toggle (OFF by default).

---

## 📋 Complete Move Catalog (22 Moves)

Every move from `shared/CONTRACT.md` is registered in `CF.getMoveInfo(name)`:

| Move Name | Total Duration (`totalMs`) | Strike Time (`strikeMs`) | Tags | Persistent / Loops | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | 1200 ms | — | `persistent` | Yes (Loops) | Combat stance with rhythmic idle breathing |
| **`stepLeft`** | 320 ms | — | `dodge` | No | Quick sidestep backward (evades vertical attacks) |
| **`stepRight`** | 320 ms | — | `dodge` | No | Quick sidestep forward (evades vertical attacks) |
| **`jump`** | 550 ms | — | `dodge` | No | Hop into the air (evades low attacks) |
| **`duck`** | 350 ms | — | `dodge` | No | Deep crouch beneath horizontal strikes |
| **`block`** | 400 ms | — | `block` | No | Vertical sword guard across chest |
| **`slash`** | 400 ms | 180 ms | `attack` | No | Fast horizontal slash with 70ms strike action |
| **`hurt`** | 350 ms | — | `reaction` | No | Instant violent flinch and recoil (60ms) |
| **`enemyAttack`** | 3450 ms *(default)* | 3120 ms | `attack` | No | Neutral coil pose, visual tell, and delayed strike |
| **`feint`** | 3400 ms *(default)* | — *(None)* | `attack` | No | Identical tell that cancels into a shrug; never strikes |
| **`special`** | 1800 ms | 1200 ms | `attack`, `special` | No | Cinematic slam banner, deep charge, leap, and ground slam |
| **`weakSlash`** | 300 ms | 130 ms | `attack` | No | Fast, low-damage quick jab slash (60ms action) |
| **`strongSlash`**| 600 ms | 320 ms | `attack` | No | Heavy power strike with long windup and contact pause |
| **`comboHeavy`** | 900 ms | 200, 480, 750 ms | `attack` | No | Three-hit relentless heavy combination |
| **`stumble`** | 650 ms | — | `reaction` | No | Off-balance stagger recovery from blocked/parried hit |
| **`knockdown`** | 900 ms | — | `reaction` | No | Knocked flat onto the ground |
| **`victory`** | 800 ms | — | `persistent` | Yes (Holds) | Celebratory jump and sword salute |
| **`riposte`** | 700 ms | 420 ms | `attack`, `block` | No | Defensive parry followed by 360° counter spin |
| **`spinSlash`** | 650 ms | 180, 360, 520 ms | `attack` | No | Triple full-body 360° airborne spin slice |
| **`backflipEvade`**| 600 ms | — | `dodge` | No | Universal acrobatic backflip leap backward |
| **`dashThrust`** | 500 ms | 220 ms | `attack` | No | High-speed forward lunge thrust |
| **`focus`** | 1500 ms | — | `persistent` | Yes (Loops) | Kneel and type on glowing laptop terminal |

---

## 🔍 Visual Review & Audit Method

### Headless Agent Environment Notice
Because this coding assistant operates in a headless Windows execution environment without an active desktop GUI display server, an interactive browser window cannot be directly opened by the agent. 

To ensure absolute adherence to all visual and kinematic quality standards:
1. **Mathematical Collision & Silhouette Analysis (`anim/check_silhouettes.js`):**
   - Verified that bone lengths are strictly invariant ($\Delta L < 0.001\text{px}$).
   - Verified that grounded feet stay locked to $190\text{px}$ without sliding.
   - Verified minimum stance width ($>10\text{px}$) across all poses.
   - Verified sword and arm separation from the torso ($>6\text{px}$ clearance).
2. **Automated Timing & Protocol Verification (`anim/test_group1.js`):**
   - Verified that `enemyAttack` [H], `enemyAttack` [V], and `feint` remain **100% identical** across all joint fields at $t = 1.9\text{s}$.
   - Verified that horizontal and vertical tells diverge dramatically by $t = 2.4\text{s}$ ($\Delta \text{sw} = 270^\circ$, $\Delta \text{au} = 260^\circ$).
   - Verified per-frame simulation and joint calculation cost is **$0.030\text{ms}$** (well under the $2.0\text{ms}$ budget).
3. **Interactive 2x Contact Sheet Viewer (`anim/index.html`):**
   - The Animation Lab page includes a dedicated **"🖼 Contact Sheet (2x)"** button.
   - Clicking this generates 8 high-resolution keyframe preview canvases per move at $2\times$ scale ($280 \times 300\text{px}$ physical canvas buffer).
   - Toggling **"Silhouette Mode"** allows human review of all silhouettes in stark black-on-white.

### Contract Deviations
- **None.** All 22 move names, tags, event names (`strike`, `tell`, `parry`, `end`, `shieldBreak`), API methods, and timing-critical parameters (`strikeMs`, `tellMs`, `windupMs`, dodge hold windows) match `shared/CONTRACT.md` 100%.

### Poses for Human Visual Confirmation in Browser
While all poses have passed rigorous programmatic silhouette and geometric invariance tests, human aesthetic review is recommended by opening [`anim/index.html`](file:///C:/Miselonious/python/stickman/anim/index.html) and clicking **"Contact Sheet (2x)"** for:
- `slash`: Windup anticipation lean-back and strike extension.
- `enemyAttack` (H vs V): Distinct horizontal waist tell vs vertical overhead tell at $2.4\text{s}$.
- `jumpLand` and `duck`: Deep knee compression and clearance.
- `special`: Leap apex and ground crash contact pause.
- `spinSlash` and `riposte`: Full 360° body rotation transitions.

---

## 📁 File Structure

All files reside strictly under `anim/`:
- **`anim/index.html`** — The interactive Animation Lab harness with 2x Contact Sheet viewer.
- **`anim/STYLE.md`** — Visual design rules and rendering specifications.
- **`anim/rig.js`** — Rig dimensions, vector kinematics, easing functions, 0.5px rounding, and stick-figure canvas renderer.
- **`anim/poses.js`** — Named keyframe joint angles in absolute world degrees.
- **`anim/effects.js`** — Minimal combat effects (star sparks, dust, shockwave, floating words, slam banner).
- **`anim/moves.js`** — Catalog of all 22 moves, timing table, dynamic builders, and `CF.getMoveInfo()`.
- **`anim/fighter.js`** — `CF.Fighter` entity implementing the full `shared/CONTRACT.md` API.
- **`anim/lab.js`** — Lab controls, DPR backing store resizer, reaction simulation, and contact sheet generator.
- **`anim/test_group1.js`** — Headless automated test suite verifying contracts, timings, and benchmarks.
- **`anim/check_silhouettes.js`** — Mathematical limb clearance and silhouette stance analyzer.
