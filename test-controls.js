import { Fighter } from './src/fighter.js';
import { LoopbackTransport } from './src/loopback-transport.js';

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

  triggerFighterAction(targetRole, actionName) {
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
      ts: performance.now(),
    };
    this.transport.send(msg);
    this.sentMessages.push(msg);
  }

  handleMessage(msg) {
    if (msg.t === 'action') {
      const actor = msg.sender === 'A' ? this.fighterA : this.fighterB;
      const opponent = msg.sender === 'A' ? this.fighterB : this.fighterA;

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

    this.triggerFighterAction(mapped.role, mapped.action);
  }

  releaseKey(code, key) {
    const mapped = getActionFromKey({ code, key });
    if (!mapped) return;
    const keyId = mapped.role + '-' + mapped.action;
    this.activeKeys.delete(keyId);

    const targetFighter = mapped.role === 'A' ? this.fighterA : this.fighterB;
    if (mapped.hold) {
      targetFighter.setHolding(mapped.action, false);
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
      console.log('PASS: Test Suite 2D - Tab 2 holding K blocks Tab 1 strike without hurt animation');

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

        tab1.close();
        tab2.close();
        console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
      }, 50);
    }, 50);
  }, 50);
}, 50);
