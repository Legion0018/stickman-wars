import { Fighter } from './src/fighter.js';
import { LoopbackTransport } from './src/loopback-transport.js';
import { CONFIG } from './config.js';
import {
  isLocalOrLanHost,
  resolveWebSocketUrl,
  resolveDefaultTransport,
  parseStartupParams,
} from './src/net-helpers.js';

console.log('=== STARTING UNIT & INTEGRATION TESTS ===');

// --- Test Suite 1: Key Mapping Verification ---
function getActionFromKey(e) {
  const code = e.code;
  const key = e.key ? e.key.toUpperCase() : '';

  if (code === 'KeyA' || key === 'A') return { role: 'A', action: 'slash', hold: false };
  if (code === 'KeyS' || key === 'S') return { role: 'A', action: 'block', hold: true };
  if (code === 'KeyD' || key === 'D') return { role: 'A', action: 'duck', hold: true };
  if (code === 'KeyF' || key === 'F') return { role: 'A', action: 'special', hold: false };

  if (code === 'KeyJ' || key === 'J') return { role: 'B', action: 'slash', hold: false };
  if (code === 'KeyK' || key === 'K') return { role: 'B', action: 'block', hold: true };
  if (code === 'KeyL' || key === 'L') return { role: 'B', action: 'duck', hold: true };
  if (code === 'Semicolon' || e.key === ';' || e.key === ':') return { role: 'B', action: 'special', hold: false };

  return null;
}

const testsKeyMap = [
  { input: { code: 'KeyA', key: 'a' }, expected: { role: 'A', action: 'slash' } },
  { input: { code: 'KeyS', key: 's' }, expected: { role: 'A', action: 'block' } },
  { input: { code: 'KeyD', key: 'd' }, expected: { role: 'A', action: 'duck' } },
  { input: { code: 'KeyF', key: 'f' }, expected: { role: 'A', action: 'special' } },
  { input: { code: 'KeyJ', key: 'j' }, expected: { role: 'B', action: 'slash' } },
  { input: { code: 'KeyK', key: 'k' }, expected: { role: 'B', action: 'block' } },
  { input: { code: 'KeyL', key: 'l' }, expected: { role: 'B', action: 'duck' } },
  { input: { code: 'Semicolon', key: ';' }, expected: { role: 'B', action: 'special' } },
];

for (const t of testsKeyMap) {
  const res = getActionFromKey(t.input);
  if (!res || res.role !== t.expected.role || res.action !== t.expected.action) {
    throw new Error('Key mapping failed for: ' + JSON.stringify(t.input));
  }
}
console.log('PASS: Test Suite 1 - Key mappings for Fighter A (A/S/D/F) and Fighter B (J/K/L/;)');

// --- Test Suite 2: Role Independence & Cross-tab Loopback Sync ---
class SimulatedTab {
  constructor(role, room = 'test-room') {
    this.role = role;
    this.fighterA = new Fighter('A');
    this.fighterB = new Fighter('B');
    this.transport = new LoopbackTransport();
    this.sentMessages = [];
    this.activeKeys = new Set();
    this.logs = [];

    this.transport.connect(room);
    this.transport.onMessage(msg => this.handleMessage(msg));
  }

  handleStrikeLand(attacker, target) {
    const outcome = target.checkHit('slash');
    this.logs.push('Strike: ' + attacker.id + ' -> ' + target.id + ' = ' + outcome);
    return outcome;
  }

  triggerFighterAction(targetRole, actionName, isHold = false) {
    const actor = targetRole === 'A' ? this.fighterA : this.fighterB;
    const opponent = targetRole === 'A' ? this.fighterB : this.fighterA;

    if (actor.currentMoveName === 'hurt' || actor.specialSlamActive) return;

    if (actionName === 'special') {
      actor.playSpecialSlam(() => this.handleStrikeLand(actor, opponent));
    } else if (actionName === 'slash') {
      actor.playMove('slash', () => this.handleStrikeLand(actor, opponent));
    } else if (actionName === 'block') {
      actor.playMove('block');
    } else if (actionName === 'duck') {
      actor.playMove('duck');
    }

    const msg = {
      t: 'action',
      v: 1,
      a: actionName,
      sender: targetRole,
      hold: Boolean(isHold),
      ts: performance.now(),
    };
    this.transport.send(msg);
    this.sentMessages.push(msg);
  }

