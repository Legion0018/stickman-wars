# Code Fighters — Move Reference Guide

This document lists all 22 combat and movement animations defined in `shared/CONTRACT.md`, detailing their durations, keyframe timings, strike moments, and combat roles.

---

## Group 1: Core Mechanics (Foundation)

### 1. `idle`
- **Category:** Stance
- **Duration:** 1200 ms (Loops)
- **Strike Time:** None
- **Tags:** `['persistent']`
- **Description:** Default ready stance with sword held at a 45° angle. Includes subtle procedural breathing that oscillates torso lean and arm flex.

### 2. `stepLeft`
- **Category:** Dodge
- **Duration:** 320 ms
- **Strike Time:** None
- **Tags:** `['dodge']`
- **Counters:** Vertical attacks (`enemyAttack` with `dir: 'v'`).
- **Description:** Rapid sidestep backward away from opponent (`dx = -46px`), shifting weight and recovering smoothly.

### 3. `stepRight`
- **Category:** Dodge
- **Duration:** 320 ms
- **Strike Time:** None
- **Tags:** `['dodge']`
- **Counters:** Vertical attacks (`enemyAttack` with `dir: 'v'`).
- **Description:** Rapid sidestep forward toward opponent (`dx = 46px`), closing distance.

### 4. `jump`
- **Category:** Dodge
- **Duration:** 550 ms
- **Strike Time:** None
- **Tags:** `['dodge']`
- **Description:** Anticipation crouch (70ms), explosive leap to apex (`dy = -60px` at 260ms), fall (400ms), and impact landing (470ms) with dust puffs.

### 5. `duck`
- **Category:** Dodge
- **Duration:** 350 ms
- **Strike Time:** None
- **Tags:** `['dodge']`
- **Counters:** Horizontal attacks (`enemyAttack` with `dir: 'h'`).
- **Description:** Deep defensive crouch (`drop = 16px`, `lean = 25°`) keeping head and torso safely beneath high horizontal slashes.

### 6. `block`
- **Category:** Block
- **Duration:** 400 ms
- **Strike Time:** None
- **Tags:** `['block']`
- **Counters:** Any standard attack.
- **Description:** Sword brought vertical across the chest and torso.

### 7. `slash`
- **Category:** Attack
- **Duration:** 400 ms
- **Strike Time:** 180 ms
- **Tags:** `['attack']`
- **Description:** Fast sword windup (90ms) followed by horizontal slash strike (180ms), recovery (280ms), and return to stance.

### 8. `hurt`
- **Category:** Reaction
- **Duration:** 350 ms
- **Strike Time:** None
- **Tags:** `['reaction']`
- **Description:** Violent recoil backward (`lean = -25°`, `dx = -18px`) upon taking damage, recovering to stance.

### 9. `enemyAttack`
- **Category:** Telegraphed Attack
- **Default Duration:** 3450 ms (Easy tier)
- **Strike Time:** 3120 ms
- **Tags:** `['attack']`
- **Phases:**
  - `0 – tellMs` (2000 ms): Neutral coiled crouch (`enemyCoil`).
  - `tellMs`: Direction is telegraphed (`'h'` or `'v'`), emits `'tell'`.
  - `tellMs – windupMs` (2000–3000 ms): Holds distinct visual tell pose (`tellH` or `tellV`).
  - `windupMs + 120 ms`: Strike lands with screen shake and trail, emits `'strike'`.
  - `windupMs + 450 ms`: Recovery to idle.
- **Pending Direction Support:** If `dir === 'pending'`, the fighter pauses at `tellMs` until `resolveDir(dir)` is called.

### 10. `feint`
- **Category:** Telegraphed Deception
- **Default Duration:** 3400 ms
- **Strike Time:** None (Never strikes)
- **Tags:** `['attack']`
- **Description:** Follows the exact same coil and tell as `enemyAttack` to bait the opponent into an early block or dodge, but at `windupMs` cancels into a non-damaging shrug (`feintShrug`).

### 11. `special`
- **Category:** Special Attack
- **Duration:** 1800 ms
- **Strike Time:** 1200 ms
- **Tags:** `['attack']`, `['special']`
- **Description:** Triggers full-screen letterbox cinematic banner ("SPECIAL SLAM"), deep power charge, high leap, and devastating ground crash with shockwave ring and heavy screen shake.

---

## Group 2: Attack Variants & Combat Outcomes

### 12. `weakSlash`
- **Duration:** 300 ms | **Strike:** 130 ms | **Tags:** `['attack']`

### 13. `strongSlash`
- **Duration:** 600 ms | **Strike:** 320 ms | **Tags:** `['attack']`

### 14. `comboHeavy`
- **Duration:** 900 ms | **Strikes:** 200 ms, 480 ms, 750 ms | **Tags:** `['attack']`

### 15. `stumble`
- **Duration:** 650 ms | **Tags:** `['reaction']`

### 16. `knockdown`
- **Duration:** 900 ms | **Tags:** `['reaction']`

### 17. `victory`
- **Duration:** 800 ms (Holds) | **Tags:** `['persistent']`

---

## Group 3: Originals & Advanced Moves

### 18. `riposte`
- **Duration:** 700 ms | **Strike:** 420 ms | **Tags:** `['attack']`, `['block']`

### 19. `spinSlash`
- **Duration:** 650 ms | **Strikes:** 180 ms, 360 ms, 520 ms | **Tags:** `['attack']`

### 20. `backflipEvade`
- **Duration:** 600 ms | **Tags:** `['dodge']`

### 21. `dashThrust`
- **Duration:** 500 ms | **Strike:** 220 ms | **Tags:** `['attack']`

### 22. `focus`
- **Duration:** 1500 ms (Loops) | **Tags:** `['persistent']`
