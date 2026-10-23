/**
 * test-loopback-diagnostics.js
 * 
 * Verifies Loopback Transport Diagnostics & Self-Echo Invariants:
 * 1. Single-tab loopback: Sent messages increment, Received messages remain 0,
 *    and RTT samples remain 0 because BroadcastChannel explicitly does not self-echo.
 * 2. Multi-tab loopback: Two tabs in the same room exchange packets bi-directionally,
 *    incrementing Received counters and generating valid RTT latency samples upon pong receipt.
 * 3. Self-echo prevention strictly holds across both tabs.
 * 4. Authoritative combat resolution operates identically in single-tab and multi-tab loopback.
 */

import { LoopbackTransport } from './src/loopback-transport.js';
import { StatusPanel } from './src/status-panel.js';
import { Fighter } from './src/fighter.js';

console.log('=== STARTING LOOPBACK DIAGNOSTICS & TELEMETRY TESTS ===\n');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

// -----------------------------------------------------------------------------
// Test Suite 1: Single-Tab Loopback Diagnostics (Explanation of User Report)
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Single-Tab Loopback Diagnostics ---');

const panel1 = new StatusPanel();
const transport1 = new LoopbackTransport();
let receivedInSingleTab = 0;

transport1.onMessage(() => {
  receivedInSingleTab++;
  panel1.incrementReceived();
});

transport1.connect('room-single-tab');
assert(transport1.status === 'connected', 'Test 1A - Transport connects immediately');

// Simulate single-tab activity: sending hello, 5 pings, and 10 actions
transport1.send({ t: 'hello', v: 1, role: 'A' });
panel1.incrementSent();

for (let i = 1; i <= 5; i++) {
  transport1.send({ t: 'ping', v: 1, n: i, ts: Date.now() });
  panel1.incrementSent();
}

for (let i = 1; i <= 10; i++) {
  transport1.send({ t: 'action', v: 1, a: 'slash', sender: 'A', hold: false, ts: Date.now() });
  panel1.incrementSent();
}