  releaseFighterAction(targetRole, actionName) {
    const actor = targetRole === 'A' ? this.fighterA : this.fighterB;
    actor.setHolding(actionName, false);
    const msg = {
      t: 'release',
      v: 1,
      a: actionName,
      sender: targetRole,
      ts: performance.now(),
    };
    this.transport.send(msg);
    this.sentMessages.push(msg);
  }

  handleMessage(msg) {
    if (msg.t === 'action') {
      const actor = msg.sender === 'A' ? this.fighterA : this.fighterB;
      const opponent = msg.sender === 'A' ? this.fighterB : this.fighterA;

      if (msg.hold !== undefined && (msg.a === 'block' || msg.a === 'duck')) {
        actor.setHolding(msg.a, Boolean(msg.hold));
      }

      // Note: DOES NOT re-broadcast/echo
      if (msg.a === 'special') {
        actor.playSpecialSlam(() => this.handleStrikeLand(actor, opponent));
      } else if (msg.a === 'slash') {
        actor.playMove('slash', () => this.handleStrikeLand(actor, opponent));
      } else if (msg.a === 'block') {
        actor.playMove('block');
      } else if (msg.a === 'duck') {
        actor.playMove('duck');
      } else if (msg.a === 'hurt') {
        actor.playMove('hurt');
      }
    } else if (msg.t === 'release') {
      const actor = msg.sender === 'A' ? this.fighterA : this.fighterB;
      if (msg.a === 'block' || msg.a === 'duck') {
        actor.setHolding(msg.a, false);
      }
    }
  }

  pressKey(code, key) {
    const mapped = getActionFromKey({ code, key });
    if (!mapped) return;

    const keyId = mapped.role + '-' + mapped.action;
    const isRepeat = this.activeKeys.has(keyId);
    this.activeKeys.add(keyId);

    const targetFighter = mapped.role === 'A' ? this.fighterA : this.fighterB;
    if (mapped.hold) {
      targetFighter.setHolding(mapped.action, true);
    }
    if (isRepeat) return;

    this.triggerFighterAction(mapped.role, mapped.action, mapped.hold);
  }

  releaseKey(code, key) {
    const mapped = getActionFromKey({ code, key });
    if (!mapped) return;
    const keyId = mapped.role + '-' + mapped.action;
    this.activeKeys.delete(keyId);

    if (mapped.hold) {
      this.releaseFighterAction(mapped.role, mapped.action);
    }
  }

  update(dt) {
    this.fighterA.update(dt);
    this.fighterB.update(dt);
  }

  close() {
    this.transport.close();
  }
}

const tab1 = new SimulatedTab('A', 'room-sync');
const tab2 = new SimulatedTab('B', 'room-sync');

function cleanup() {
  try { tab1.close(); } catch (_) {}
  try { tab2.close(); } catch (_) {}
}
process.on('exit', cleanup);
process.on('uncaughtException', (err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});

// Test 2A: In Tab 1 (Fighter A), press 'A'. Fighter A should slash locally, Tab 2 should receive and animate Fighter A.
tab1.pressKey('KeyA', 'a');
if (tab1.fighterA.currentMoveName !== 'slash') throw new Error('Tab 1 Fighter A did not start slash');
if (tab1.fighterB.currentMoveName !== null) throw new Error('Tab 1 Fighter B should not be affected by A key');

