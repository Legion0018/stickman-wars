# STICK WARS — Master Project Specification & Technical Roadmap

> **Document Status:** Authoritative Master Document  
> **Last Updated:** 2026-10-23  
> **Project Directory:** `D:\github_projects\stickman-wars`  
> **Budget Constraint:** Strict ₹0 (No paid APIs, no credit cards, no billing verification, no recurring cloud fees)

---

## 1. Executive Summary & Vision

**Stickman Wars** is a high-performance browser-based hybrid game that bridges fast-paced 2D stick-figure martial arts combat with real-time Python programming. 

The core game balances two interconnected pillars:
1. **Authoritative Combat Engine:** A responsive, frame-independent combat arena where two stick fighters clash using slashes, sustained blocks, ducking dodges, and devastating special attacks.
2. **In-Browser Python Execution:** A client-side, zero-latency Web Worker running Pyodide (WebAssembly Python) that allows players to write, debug, and execute real Python code to empower their fighter.

The application features a permanent side-by-side workspace: a code editor on the left and the fighting arena on the right, linked by cosmetic animations and input event pipelines, while strictly preserving authoritative game balance and networking boundaries.

---

## 2. Current Implemented Foundation

The following components are **implemented and verified** in the active codebase as of Phase 1, subject to automated test suites and local browser verification.

### 2.1 Core Combat Engine & Fighters (`src/fighter.js`)
* **Two Distinct Fighters:** Fighter A (Left, ink: `#333333`, accent: `#EF9F27`) and Fighter B (Right, ink: `#444444`, accent: `#EF9F27`, mirrored facing).
* **Authoritative Combat Actions:**
  * **Slash:** Windup (220ms), strike landing at ~310ms, recovery (140ms).
  * **Block:** Guard pose; supports sustained hold and smooth release return to idle.
  * **Duck:** Crouch pose; supports sustained hold and smooth release return to idle.
  * **Special Slam:** Dramatic screen banner sequence (650ms) followed by an empowered strike.
  * **Hurt:** Whiplash recoil animation triggered upon taking an unblocked hit.
* **Authoritative Hit Resolution (`checkHit`):**
  * Incoming strike against an idle/attacking opponent resolves as `HIT` (deals 25 damage, plays `hurt`).
  * Incoming strike against a blocking opponent resolves as `BLOCKED` (deals 10 chip damage, plays block sparks).
  * Incoming strike against a ducking opponent resolves as `DODGED` (deals 0 damage).
* **Health State & Reset:**
  * Each fighter initializes with `hp = 100` and `maxHp = 100` in `Fighter.constructor()`.
  * `resetHp()` restores health to `maxHp`.
  * Floating combat feedback text (`HIT!`, `BLOCKED!`, `DODGED!`) spawns over the target.

### 2.2 Animation Engine & Bridge Adapter (`anim/`, `src/anim-bridge.js`)
* **Integrated Animation Engine (`anim/`):** Classic kinematic stick-figure rig (`anim/rig.js`), pose catalogues (`anim/poses.js`), particle effects pool (`anim/effects.js`), and move controller (`anim/fighter.js`).
* **Cosmetic Bridge Adapter (`src/anim-bridge.js`):**
  * Connects combat actions (`slash`, `block`, `duck`, `special`) to the visual animation engine.
  * **Cosmetic Invariant Guarantee:** The bridge adapter never calculates damage, decrements HP, or decides hit outcomes. Combat authority remains 100% in `src/fighter.js`.
  * **Graceful Degradation:** If the animation engine scripts fail to load, the bridge safely degrades to a no-op, allowing the game to run using standard 2D canvas drawing.

### 2.3 Local Python Runtime & Execution (`python-poc/`)
* **Client-Side Pyodide Worker:** Background Web Worker (`python-poc/worker.js`) executing genuine Python code via WebAssembly.
* **Host Runner (`python-poc/runner.js`):**
  * Watchdog timeout protection (3500ms default) to catch infinite loops without freezing the main UI thread.
  * Captures `stdout`, `stderr`, return values, and tracebacks (SyntaxError, AssertionError, NameError).
  * Single-use execution debounce to prevent spamming unlocks.

