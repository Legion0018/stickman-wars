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

Every move from `shared/CONTRACT.md` and the original design specification is registered in `CF.getMoveInfo(name, opts)`:

| Move Name | Total Duration (`totalMs`) | Strike Time (`strikeMs`) | Tags | Persistent / Loops | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | 1200 ms | — | `persistent` | Yes (Loops) | Combat stance with rhythmic idle breathing |
| **`stepLeft`** | 500 ms | — | `dodge` | No | Quick sidestep backward (evades vertical attacks; hold window: 150–300ms) |
| **`stepRight`** | 500 ms | — | `dodge` | No | Quick sidestep forward (evades vertical attacks; hold window: 150–300ms) |
| **`jump`** | 550 ms | — | `dodge` | No | Hop into the air (evades low attacks) |
| **`duck`** | 900 ms | — | `dodge` | No | Deep crouch beneath horizontal strikes (hold window: 150–750ms; supports `opts.holdMs`) |
| **`block`** | 900 ms | — | `block` | No | Vertical sword guard across chest (hold window: 120–720ms; supports `opts.holdMs`) |
| **`slash`** | 400 ms | 180 ms | `attack` | No | Fast horizontal slash with snappy 70ms strike action |
| **`hurt`** | 350 ms | — | `reaction` | No | Instant violent flinch and recoil (60ms) |
| **`enemyAttack`** | 3450 ms *(default)* | 3120 ms | `attack` | No | Neutral coil pose, visual tell at 2000ms, strike at 3120ms |
| **`feint`** | 3400 ms *(default)* | — *(None)* | `attack` | No | Identical tell that cancels into a shrug at 3000ms; never strikes |
| **`special`** | 1500 ms *(hard)* | 1000 ms | `attack`, `special` | No | Cinematic slam banner, leap, and ground slam (easy: 600ms/350ms, med: 1100ms/800ms) |
| **`weakSlash`** | 360 ms | 210 ms | `attack` | No | Fast, low-damage quick jab slash (70ms action) |
| **`strongSlash`**| 700 ms | 390 ms | `attack` | No | Heavy power strike with forward step (dx +30), trail and 80ms hit-stop |
| **`comboHeavy`** | 1400 ms | 300, 650, 1050 ms | `attack` | No | Three-hit relentless heavy combination (slash, backhand, overhead) |
| **`stumble`** | 1000 ms | — | `reaction` | No | Off-balance wild whiff stagger (lean 42, dx +22) |
| **`knockdown`** | 900 ms | — | `reaction`, `persistent` | Yes (Holds) | Knocked flat onto the ground (persistent until reset) |
| **`victory`** | 800 ms | — | `persistent` | Yes (Holds) | Celebratory jump and sword salute (persistent until reset) |
| **`riposte`** | 900 ms | 600 ms *(parry: 150ms)* | `attack`, `block` | No | Defensive parry at 150ms followed by spin-step and counter-slash at 600ms |
| **`spinSlash`** | 900 ms | 300, 560 ms | `attack` | No | Full 360° circular spin with strikes at 300ms and 560ms |
| **`backflipEvade`**| 650 ms | — | `dodge` | No | Acrobatic full backflip leap backward (rot 0° to -360°, dx -60, dy -70) |
| **`dashThrust`** | 700 ms | 200 ms | `attack` | No | High-speed forward lunge thrust (dx +120, strike at 200ms, 150ms hold) |
| **`focus`** | 1500 ms | — | `persistent` | Yes (Loops) | Kneel and type on glowing laptop terminal with pulsing shield dome |

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
2. **Automated Timing & Protocol Verification (`anim/test_group1.js`, `test_group2.js`, `test_group3.js`, `test_group4.js`):**
   - Verified that `enemyAttack` [H], `enemyAttack` [V], and `feint` remain **100% identical** across all joint fields at $t = 1.9\text{s}$.
   - Verified that horizontal and vertical tells diverge dramatically by $t = 2.4\text{s}$ ($\Delta \text{sw} = 270^\circ$, $\Delta \text{au} = 260^\circ$).
   - Verified per-frame simulation and joint calculation cost is **$0.030\text{ms}$** (well under the $2.0\text{ms}$ budget).