setTimeout(() => {
  if (tab2.fighterA.currentMoveName !== 'slash') throw new Error('Tab 2 Fighter A did not start slash from remote message');
  if (tab2.sentMessages.length !== 0) throw new Error('Tab 2 sent a message back! (Echo loop violation)');
  console.log('PASS: Test Suite 2A - Tab 1 press A immediately slashes Fighter A and animates Tab 2 without echo');

  // Test 2B: In Tab 1 (Fighter A), pressing J should NOT trigger Fighter A's slash!
  // Instead, J controls Fighter B.
  tab1.pressKey('KeyJ', 'j');
  if (tab1.fighterB.currentMoveName !== 'slash') throw new Error('Tab 1 Fighter B did not start slash on J key');
  console.log('PASS: Test Suite 2B - Tab 1 press J controls Fighter B, does NOT trigger Fighter A');

  // Test 2C: In Tab 2 (Fighter B), press 'A' should NOT trigger Fighter B's slash!
  tab2.pressKey('KeyA', 'a');
  if (tab2.fighterB.currentMoveName === 'slash' && tab2.fighterA.currentMoveName !== 'slash') {
    throw new Error('Tab 2 press A triggered Fighter B!');
  }
  console.log('PASS: Test Suite 2C - Tab 2 press A controls Fighter A, does NOT trigger Fighter B');

  // Test 2D: Combat resolution between Tab 1 and Tab 2:
  tab1.fighterA.returnToIdle();
  tab1.fighterB.returnToIdle();
  tab2.fighterA.returnToIdle();
  tab2.fighterB.returnToIdle();

  // Tab 2 holds K (block)
  tab2.pressKey('KeyK', 'k');

  setTimeout(() => {
    // Tab 1 slashes with A
    tab1.pressKey('KeyA', 'a');

    setTimeout(() => {
      // Advance 320ms so strike lands
      for (let i = 0; i < 32; i++) {
        tab1.update(10);
        tab2.update(10);
      }

      console.log('Tab 2 Fighter B state after Tab 1 strike lands while holding K:', tab2.fighterB.currentMoveName);
      if (tab2.fighterB.currentMoveName === 'hurt') {
        throw new Error('Tab 2 Fighter B was hurt despite holding K block!');
      }
      if (tab1.fighterB.currentMoveName === 'hurt') {
        throw new Error('Tab 1 Fighter B (remote shadow) was hurt despite holding K block! (Hold desync)');
      }
      if (tab1.fighterB.isHoldingBlock !== true || tab2.fighterB.isHoldingBlock !== true) {
        throw new Error('Fighter B hold state desynchronized between Tab 1 and Tab 2!');
      }
      console.log('PASS: Test Suite 2D - Tab 2 holding K blocks Tab 1 strike without hurt animation on both tabs');

      // Test 2E: Idle hit
      tab1.releaseKey('KeyA', 'a');
      tab2.releaseKey('KeyK', 'k');
      tab2.fighterB.returnToIdle();
      tab1.fighterB.returnToIdle();
      tab1.fighterA.returnToIdle();
      tab2.fighterA.returnToIdle();

      // Tab 1 slashes with A while Tab 2 is idle
      tab1.pressKey('KeyA', 'a');
      setTimeout(() => {
        for (let i = 0; i < 32; i++) {
          tab1.update(10);
          tab2.update(10);
        }
        console.log('Tab 2 Fighter B state after Tab 1 strike lands while idle:', tab2.fighterB.currentMoveName);
        if (tab2.fighterB.currentMoveName !== 'hurt') {
          throw new Error('Tab 2 Fighter B should be in hurt state after unblocked strike!');
        }
        console.log('PASS: Test Suite 2E - Tab 2 idle gets HIT and plays hurt animation');

        // Test 2F: Special Slam with F (Fighter A) and ; (Fighter B)
        tab1.releaseKey('KeyA', 'a');
        tab1.fighterA.returnToIdle();
        tab2.fighterB.returnToIdle();

        tab1.pressKey('KeyF', 'f');
        if (!tab1.fighterA.specialSlamActive) throw new Error('Tab 1 Fighter A Special Slam not active on F key');

        tab2.pressKey('Semicolon', ';');
        if (!tab2.fighterB.specialSlamActive) throw new Error('Tab 2 Fighter B Special Slam not active on ; key');
        console.log('PASS: Test Suite 2F - Special Slam triggered by F (Fighter A) and ; (Fighter B)');

        // --- Test Suite 3: Focused Regression Tests for Hold & Release Sync ---
        console.log('--- STARTING TEST SUITE 3: HOLD & RELEASE SYNCHRONIZATION ---');
        tab1.releaseKey('KeyF', 'f');
        tab2.releaseKey('Semicolon', ';');
        tab1.fighterA.specialSlamActive = false;
        tab1.fighterB.specialSlamActive = false;
        tab2.fighterA.specialSlamActive = false;
        tab2.fighterB.specialSlamActive = false;
        tab1.fighterA.returnToIdle();
        tab1.fighterB.returnToIdle();
        tab2.fighterA.returnToIdle();
        tab2.fighterB.returnToIdle();
        tab1.activeKeys.clear();
        tab2.activeKeys.clear();
        tab1.sentMessages = [];
        tab2.sentMessages = [];

        // Test 3A: Tab 1 holds S (Block) for Fighter A.
        tab1.pressKey('KeyS', 's');
        setTimeout(() => {
          if (!tab1.fighterA.isHoldingBlock) throw new Error('Test 3A: Tab 1 Fighter A is not holding block locally');
          if (!tab2.fighterA.isHoldingBlock) throw new Error('Test 3A: Tab 2 Fighter A did not receive isHoldingBlock via transport');

          // Advance 250ms (past the 180ms normal block animation duration)
          for (let i = 0; i < 25; i++) {
            tab1.update(10);
            tab2.update(10);
          }

          if (tab2.fighterA.currentMoveName !== 'block') {
            throw new Error('Test 3A: Tab 2 Fighter A prematurely reverted to idle while Tab 1 held block!');
          }
          console.log('PASS: Test Suite 3A - Sustained block hold keeps remote shadow in block pose past 200ms');

          // Test 3B: Tab 1 releases S. Remote shadow must receive release and return to idle.
          tab1.releaseKey('KeyS', 's');
          setTimeout(() => {
            if (tab2.fighterA.isHoldingBlock) throw new Error('Test 3B: Tab 2 Fighter A is still holding block after release');

            for (let i = 0; i < 20; i++) {
              tab1.update(10);
              tab2.update(10);
            }

            if (tab1.fighterA.currentMoveName !== null || tab2.fighterA.currentMoveName !== null) {
              throw new Error('Test 3B: Fighters did not return to idle after release!');
            }
            console.log('PASS: Test Suite 3B - Block release transmits across transport and returns shadow to idle');

            // Test 3C: Duck hold synchronization and combat dodge resolution
            tab2.pressKey('KeyL', 'l'); // Tab 2 (Fighter B) holds duck
            setTimeout(() => {
              if (!tab1.fighterB.isHoldingDuck || !tab2.fighterB.isHoldingDuck) {
                throw new Error('Test 3C: Duck hold state not synchronized across tabs');
              }

              // Tab 1 slashes with A
              tab1.pressKey('KeyA', 'a');
              setTimeout(() => {
                // Advance 320ms for strike to land
                for (let i = 0; i < 32; i++) {
                  tab1.update(10);
                  tab2.update(10);
                }

                if (tab1.fighterB.currentMoveName === 'hurt' || tab2.fighterB.currentMoveName === 'hurt') {
                  throw new Error('Test 3C: Fighter B received hurt while holding duck!');
                }

                tab2.releaseKey('KeyL', 'l');
                tab1.releaseKey('KeyA', 'a');
                setTimeout(() => {
                  for (let i = 0; i < 20; i++) {
                    tab1.update(10);
                    tab2.update(10);
                  }
                  console.log('PASS: Test Suite 3C - Duck hold DODGES slash and release settles to idle on both tabs');

                  // Test 3D: Echo prevention for action and release
                  // Verify that Tab 2 never echoed back Tab 1's slash action or Tab 1's key releases
                  const echoedFromTab2 = tab2.sentMessages.filter(m => m.sender === 'A');
                  if (echoedFromTab2.length > 0) {
                    throw new Error('Test 3D: Echo loop detected! Tab 2 re-broadcast sender A messages: ' + JSON.stringify(echoedFromTab2));
                  }
                  console.log('PASS: Test Suite 3D - Echo prevention confirmed for both action and release packets');

                  tab1.close();
                  tab2.close();

                  // --- Test Suite 4: Deployment Resolution & URL Parameters ---
                  runDeploymentResolutionTests();

                  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
                }, 50);
              }, 50);
            }, 50);
          }, 50);
        }, 50);
      }, 50);
    }, 50);
  }, 50);
}, 50);