### 2.4 Question Registry & Challenge Dataset (`src/challenges-data.js`, `src/question-registry.js`)
* **Twelve Verified Challenges:** Hand-crafted, schema-validated challenges covering 6 fundamental Python topics:
  1. `special-slam-1` (Conditionals, Beginner, unlocks Special Slam)
  2. `strike-power-1` (Variables, Beginner, unlocks Slash)
  3. `guard-defense-1` (Conditionals, Beginner, unlocks Block)
  4. `evasion-check-1` (Conditionals, Beginner, unlocks Duck)
  5. `combo-counter-1` (Loops, Intermediate, unlocks Slash)
  6. `stamina-recovery-1` (Loops, Intermediate, unlocks Block)
  7. `critical-hit-1` (Functions, Intermediate, unlocks Special Slam)
  8. `potion-inventory-1` (Lists, Beginner, unlocks Block)
  9. `max-threat-1` (Lists, Intermediate, unlocks Slash)
  10. `filter-alive-1` (Lists, Intermediate, unlocks Duck)
  11. `debug-indent-1` (Debugging, Beginner, unlocks Special Slam)
  12. `debug-typo-1` (Debugging, Beginner, unlocks Slash)
* **Deterministic Grading:** Each challenge includes deterministic test cases (`input`, `args`, `expected`) evaluated locally without external AI APIs.
* **Registry Safeguards:** Enforces immutability via deep cloning, schema validation, and graceful handling of unknown challenge IDs.

### 2.5 Permanent Split-Screen UI & Custom Components (`index.html`, `style.css`, `src/challenge-controller.js`)
* **Desktop Split Layout (> 900px):**
  * Far-left fixed 48px Apple-style navigation rail that expands on hover without shifting content.
  * Permanent horizontal split: Left coding workspace (46% default) and Right combat arena (54% default).
  * Interactive draggable vertical divider clamped strictly between 20% and 80%.
  * Root viewport constrained to `100vh` / `100dvh` with `overflow: hidden`—zero document-level scrolling.
* **Custom Game-Native Challenge Selector:**
  * Compact closed trigger button displaying Python icon (`🐍`), truncated title, color-coded difficulty pill (`[BEG]`, `[INT]`, `[ADV]`), and chevron.
  * Grouped listbox menu organized across 6 concept categories with combat move icons (⚡, 🗡️, 🛡️, 💨) and active checkmarks (`✓`).
  * Full keyboard accessibility (Space/Enter to open, Up/Down arrows to navigate, Home/End, Enter to select, Esc to dismiss, Tab to exit).
  * Absolute layering over editor without shifting the arena or changing the split ratio.
* **Authoritative Combat HUD:**
  * Displays real-time health numbers (`100 / 100`) and proportional health bars for Fighter A and Fighter B.
  * Dynamic warning (`<60%`) and critical (`<30%`) color gradients with ghost damage trails.
* **Telemetry & Diagnostics:**
  * Collapsible panel starting collapsed by default (48px header) with internal scrolling event log.
  * Tracks packet counters (Sent / Received) and live latency telemetry.
* **Responsive Mobile/Tablet Support (≤ 900px):**
  * Switches from horizontal split to a top tab bar (`[🐍 Python Editor]` / `[🎮 Combat Arena]`).
  * Active panel takes 100% width and full height; inactive panel is hidden. Eliminates unnavigable vertical stacking.

### 2.6 Networking & Relay Foundations (`server/relay.js`, `src/websocket-transport.js`, `src/loopback-transport.js`)
* **Local Relay Server (`server/relay.js`):** Lightweight Node.js server using `http.createServer` and `ws` (`WebSocketServer`).
* **Room-Based Routing:** `Map<roomCode, Set<WebSocket>>` with validation regex `/^[a-zA-Z0-9_\-]{1,64}$/`. Broadcasts to peers while preventing self-echo.
* **Transports:** `LoopbackTransport` (same-browser cross-tab via BroadcastChannel) and `WebSocketTransport` (network relay).
* **Latency Telemetry:** Periodic ping/pong packets every 2.0s calculating RTT, Min, Max, Avg, and Jitter.

