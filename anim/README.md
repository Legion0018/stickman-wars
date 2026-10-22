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

## 🎮 How Animation Works (Engine Architecture)

Gameplay code never animates directly. Instead:
- **Gameplay calls:** `fighter.play('slash')` or `fighter.react('hit')`.
- **A POSE** is a set of joint angles in absolute world degrees:
  - `0°` = straight down
  - `90°` = facing forward toward the opponent
  - `180°` = straight up
  - `-90°` = backward
  - `lean` = forward torso tilt
- **A MOVE** is a timed sequence of keyframe poses blended smoothly using easing curves (`linear`, `easeIn`, `easeOut`, `easeInOut`).
- **Zero-Allocation Hot Path:** In-place interpolation reuses pre-allocated pose objects every frame, ensuring silky-smooth 60+ FPS performance without garbage collection stutters.

### 📐 Rig Proportions & Length Invariance

All limbs are calculated via exact vector geometry:
$$[x, y] = [\sin(\theta) \times L, \cos(\theta) \times L]$$
Because joints are calculated purely from angles and fixed constants, stick figure limbs never stretch or distort:

| Bone Segment | Length (px) | Notes |
| :--- | :--- | :--- |
| **Torso** | 40 | From hip to shoulder |
| **Upper Arm** | 20 | Shoulder to elbow |
| **Forearm** | 20 | Elbow to hand |
| **Sword** | 34 | Hand to sword tip |
| **Thigh** | 26 | Hip to knee |
| **Shin** | 26 | Knee to foot |
| **Head Radius**| 9 | Offset 13px above shoulder |
| **Ground Line**| 190 | Baseline Y in canvas coordinates |

### 🦶 Ground Snap

To prevent foot float or sinking when poses crouch or tilt, the engine computes:
$$\text{hipY} = \text{groundY} - \max(\text{frontFootRelY}, \text{backFootRelY})$$
This guarantees the lowest foot remains anchored to `groundY = 190` whenever `!pose.airborne`.

---

## 📋 Complete Move Catalog (22 Moves)

Every move from `shared/CONTRACT.md` is registered in `CF.getMoveInfo(name)`:

| Move Name | Total Duration (`totalMs`) | Strike Time (`strikeMs`) | Tags | Persistent / Loops | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | 1200 ms | — | `persistent` | Yes (Loops) | Combat stance with rhythmic idle breathing |
| **`stepLeft`** | 320 ms | — | `dodge` | No | Quick sidestep backward (evades vertical attacks) |
| **`stepRight`** | 320 ms | — | `dodge` | No | Quick sidestep forward (evades vertical attacks) |
| **`jump`** | 550 ms | — | `dodge` | No | Hop into the air (evades low attacks) |
| **`duck`** | 350 ms | — | `dodge` | No | Low crouch (evades horizontal attacks) |
| **`block`** | 400 ms | — | `block` | No | Sword raised in guard stance |
| **`slash`** | 400 ms | 180 ms | `attack` | No | Standard horizontal sword slash |
| **`hurt`** | 350 ms | — | `reaction` | No | Recoil and flinch from taking direct hit |
| **`enemyAttack`** | 3450 ms *(default)* | 3120 ms | `attack` | No | Neutral coil pose, visual tell, and delayed strike |
| **`feint`** | 3400 ms *(default)* | — *(None)* | `attack` | No | Telegraphed tell that cancels into a shrug; never strikes |
| **`special`** | 1800 ms | 1200 ms | `attack`, `special` | No | Dramatic slam banner, deep charge, leap, and ground slam |
| **`weakSlash`** | 300 ms | 130 ms | `attack` | No | Fast, low-damage quick jab slash |
| **`strongSlash`**| 600 ms | 320 ms | `attack` | No | Heavy power strike with long windup |
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

## ⚔️ Telegraphed Attacks & Pending Direction Resolution

In Code Fighters, the attacker telegraphs their strike:
1. `fighter.play('enemyAttack', { dir: 'pending', tellMs: 2000, windupMs: 3000 })`
2. From `0` to `tellMs`, the fighter holds the neutral crouch pose (`enemyCoil`).
3. If `dir` is `'pending'` when `tellMs` arrives, the fighter **remains locked in `enemyCoil`** until network direction arrives.
4. When `fighter.resolveDir('h')` or `fighter.resolveDir('v')` is called:
   - Fighter emits `'tell'` with `{ dir }`.
   - Transitions to the corresponding visual tell pose (`tellH` or `tellV`).
   - If `resolveDir` was called *before* `tellMs`, the fighter transitions smoothly at `tellMs` without pause.

---

## 🛡️ Combat Reactions & Shields

- **`f.react('hit')`**: Plays the hurt recoil animation, triggers hit sparks, floating `"HIT!"` text, screen shake, and hit-stop.
- **`f.react('blocked')`**: Plays block recoil, sparks at blade, floating `"BLOCKED"` text.
- **`f.react('parried')`**: Emits `'parry'`, produces bright cyan flash and sparks, floating `"PARRIED!"` text.
- **`f.react('dodged')`**: Plays evasive sway and dust puff.
- **`f.setShield(true|false)`**: Toggles translucent glowing energy dome.
- **`f.shieldBreak()`**: Shatters shield into 20+ physics shards, triggers screen shake, and emits `'shieldBreak'`.

---

## 📁 File Structure

All files reside strictly under `anim/`:
- **`anim/index.html`** — The interactive Animation Lab harness.
- **`anim/rig.js`** — Rig dimensions, vector math, easing library, ground snap, and stick-figure canvas renderer.
- **`anim/poses.js`** — Named keyframe joint angles in absolute world degrees.
- **`anim/effects.js`** — Object-pooled particle effects (sparks, dust, shield shards, floating text, screen shake, flash, sword trails, cinematic banner).
- **`anim/moves.js`** — Catalog of all 22 moves, timing table, dynamic builders, and `CF.getMoveInfo()`.
- **`anim/fighter.js`** — `CF.Fighter` entity implementing the full `shared/CONTRACT.md` API.
- **`anim/lab.js`** — Lab controls, dual fighter orchestration, reaction simulation, and event logger.