3. **Interactive 2x Contact Sheet Viewer (`anim/index.html`):**
   - The Animation Lab page includes a dedicated **"🖼 Contact Sheet (2x)"** button.
   - Generates 8 high-resolution keyframe preview canvases per move at $2\times$ scale ($280 \times 300\text{px}$ physical canvas buffer).
   - Toggling **"Silhouette Mode"** allows human review of all silhouettes in stark black-on-white.
4. **Interactive Pose Tweaker (`anim/index.html`):**
   - Pick any named pose from `CF.Poses`, tweak joint angles and positions via sliders, observe real-time rendering on Fighter A, and click **"Copy pose as JS"** to copy the formatted JS object.

---

### Specification Timings & Deviations Log

1. **Hold Windows Restored to Original Spec:**
   - `duck`: Updated from transient 350ms to full 900ms duration (150ms down, 600ms hold window `[150, 750]ms`, 150ms rise).
   - `block`: Updated from 400ms to 900ms duration (120ms guard snap, 600ms hold window `[120, 720]ms`, 180ms recover).
   - `stepLeft` & `stepRight`: Updated from 320ms to 500ms duration (150ms slide, 150ms hold window `[150, 300]ms`, 200ms return).
2. **Persistent Moves:**
   - `knockdown`: Updated `persistent: true` with `tags: ['reaction', 'persistent']`. Fighter remains flat on the floor in `knockdownFlat` until `reset()` or `cancel()`.
   - `victory` and `focus`: Hold their celebratory salute and typing stance persistently.
3. **`CF.getMoveInfo(name, opts)` Tier Variants:**
   - `special`: Returns exact metadata based on `opts.tier`:
     - `easy`: `totalMs: 600`, `strikeMs: 350`
     - `medium`: `totalMs: 1100`, `strikeMs: 800`
     - `hard`: `totalMs: 1500`, `strikeMs: 1000` (default)
4. **Enemy Attack Contact Moment:**
   - Confirmed `strikeMs: 3120` (3000ms windup + 120ms sweep) for default easy tier, landing strike event with screen shake and trail.
5. **Basic Slash Tuning:**
   - Basic `slash` uses snappy visual quality pass timing: `totalMs: 400`, `strikeMs: 180` (110ms windup, 70ms strike sweep, 40ms contact overshoot, 180ms recovery).
6. **Auto Dodge Reaction Delay Slider:**
   - Target reaction in auto mode applies dodge at `tellTime + delayMs` (slider: 0 to 1000 ms, default 450 ms).
   - Live UI readout `"Dodge window covers strike: YES / NO"` allows demonstrating both successful evasion (at 450 ms, window `[2600, 3200]ms` covers strike at 3120 ms) and failure (at 0 ms, dodge ends too early; at 1000 ms, strike lands during initial drop).

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
- **`anim/test_group2.js`** — Group 2 moves automated verification suite.
- **`anim/test_group3.js`** — Group 3 moves automated verification suite.
- **`anim/test_group4.js`** — Group 4 moves and Pose Tweaker verification suite.
- **`anim/test_reduced_fx.js`** — Focused regression suite verifying reduced effects and low-power idle throttling.
- **`anim/test_combat_upgrade.js`** — Focused regression suite for combat animation quality and clash demos.
- **`anim/check_silhouettes.js`** — Mathematical limb clearance and silhouette stance analyzer.

---

## ⚔️ Combat Animation Quality Upgrades & Clash Demos

The core combat triad has undergone an intensive visual and kinematic quality pass:
1. **Slash:**
   - **Deep Anticipation (`slashWindup`):** Torso coils back ($-16^\circ$, $dx: -10$), weight shifts onto back leg, sword arm cocks high and back ($sw: 210^\circ$).
   - **Full-Body Lunge (`slashStrike`):** Snappy forward lunge ($+28^\circ$ lean, $dx: +28$), front knee driving forward into a deep stance, rear arm countering for dynamic balance, and sword sweeping cleanly across the horizontal plane ($sw: 85^\circ$).
   - **Follow-Through Arc (`slashOvershoot`):** Blade continues in a curved arc across the body ($sw: 65^\circ$, $dx: +30$) with a readable $40\text{ms}$ impact freeze before smooth recovery.