> [!WARNING]
> **Verification Limit:** Public cross-network multiplayer across two physical devices on different external networks is **not yet verified**. All existing network verification has been conducted locally (loopback and multi-client connections on local interfaces).

---

## 3. Revised Gameplay Vision & Design

### 3.1 Two Distinct Coding Modes

The game will offer two distinct modes of programming interaction, catering to different problem-solving rhythms:

```
+-----------------------------------------------------------------------------------------+
|                                    GAMEPLAY CODING MODES                                |
|                                                                                         |
|  [ MODE A: Special Attack Programming ]           [ MODE B: Live Combat Programming ]   |
|  • Solve standalone Python functions              • Issue real-time tactical commands   |
|  • Test-case validation unlocks super moves       • print("slash"), print("block")      |
|  • Deep algorithmic thinking                      • Fast-paced execution & sequencing   |
+-----------------------------------------------------------------------------------------+
```

#### Mode A — Special Attack Programming (Implemented Foundation)
* **Core Loop:** The fighter engages in combat using standard controls. Simultaneously, a Python coding challenge is presented in the editor.
* **Mechanic:** Writing code that satisfies all unit assertions charges and unlocks an empowered special move (e.g., Special Slam).
* **Progression:** Challenges advance from basic variables and conditions to loop accumulators, list filters, and debugging.
* **Preservation:** Existing starter bugs, solution loading (without cheat-unlocking attacks), and deterministic test harnesses remain active.

#### Mode B — Live Combat Programming (Proposed Roadmap)
* **Core Loop:** Instead of relying exclusively on keyboard presses, players write tactical scripts where approved Python `print()` statements issue live combat commands.
* **Command Vocabulary:**
  * `print("slash")` $\rightarrow$ Queues a strike action.
  * `print("block")` $\rightarrow$ Enters defensive guard.
  * `print("duck")` $\rightarrow$ Enters evasive duck.
* **Hybrid Testing Controls:** Normal keyboard controls (A/S/D/F and J/K/L/;) will be retained alongside script execution for testing and manual takeover.
* **Command Queuing & Cadence:** Output is captured from worker `stdout`, parsed against allowed command keywords, and queued into the fighter's action queue under controlled framerate timing (e.g., 200–300ms cadence).
* **Anti-Abuse & Diminishing Returns:**
  * **Spam Prevention:** Maximum script length (e.g., 25 lines) and execution rate limiting.
  * **Diminishing Effectiveness:** Repeating the same attack multiple times in a single sequence incurs escalating windup delays and reduced damage to discourage trivial `for i in range(100): print("slash")` loops.
  * **Defense Caps:** Continuous blocking/ducking via script has a maximum hold duration before the fighter suffers guard fatigue.
* **Zero-Authority Invariant:** Python code output can **never** directly set fighter HP, damage values, or declare hits. It only injects candidate action intentions into the authoritative combat state machine.

### 3.2 Timed Challenges, Skip Mechanics & Penalties

To prevent players from stalling in the editor while ignoring the battle, timed challenge rules will be introduced:

* **Defined Deadlines:** Each challenge features an active countdown timer (e.g., 60 seconds).
* **Timeout Penalty:**
  * If the timer reaches 0 before valid code is submitted, the player loses their active defensive shield.
  * The opposing fighter automatically performs one guaranteed counter-attack.
* **Skip Option:**
  * Players may skip a frustrating challenge using an explicit "Skip" button.
  * Skipping incurs a defined penalty (e.g., temporary stamina or shield debuff) and forces the registry to assign a question of intermediate difficulty or higher.