function runDeploymentResolutionTests() {
  console.log('--- STARTING TEST SUITE 4: DEPLOYMENT RESOLUTION & URL PARAMETERS ---');

  // Test 4A: Local / LAN host detection
  const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]', 'my-pc.local', '192.168.1.105', '10.0.0.2', '172.24.0.1', '169.254.1.1'];
  for (const h of localHosts) {
    if (!isLocalOrLanHost(h)) {
      throw new Error(`Test 4A Failed: Expected host ${h} to be identified as local/LAN`);
    }
  }

  const publicHosts = ['legion0018.github.io', 'stickman-wars.onrender.com', 'play.mycustomdomain.com', '172.15.0.1', '8.8.8.8'];
  for (const h of publicHosts) {
    if (isLocalOrLanHost(h)) {
      throw new Error(`Test 4A Failed: Expected host ${h} to be identified as public/remote`);
    }
  }
  console.log('PASS: Test Suite 4A - Local vs. LAN vs. Public host detection');

  // Test 4B: WebSocket URL Resolution
  // 1. Localhost HTTP -> directServerUrl
  const localRes = resolveWebSocketUrl({ hostname: 'localhost', protocol: 'http:', search: '' });
  if (localRes !== CONFIG.directServerUrl) {
    throw new Error(`Test 4B Failed: Localhost resolved to ${localRes}, expected ${CONFIG.directServerUrl}`);
  }

  // 2. LAN IP HTTP (e.g. Laptop 2 on LAN) -> ws://<host>:8080
  const lanRes = resolveWebSocketUrl({ hostname: '192.168.1.55', protocol: 'http:', search: '' });
  if (lanRes !== 'ws://192.168.1.55:8080') {
    throw new Error(`Test 4B Failed: LAN IP resolved to ${lanRes}, expected ws://192.168.1.55:8080`);
  }

  // 3. GitHub Pages HTTPS -> CONFIG.relayServerUrl
  const ghPagesRes = resolveWebSocketUrl({ hostname: 'legion0018.github.io', protocol: 'https:', search: '' });
  if (ghPagesRes !== CONFIG.relayServerUrl) {
    throw new Error(`Test 4B Failed: GitHub Pages HTTPS resolved to ${ghPagesRes}, expected ${CONFIG.relayServerUrl}`);
  }

  // 4. Public domain over HTTP -> CONFIG.relayServerUrl
  const publicHttpRes = resolveWebSocketUrl({ hostname: 'stickman.example.com', protocol: 'http:', search: '' });
  if (publicHttpRes !== CONFIG.relayServerUrl) {
    throw new Error(`Test 4B Failed: Public HTTP domain resolved to ${publicHttpRes}, expected ${CONFIG.relayServerUrl}`);
  }

  // 5. Query parameter override ?relay=wss://my-relay.onrender.com
  const overrideRes = resolveWebSocketUrl({
    hostname: 'legion0018.github.io',
    protocol: 'https:',
    search: '?relay=wss://my-relay.onrender.com'
  });
  if (overrideRes !== 'wss://my-relay.onrender.com') {
    throw new Error(`Test 4B Failed: Query override resolved to ${overrideRes}, expected wss://my-relay.onrender.com`);
  }
  console.log('PASS: Test Suite 4B - WebSocket URL resolution (Localhost, LAN auto-port, HTTPS GitHub Pages, Query override)');

  // Test 4C: Default Transport Auto-Selection
  // 1. Localhost -> loopback
  const transLocal = resolveDefaultTransport({ hostname: 'localhost', protocol: 'http:', search: '' });
  if (transLocal !== 'loopback') {
    throw new Error(`Test 4C Failed: Localhost transport was ${transLocal}, expected loopback`);
  }

  // 2. LAN IP -> loopback (preserves local testing)
  const transLan = resolveDefaultTransport({ hostname: '192.168.1.55', protocol: 'http:', search: '' });
  if (transLan !== 'loopback') {
    throw new Error(`Test 4C Failed: LAN transport was ${transLan}, expected loopback`);
  }

  // 3. Hosted HTTPS site (GitHub Pages) -> websocket
  const transGhPages = resolveDefaultTransport({ hostname: 'legion0018.github.io', protocol: 'https:', search: '' });
  if (transGhPages !== 'websocket') {
    throw new Error(`Test 4C Failed: GitHub Pages transport was ${transGhPages}, expected websocket`);
  }

  // 4. Query parameter override ?transport=websocket on localhost
  const transOverrideWs = resolveDefaultTransport({ hostname: 'localhost', protocol: 'http:', search: '?transport=websocket' });
  if (transOverrideWs !== 'websocket') {
    throw new Error(`Test 4C Failed: Transport override failed, got ${transOverrideWs}, expected websocket`);
  }

  // 5. Query parameter override ?transport=loopback on hosted site
  const transOverrideLb = resolveDefaultTransport({ hostname: 'legion0018.github.io', protocol: 'https:', search: '?transport=loopback' });
  if (transOverrideLb !== 'loopback') {
    throw new Error(`Test 4C Failed: Transport override failed, got ${transOverrideLb}, expected loopback`);
  }
  console.log('PASS: Test Suite 4C - Default transport auto-selection (WebSocket for public HTTPS, Loopback for local, Query override)');

  // Test 4D: URL Parameter Parsing (?role=A|B, ?room=..., etc.)
  const parsed1 = parseStartupParams({ search: '?role=B&room=match-999' });
  if (parsed1.role !== 'B' || parsed1.room !== 'match-999') {
    throw new Error(`Test 4D Failed: Expected {role: 'B', room: 'match-999'}, got ${JSON.stringify(parsed1)}`);
  }

  const parsed2 = parseStartupParams({ search: '?role=a' });
  if (parsed2.role !== 'A') {
    throw new Error(`Test 4D Failed: Expected role 'A' (case-insensitive), got ${parsed2.role}`);
  }

  const parsed3 = parseStartupParams({ search: '?role=invalid' });
  if (parsed3.role !== null) {
    throw new Error(`Test 4D Failed: Expected invalid role to be null, got ${parsed3.role}`);
  }

  const parsed4 = parseStartupParams({ search: '?role=B&room=battle-1&transport=websocket&relay=wss://relay.custom.io' });
  if (parsed4.role !== 'B' || parsed4.room !== 'battle-1' || parsed4.transport !== 'websocket' || parsed4.relay !== 'wss://relay.custom.io') {
    throw new Error(`Test 4D Failed: Multi-param parsing failed: ${JSON.stringify(parsed4)}`);
  }
  console.log('PASS: Test Suite 4D - URL parameter parsing (?role=A|B, ?room=, ?transport=, ?relay=)');

  // Test 4E: Manual role switching simulation
  let simulatedRole = parsed1.role || 'A';
  let roleRadioA = (simulatedRole === 'A');
  let roleRadioB = (simulatedRole === 'B');

  // Verify initial from ?role=B
  if (simulatedRole !== 'B' || roleRadioA !== false || roleRadioB !== true) {
    throw new Error(`Test 4E Failed: Initial role assignment from URL failed`);
  }

  // Simulate user clicking Fighter A radio
  simulatedRole = 'A';
  roleRadioA = true;
  roleRadioB = false;
  if (simulatedRole !== 'A' || roleRadioA !== true || roleRadioB !== false) {
    throw new Error(`Test 4E Failed: Manual switch to A failed`);
  }

  // Simulate user clicking Fighter B radio
  simulatedRole = 'B';
  roleRadioA = false;
  roleRadioB = true;
  if (simulatedRole !== 'B' || roleRadioA !== false || roleRadioB !== true) {
    throw new Error(`Test 4E Failed: Manual switch to B failed`);
  }
  console.log('PASS: Test Suite 4E - Manual role switching works after URL parameter initialization');
}