2. **Duck & Sidestep Evasions:**
   - **Duck:** Deep knee compression and low torso crouch ($lean: 36^\circ$, $drop: 28\text{px}$, $footSep: 61.7\text{px}$) lowering the head by $>26\text{px}$ beneath incoming high slashes.
   - **Sidestep (`stepLeft` / `stepRight`):** Athletic weight transfer with leading foot driving into space and trailing knee catching momentum.
3. **Hit Reactions & Defeat:**
   - **Hurt:** Violent recoil snap ($lean: -32^\circ$, $dx: -24$), head and neck whiplash, blade knocked wide, followed by a grounded foot reset.
   - **Knockdown Defeat:** High-impact balance loss tilting back through the air into a complete flat collapse ($lean: -90^\circ$, $rot: -90^\circ$, $airborne: true$) that remains grounded indefinitely.

### Interactive Combat Clash Demos
The Animation Lab includes one-click buttons to demonstrate combat interactions in real time:
- **🛡️ Slash vs. Duck:** Demonstrates Fighter A's lunging slash passing harmlessly overhead while Fighter B ducks into low evasive clearance.
- **💥 Slash vs. Hit Recoil:** Demonstrates direct strike impact, triggering violent chest whiplash and sparks on Fighter B.
- **💀 Slash vs. Knockdown:** Demonstrates a finishing strike causing Fighter B to collapse flat on the floor in persistent defeat.

---

## ⚡ Low-Power & Laptop 2 Performance Optimizations

To guarantee smooth performance and low battery/thermal consumption on weaker laptops (e.g., dual-core CPUs, integrated Intel HD Graphics):

### 1. Configurable Reduced Effects Mode (`reducedFx`)
- **Default State:** `false` (100% backward compatible with original visual quality pass).
- **How to Enable via UI:** Check the **"Reduced FX"** checkbox in the top header toolbar of `anim/index.html`.
- **How to Enable via API:**
  ```javascript
  // Either via CF.Effects or top-level CF convenience helper
  CF.Effects.setReducedFx(true);
  // or
  CF.setReducedFx(true);
  ```
- **Optimizations Applied:**
  - **Hit & Block Sparks:** Simplified from 5 multi-line rays ($9\text{px}$) to 3 rays ($5-6\text{px}$) with faster fade-out ($80-90\text{ms}$ vs $130-140\text{ms}$), reducing canvas 2D stroke operations by 40%.
  - **Ambient Dust Puffs:** Optional landing and step dust puffs are completely skipped.
  - **Shield Shards:** Max simultaneous break shards capped to 6 (down from 16) with shorter lifetime.
  - **Shockwaves & Trails:** Max trail history capped to 3 points (down from 5), shockwave lifetime reduced to $180\text{ms}$.
- **Zero Gameplay / Timing Impact:** Hit-stop duration ($80\text{ms}$), combat move durations, keyframe interpolation, strike moments, and event callbacks (`strike`, `tell`, `parry`, `shieldBreak`, `end`) are strictly invariant and run identically regardless of `reducedFx` state.

### 2. Low-Power Idle Throttling (`idleThrottle`)
- **Default State:** `false` (full 60 FPS redraws by default).
- **How to Enable via UI:** Check the **"Low-Power Idle"** checkbox in `anim/index.html`.
- **How to Enable via API:**
  ```javascript
  CF.setIdleThrottle(true); // or CF.Lab.setIdleThrottle(true);
  ```
- **Mechanism & Safety:**
  - **Quiescent Scene Detection (`isSceneVisuallyIdle`):** Only throttles when both fighters are resting in `idle`, neither fighter is busy, no auto-reactions or direction waits are pending, and `CF.Effects.hasActiveEffects()` is `false`.
  - **Zero Input or Simulation Delay:** Simulation updates (`updateSimulation(dt)`) and input listeners continue ticking every frame without skipping.
  - **~67% Canvas Redraw Reduction:** On standard 60Hz screens, idle canvas redraws are throttled to 20–24 FPS, maintaining smooth procedural breathing while eliminating over 60% of idle GPU/canvas redraw overhead.
  - **Instant Uncapped Response:** The millisecond any attack or movement starts, throttling instantly disengages, rendering that very frame at full 60+ FPS with zero lag.
  - **Zero Redundant Redraws While Paused:** Pausing completely stops canvas redraws until user interaction or step.