* **Exploit & Stale Protection:**
  * Single-penalty enforcement: A timed-out challenge applies the penalty exactly once; it cannot re-trigger repeatedly on subsequent animation frames.
  * Stale submission rejection: Code submitted after expiration is rejected until the challenge is reset.
  * Duplicate unlock protection: A single successful solve grants exactly one combat unlock.
* **Shield Recovery Rule (Open Design Decision):**
  * The specific mechanism for recovering a broken shield (e.g., landing two consecutive manual blocks, surviving 10 seconds without being hit, or solving a subsequent beginner problem) remains an open design decision awaiting balance testing.

> [!NOTE]
> Precise timer durations (e.g., 45s vs 60s vs 90s), exact skip penalties, and shield recovery parameters are designated as **open design decisions** to be established via playtesting in Phase 5.

### 3.3 Offline Bots & Training Mode (Proposed)
* **Local Practice Engine:** An offline mode allowing solo players to battle against pre-programmed rule-based bots.
* **Predictable $\rightarrow$ Dynamic Progression:**
  * Tier 1 (Punching Dummy): Periodic telegraphed slashes; tests basic block and duck timing.
  * Tier 2 (Apprentice Bot): Reacts to incoming player windups with defensive blocks.
  * Tier 3 (Master Duelist): Employs feints, counter-slashes, and sustained guards.
* **Pedagogical Purpose:** Serves as a safe testing sandbox for Python scripts (Modes A and B) and balance verification prior to public multiplayer.
* **Zero AI Cost:** Built entirely with deterministic finite-state machines. No paid AI APIs, LLM calls, or cloud servers.

### 3.4 Question Library Expansion Architecture
* **Existing Baseline:** The 12 handcrafted challenges in `src/challenges-data.js` are preserved.
* **Template-Driven Expansion:** The question library will scale using verified challenge templates with parameterized inputs and deterministic expected outputs.
* **Content Licensing:** Only original code challenges or openly licensed educational curriculum (CC-BY / MIT) will be integrated.
* **Quality Assurance Pipeline:** All newly added challenges must pass automated schema validation and deterministic evaluation in `test-question-library.js` before being registered in production.

### 3.5 Combat Balance Reference Table

The following values represent the current active reference baseline:

| Attribute | Reference Baseline | Combat Behavior |
|---|---|---|
| **Maximum Health** | `100 HP` | Initialized in `Fighter.constructor()` |
| **Normal Slash Hit** | `-25 HP` | Landed when target is not blocking or ducking; triggers `hurt` |
| **Blocked Slash** | `-10 HP` | Chip damage when target is holding block; triggers block recoil sparks |
| **Dodge (Duck)** | `0 HP` | Completely evades horizontal slash; 0 damage taken |
| **Special Slam** | `-25 HP` (+ Stun) | Base damage with visual hit-stop banner; final scaling pending Phase 5 |

*Note: Final balance tuning (special move damage scaling, cooldown periods, queue depths, diminishing return multipliers) will be calibrated in Phase 5.*

---

## 4. Cross-Network Multiplayer Audit & Blockers