// Wait 50ms for any potential asynchronous events
setTimeout(() => {
  assert(panel1.sentCount === 16, `Test 1B - Sent messages tracked correctly (expected 16, got ${panel1.sentCount})`);
  assert(panel1.recvCount === 0, `Test 1C - Received messages is 0 (no peer tab exists, no self-echo) (got ${panel1.recvCount})`);
  assert(receivedInSingleTab === 0, 'Test 1D - Transport message callback was never triggered by own messages');
  assert(panel1.rttSamples.length === 0, 'Test 1E - RTT samples count is 0 because no peer tab replied with pong');
  assert(panel1.latestRtt === null, 'Test 1F - Latest RTT remains null / N/A in single-tab mode');

  transport1.close();

  // -----------------------------------------------------------------------------
  // Test Suite 2: Two-Tab Loopback Communication & Latency Measurement
  // -----------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Two-Tab Loopback Bi-Directional Exchange ---');

  const tab1Panel = new StatusPanel();
  const tab2Panel = new StatusPanel();
  const tab1Transport = new LoopbackTransport();
  const tab2Transport = new LoopbackTransport();

  const tab1Received = [];
  const tab2Received = [];

  tab1Transport.onMessage((msg) => {
    tab1Received.push(msg);
    tab1Panel.incrementReceived();
    if (msg.t === 'pong') {
      const rtt = Math.max(0, Date.now() - msg.ts);
      tab1Panel.recordPong(rtt);
    }
  });

  tab2Transport.onMessage((msg) => {
    tab2Received.push(msg);
    tab2Panel.incrementReceived();
    if (msg.t === 'ping') {
      tab2Transport.send({ t: 'pong', v: 1, n: msg.n, ts: msg.ts });
      tab2Panel.incrementSent();
    }
  });

  tab1Transport.connect('room-two-tab');
  tab2Transport.connect('room-two-tab');

  // Tab 1 sends a ping
  const pingTs = Date.now();
  tab1Transport.send({ t: 'ping', v: 1, n: 1, ts: pingTs });
  tab1Panel.incrementSent();

  // Tab 1 sends a slash action
  tab1Transport.send({ t: 'action', v: 1, a: 'slash', sender: 'A', hold: false, ts: Date.now() });
  tab1Panel.incrementSent();

  setTimeout(() => {
    // Verify Tab 2 received Tab 1's ping and slash
    assert(tab2Panel.recvCount === 2, `Test 2A - Tab 2 received Tab 1 messages (expected 2, got ${tab2Panel.recvCount})`);
    assert(tab2Received.some(m => m.t === 'ping'), 'Test 2B - Tab 2 received ping message');
    assert(tab2Received.some(m => m.t === 'action' && m.a === 'slash'), 'Test 2C - Tab 2 received slash action');

    // Verify Tab 1 received Tab 2's pong
    assert(tab1Panel.recvCount === 1, `Test 2D - Tab 1 received pong from Tab 2 (expected 1, got ${tab1Panel.recvCount})`);
    assert(tab1Received.some(m => m.t === 'pong'), 'Test 2E - Tab 1 received pong response');

    // Verify Tab 1 latency statistics
    assert(tab1Panel.rttSamples.length === 1, `Test 2F - Tab 1 recorded RTT sample (count: ${tab1Panel.rttSamples.length})`);
    assert(typeof tab1Panel.latestRtt === 'number' && tab1Panel.latestRtt >= 0, `Test 2G - Tab 1 has valid latest RTT metric (${tab1Panel.latestRtt} ms)`);
    assert(tab1Panel.avgRtt >= 0, 'Test 2H - Tab 1 has valid average RTT metric');

    // -----------------------------------------------------------------------------
    // Test Suite 3: Self-Echo Prevention Invariant
    // -----------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Self-Echo Prevention Invariant ---');

    const selfEchoOnTab1 = tab1Received.filter(m => m.sender === 'A' || m.t === 'ping');
    assert(selfEchoOnTab1.length === 0, 'Test 3A - Tab 1 never received its own ping or action (zero self-echo)');

    const selfEchoOnTab2 = tab2Received.filter(m => m.t === 'pong');
    assert(selfEchoOnTab2.length === 0, 'Test 3B - Tab 2 never received its own pong (zero self-echo)');

    // -----------------------------------------------------------------------------
    // Test Suite 4: Authoritative Combat Resolution Invariance
    // -----------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Authoritative Combat Resolution Invariance ---');

    const fighterA = new Fighter('A');
    const fighterB = new Fighter('B');

    // Authoritative checkHit determines all outcomes
    const outcomeIdle = fighterB.checkHit('slash');
    assert(outcomeIdle === 'HIT', 'Test 4A - Idle fighter checkHit resolves HIT');
    assert(fighterB.currentMoveName === 'hurt', 'Test 4B - HIT automatically triggers hurt recoil');

    fighterB.returnToIdle();
    fighterB.setHolding('block', true);
    const outcomeBlock = fighterB.checkHit('slash');
    assert(outcomeBlock === 'BLOCKED', 'Test 4C - Holding block checkHit resolves BLOCKED');
    assert(fighterB.currentMoveName !== 'hurt', 'Test 4D - BLOCKED does not trigger hurt recoil');

    fighterB.setHolding('block', false);
    fighterB.setHolding('duck', true);
    const outcomeDuck = fighterB.checkHit('slash');
    assert(outcomeDuck === 'DODGED', 'Test 4E - Holding duck checkHit resolves DODGED');
    assert(fighterB.currentMoveName !== 'hurt', 'Test 4F - DODGED does not trigger hurt recoil');

    tab1Transport.close();
    tab2Transport.close();

    console.log('\n=== ALL LOOPBACK DIAGNOSTICS & TELEMETRY TESTS PASSED (100% GREEN) ===');
  }, 100);
}, 60);