An architectural audit of the current networking code ([server/relay.js](file:///D:/github_projects/stickman-wars/server/relay.js), [src/net-helpers.js](file:///D:/github_projects/stickman-wars/src/net-helpers.js), [src/websocket-transport.js](file:///D:/github_projects/stickman-wars/src/websocket-transport.js), [src/main.js](file:///D:/github_projects/stickman-wars/src/main.js)) identified the following findings and concrete blockers:

### 4.1 Verified Working Assets
1. **Relay Server Structure:** Node.js HTTP + `ws` server with clean room routing, empty-room cleanup, and self-echo suppression.
2. **Buffering Transport:** `WebSocketTransport` buffers outgoing messages during handshake and flushes on connection.
3. **Telemetry Diagnostics:** Bi-directional RTT calculation with jitter, min, and max statistics.
4. **Passed Tests:** Local unit tests in `test-websocket.js` and `test-loopback-diagnostics.js` pass with 100% success.

### 4.2 Reported Blockers to Public Cross-Network Play

```
[Client 1: HTTPS (GitHub Pages)]                 [Client 2: Mobile Browser]
                \                                       /
                 \--- Blocked by wss:// Mixed Content -/
                  \                                   /
                   v                                 v
         [ config.relayServerUrl = "wss://relay.example.com" ] (DUMMY URL)
```

1. **Placeholder Relay URL (Blocker 1):** In `config.js`, `relayServerUrl` is set to `"wss://relay.example.com"`. Any client running on public hosting or HTTPS falls back to this non-existent domain and fails to connect.
2. **HTTPS Mixed-Content Enforcement (Blocker 2):** When the frontend is hosted on HTTPS (e.g. GitHub Pages), browsers strictly prohibit unencrypted `ws://` connections to raw IP addresses. A public relay must provide a valid TLS certificate (`wss://`).
3. **Uncoordinated Role Assignment (Blocker 3):** `localRole` defaults to `'A'` on all clients. Incoming action packets where `msg.sender === localRole` are filtered to prevent self-echo. If two players join the same room without manually toggling roles, both are Fighter A; neither player will see the other player's actions.
4. **Missing Shareable Invitation URL (Blocker 4):** There is no one-click "Invite Player 2" button to generate a URL with pre-configured room code and role assignment (`?room=XYZ&role=B`).
5. **Decentralized Combat Resolution & HP Drift (Blocker 5):** Both clients execute `checkHit('slash')` locally at ~310ms into the strike motion. Across high-latency networks, packet arrival jitter can cause Client 1 to resolve a hit (-25 HP) while Client 2 resolves a block (-10 HP), causing permanent HP state desynchronization.
6. **Missing Reconnection Logic (Blocker 6):** `WebSocketTransport` does not implement exponential backoff reconnection if the socket drops momentarily due to mobile network handoffs.

---

## 5. Multiplayer Architecture & Security Decisions

### 5.1 System Topology
The production deployment cleanly decouples frontend static hosting from the real-time relay:

```
+-----------------------------------------------------------------------------------------+
|                                  PRODUCTION TOPOLOGY                                    |
|                                                                                         |
|  [ STATIC HOST (Frontend) ]                       [ SECURE RELAY (Backend WSS) ]        |
|  GitHub Pages                                     Free Node.js Host or Tunnel           |
|  https://<user>.github.io/stickman-wars/   --->   wss://<relay-service>/room?room=XYZ   |
|  • HTML / CSS / Client JS                         • Stateful Node.js + ws               |
|  • Pyodide WASM / Web Worker                      • Room routing & echo suppression     |
+-----------------------------------------------------------------------------------------+
```

### 5.2 Authoritative Combat & Synchronization Strategy
Broadcasting raw HP numbers between untrusted clients is rejected because any modified client could inject arbitrary health values. The agreed architecture adheres to:
1. **Input-Only Transmissions:** Clients transmit only authenticated user intent packets: `{ t: 'action', a: 'slash'|'block'|'duck'|'special' }` and `{ t: 'release', a: 'block'|'duck' }`.
2. **Designated Strike Arbiter:** For each strike, the *defender's client* serves as the authoritative arbiter of defense timing (or server-side resolution where feasible). The defender evaluates whether guard was active upon strike impact, ensuring players never suffer hits that appeared blocked on their screen due to lag.
3. **State Reconciliation Packets:** Following hit resolution, a lightweight synchronization envelope reconciles the authoritative fighter HP state to ensure zero drift across peers.
4. **Room Invitation Links:** Player 1 generates a shareable room link automatically embedding `?room=<uniqueCode>&role=B`. When Player 2 loads the link, their role is locked to Fighter B, eliminating role collisions.

### 5.3 Public ₹0 Relay Hosting Evaluation

| Platform / Approach | Cost | Credit Card Required? | Persistent WebSocket Support? | Limitations & Practicality |
|---|---|---|---|---|
| **Glitch (`glitch.com`)** | **₹0** | **NO** | **YES** (`wss://`) | • Runs standard Node.js + `ws` without code changes.<br>• Free TLS termination.<br>• *Limitation:* Sleeps after 5 min inactivity; requires pre-flight wake via `/health` (~10–15s cold start). |
| **Cloudflare Tunnel (`cloudflared`)** | **₹0** | **NO** | **YES** (`wss://`) | • Developer runs `npm run relay` locally and exposes via `cloudflared tunnel`.<br>• Zero cold start, zero latency overhead.<br>• *Limitation:* Host PC must stay awake while players are active. |
| **Cloudflare Workers** | Ineligible | N/A | NO (Stateless) | • Free tier is stateless V8; cannot run Node `http`/`ws`.<br>• Stateful WebSocket rooms require **Durable Objects** ($5/mo paid plan). **Rejected for ₹0 budget.** |
| **Render / Koyeb** | Variable | Regional / Phone | YES | • Free tiers frequently demand credit cards or SMS verification in certain jurisdictions. Suspends instances after inactivity. |
| **Heroku / Railway / Fly.io** | Paid | YES | YES | • No genuine ₹0 tier without active credit card or upfront deposit. **Rejected.** |

**Recommended ₹0 Strategy:** Primary recommendation is **GitHub Pages** for static hosting paired with a **Glitch** or **Cloudflare Quick Tunnel** relay.

---

## 6. Agreed Development Roadmap

```
Phase 1: Master Specification & Audit Consolidation [CURRENT]
   ↳ Consolidate architecture, foundation, audit findings, and roadmap.
   ↳ Strict preservation of existing working code.

Phase 2: Live Combat-Command Prototype (Mode B)
   ↳ Implement print-based ordinary combat commands in Python worker.
   ↳ Command queue, execution cadence, and diminishing-return throttling.
   ↳ Retain keyboard controls alongside script execution.

Phase 3: Timed Challenge Mechanics & Penalties
   ↳ Timeout consequences (shield loss + opponent counter-attack).
   ↳ Implement Skip button with penalty and intermediate+ question selection.
   ↳ Enforce single-penalty and stale-submission protections.

Phase 4: Offline Bot Training & Question Expansion
   ↳ Rule-based offline training bots (predictable to reactive tiers).
   ↳ Expand question dataset using validated templates across all 6 topics.
   ↳ Deterministic offline test harness verification.

Phase 5: Combat Balance Calibration & Telemetry Tuning
   ↳ Controlled playtesting of damage values, cooldowns, and shield recovery.
   ↳ Tune action queue depths and diminishing return multipliers.
   ↳ Full regression testing across layout, combat, and Python execution.

Phase 6: Cross-Network Multiplayer Implementation
   ↳ Add "Copy Invite Link" control with automatic role assignment.
   ↳ Implement defensive combat arbitration and HP state reconciliation.
   ↳ Configure production public WSS relay endpoint (₹0 budget).
   ↳ Perform live cross-device verification across separate physical networks.

Phase 7: Offline Support & Release Readiness
   ↳ Cache static assets and Pyodide runtime for offline play.
   ↳ Security audit of WebSocket packets and sanitize inputs.
   ↳ Final release documentation and deployment guidelines.
```

---

## 7. Constraints & Preservation Rules

1. **₹0 Budget Guarantee:** Zero paid services, no credit card registrations, no billing trials.
2. **Architectural Non-Destruction:** Never replace working implementations wholesale; apply targeted, modular enhancements.
3. **Subproject Isolation:** The animation repository at `D:\github_projects\anime` is strictly read-only and must never be modified.
4. **Authority Boundary:** The Pyodide Web Worker and visual Animation Engine remain strictly unprivileged. Damage, HP decrementing, and hit registration belong exclusively to the authoritative combat engine.
5. **No Premature Claims:** Features in Phases 2–7 are documented as proposed roadmaps; only Phase 1 assets are documented as implemented.

---

*End of Master Project Specification.*
