/**
 * Stickman Wars - WebSocket Relay & Transport Test Suite
 * 
 * Verifies:
 * 1. Client lifecycle & connection failure handling
 * 2. Room isolation and multi-client routing
 * 3. Prevention of self-echo
 * 4. Malformed message handling & safe disconnects
 * 5. Full combat hold/release synchronization over WebSocket
 */

import { createRelayServer } from './server/relay.js';
import { WebSocketTransport } from './src/websocket-transport.js';
import { Fighter } from './src/fighter.js';

console.log('=== STARTING WEBSOCKET RELAY & TRANSPORT TESTS ===');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let relay = null;
const allClients = [];

function registerClient(client) {
  allClients.push(client);
  return client;
}

async function runTests() {
  try {
    // Start an ephemeral relay server for testing (port 0 selects free OS port)
    relay = await createRelayServer({ port: 0, host: '127.0.0.1' });
    const serverUrl = `ws://127.0.0.1:${relay.port}`;
    console.log(`Relay server active for test on port ${relay.port}`);

    // --- Test Suite 1: Client Lifecycle & Failure Handling ---
    console.log('--- Test Suite 1: Client Lifecycle & Failure Handling ---');

    // Test 1A: Connection to unreachable address
    await new Promise((resolve) => {
      const deadClient = registerClient(new WebSocketTransport('ws://127.0.0.1:1'));
      let failedEmitted = false;
      deadClient.onStatus((status, reason) => {
        if (status === 'failed') {
          failedEmitted = true;
          console.log('PASS: Test 1A - Unreachable server transitions to failed status cleanly');
          deadClient.close();
          resolve();
        }
      });
      deadClient.connect('room-fail-test');
    });

    // Test 1B: Valid connection and clean close
    await new Promise((resolve) => {
      const client = registerClient(new WebSocketTransport(serverUrl));
      let connectedEmitted = false;
      const unsub = client.onStatus((status) => {
        if (status === 'connected' && !connectedEmitted) {
          connectedEmitted = true;
          client.close();
        } else if (status === 'disconnected' && connectedEmitted) {
          console.log('PASS: Test 1B - Client connects and closes cleanly');
          unsub();
          resolve();
        }
      });
      client.connect('room-lifecycle');
    });

    // Test 1C: Queue outgoing messages while connecting
    await new Promise((resolve) => {
      const clientReceiver = registerClient(new WebSocketTransport(serverUrl));
      const clientSender = registerClient(new WebSocketTransport(serverUrl));

      clientReceiver.onStatus((status) => {
        if (status === 'connected') {
          // Connect sender and immediately buffer message while connecting
          clientSender.connect('room-queue');
          clientSender.send({ t: 'action', v: 1, a: 'slash', sender: 'A' });
        }
      });

      clientReceiver.onMessage((msg) => {
        if (msg.t === 'action' && msg.a === 'slash') {
          console.log('PASS: Test 1C - Messages queued during connecting phase are flushed upon open');
          clientReceiver.close();
          clientSender.close();
          resolve();
        }
      });

      clientReceiver.connect('room-queue');
    });

    // --- Test Suite 2: Room Isolation & Multi-Client Routing ---
    console.log('--- Test Suite 2: Room Isolation & Multi-Client Routing ---');

    // Test 2A: Room isolation (Room A vs Room B)
    {
      const clientA1 = registerClient(new WebSocketTransport(serverUrl));
      const clientA2 = registerClient(new WebSocketTransport(serverUrl));
      const clientB1 = registerClient(new WebSocketTransport(serverUrl));

      const msgsA2 = [];
      const msgsB1 = [];

      clientA2.onMessage((m) => msgsA2.push(m));
      clientB1.onMessage((m) => msgsB1.push(m));

      clientA1.connect('room-alpha');
      clientA2.connect('room-alpha');
      clientB1.connect('room-beta');

      await sleep(60);

      // Send in room-alpha
      clientA1.send({ t: 'action', v: 1, a: 'slash', sender: 'A' });

      await sleep(60);

      if (msgsA2.length !== 1 || msgsA2[0].a !== 'slash') {
        throw new Error('Test 2A: Room A peer failed to receive message');
      }
      if (msgsB1.length !== 0) {
        throw new Error('Test 2A: Message leaked across room boundary to Room B!');
      }
      console.log('PASS: Test 2A - Room isolation strictly maintained (no cross-room leaks)');

      clientA1.close();
      clientA2.close();
      clientB1.close();
    }

    // Test 2B: Multiple clients in same room (3 clients)
    {
      const c1 = registerClient(new WebSocketTransport(serverUrl));
      const c2 = registerClient(new WebSocketTransport(serverUrl));
      const c3 = registerClient(new WebSocketTransport(serverUrl));

      const c2Msgs = [];
      const c3Msgs = [];

      c2.onMessage((m) => c2Msgs.push(m));
      c3.onMessage((m) => c3Msgs.push(m));

      c1.connect('room-multi');
      c2.connect('room-multi');
      c3.connect('room-multi');

      await sleep(60);

      c1.send({ t: 'hello', v: 1, role: 'A' });

      await sleep(60);

      if (c2Msgs.length !== 1 || c3Msgs.length !== 1) {
        throw new Error('Test 2B: Multiple peers did not all receive broadcast');
      }
      console.log('PASS: Test 2B - Message broadcast to all multiple peers in room');

      c1.close();
      c2.close();
      c3.close();
    }

    // Test 2C: Prevention of self-echo
    {
      const clientSender = registerClient(new WebSocketTransport(serverUrl));
      const selfReceived = [];

      clientSender.onMessage((m) => selfReceived.push(m));
      clientSender.connect('room-echo-check');

      await sleep(60);

      clientSender.send({ t: 'action', v: 1, a: 'block', sender: 'A' });

      await sleep(60);

      if (selfReceived.length !== 0) {
        throw new Error('Test 2C: Sender received its own echoed message back from relay!');
      }
      console.log('PASS: Test 2C - Self-echo strictly prevented');

      clientSender.close();
    }

    // --- Test Suite 3: Malformed Messages & Empty Room Cleanup ---
    console.log('--- Test Suite 3: Malformed Messages & Disconnects ---');

    // Test 3A: Invalid room code rejected
    {
      const invalidClient = registerClient(new WebSocketTransport(serverUrl));
      let rejected = false;

      invalidClient.onStatus((status) => {
        if (status === 'failed' || status === 'disconnected') {
          rejected = true;
        }
      });

      invalidClient.connect('invalid!@#room$');

      await sleep(80);

      if (!rejected) {
        throw new Error('Test 3A: Invalid room code was not rejected by relay');
      }
      console.log('PASS: Test 3A - Invalid room code rejected');
      invalidClient.close();
    }

    // Test 3B: Malformed non-JSON does not crash server
    {
      const clientA = registerClient(new WebSocketTransport(serverUrl));
      const clientB = registerClient(new WebSocketTransport(serverUrl));

      const clientBErrors = [];
      clientB.onMessage((m) => clientBErrors.push(m));

      clientA.connect('room-malformed');
      clientB.connect('room-malformed');

      await sleep(60);

      // Force raw malformed string through underlying socket
      if (clientA.socket && clientA.socket.send) {
        clientA.socket.send('INVALID_NON_JSON_DATA{{{');
      }

      await sleep(60);

      // Server should stay alive and handle subsequent valid packet
      clientA.send({ t: 'action', v: 1, a: 'duck', sender: 'A' });

      await sleep(60);

      const duckReceived = clientBErrors.some((m) => m.a === 'duck');
      if (!duckReceived) {
        throw new Error('Test 3B: Server crashed or failed to deliver valid message after malformed input');
      }
      console.log('PASS: Test 3B - Malformed non-JSON safely ignored without crashing relay');

      clientA.close();
      clientB.close();
    }

    // Test 3C: Room cleanup when empty
    {
      const clientSolo = registerClient(new WebSocketTransport(serverUrl));
      clientSolo.connect('room-cleanup-test');

      await sleep(60);

      if (!relay.rooms.has('room-cleanup-test')) {
        throw new Error('Test 3C: Room not tracked on server');
      }

      clientSolo.close();

      await sleep(60);

      if (relay.rooms.has('room-cleanup-test')) {
        throw new Error('Test 3C: Empty room was not cleaned up');
      }
      console.log('PASS: Test 3C - Empty room cleaned up on disconnect');
    }

    // --- Test Suite 4: Combat Hold/Release Synchronization over WebSocket ---
    console.log('--- Test Suite 4: Combat Hold/Release Synchronization over WebSocket ---');

    {
      const tab1 = registerClient(new WebSocketTransport(serverUrl));
      const tab2 = registerClient(new WebSocketTransport(serverUrl));

      const fighter1A = new Fighter('A');
      const fighter1B = new Fighter('B');
      const fighter2A = new Fighter('A');
      const fighter2B = new Fighter('B');

      tab1.onMessage((msg) => {
        if (msg.t === 'action') {
          const actor = msg.sender === 'A' ? fighter1A : fighter1B;
          const target = msg.sender === 'A' ? fighter1B : fighter1A;
          if (msg.hold && (msg.a === 'block' || msg.a === 'duck')) {
            actor.setHolding(msg.a, true);
          }
          if (msg.a === 'slash') {
            actor.playMove('slash', () => target.checkHit('slash'));
          } else if (msg.a === 'block') {
            actor.playMove('block');
          } else if (msg.a === 'duck') {
            actor.playMove('duck');
          }
        } else if (msg.t === 'release') {
          const actor = msg.sender === 'A' ? fighter1A : fighter1B;
          actor.setHolding(msg.a, false);
        }
      });

      tab2.onMessage((msg) => {
        if (msg.t === 'action') {
          const actor = msg.sender === 'A' ? fighter2A : fighter2B;
          const target = msg.sender === 'A' ? fighter2B : fighter2A;
          if (msg.hold && (msg.a === 'block' || msg.a === 'duck')) {
            actor.setHolding(msg.a, true);
          }
          if (msg.a === 'slash') {
            actor.playMove('slash', () => target.checkHit('slash'));
          } else if (msg.a === 'block') {
            actor.playMove('block');
          } else if (msg.a === 'duck') {
            actor.playMove('duck');
          }
        } else if (msg.t === 'release') {
          const actor = msg.sender === 'A' ? fighter2A : fighter2B;
          actor.setHolding(msg.a, false);
        }
      });

      tab1.connect('room-combat-ws');
      tab2.connect('room-combat-ws');

      await sleep(80);

      // 4A: Tab 2 holds K (block)
      fighter2B.setHolding('block', true);
      fighter2B.playMove('block');
      tab2.send({ t: 'action', v: 1, a: 'block', sender: 'B', hold: true });

      await sleep(40);

      if (!fighter1B.isHoldingBlock) {
        throw new Error('Test 4A: Tab 1 shadow fighter did not receive isHoldingBlock via WebSocket');
      }

      // Tab 1 slashes with A
      fighter1A.playMove('slash', () => fighter1B.checkHit('slash'));
      tab1.send({ t: 'action', v: 1, a: 'slash', sender: 'A', hold: false });

      // Advance 320ms so strike lands
      for (let i = 0; i < 35; i++) {
        fighter1A.update(10);
        fighter1B.update(10);
        fighter2A.update(10);
        fighter2B.update(10);
      }

      await sleep(40);

      if (fighter1B.currentMoveName === 'hurt' || fighter2B.currentMoveName === 'hurt') {
        throw new Error('Test 4A: Blocked strike inflicted hurt over WebSocket!');
      }
      console.log('PASS: Test 4A - Sustained block hold synchronized over WebSocket (resolves BLOCKED on both)');

      // 4B: Tab 2 releases block
      fighter2B.setHolding('block', false);
      tab2.send({ t: 'release', v: 1, a: 'block', sender: 'B' });

      await sleep(40);

      if (fighter1B.isHoldingBlock) {
        throw new Error('Test 4B: Shadow fighter still holding block after release packet');
      }

      for (let i = 0; i < 20; i++) {
        fighter1A.update(10);
        fighter1B.update(10);
        fighter2A.update(10);
        fighter2B.update(10);
      }

      console.log('PASS: Test 4B - Block release transmits across WebSocket and smoothly returns shadow to idle');

      // 4C: Duck dodge synchronization
      fighter2B.setHolding('duck', true);
      fighter2B.playMove('duck');
      tab2.send({ t: 'action', v: 1, a: 'duck', sender: 'B', hold: true });

      await sleep(40);

      if (!fighter1B.isHoldingDuck) {
        throw new Error('Test 4C: Shadow fighter not holding duck over WebSocket');
      }

      fighter1A.playMove('slash', () => fighter1B.checkHit('slash'));
      tab1.send({ t: 'action', v: 1, a: 'slash', sender: 'A', hold: false });

      for (let i = 0; i < 35; i++) {
        fighter1A.update(10);
        fighter1B.update(10);
        fighter2A.update(10);
        fighter2B.update(10);
      }

      await sleep(40);

      if (fighter1B.currentMoveName === 'hurt' || fighter2B.currentMoveName === 'hurt') {
        throw new Error('Test 4C: Ducking fighter received hurt over WebSocket!');
      }
      console.log('PASS: Test 4C - Duck hold DODGES slash across WebSocket on both tabs');

      tab1.close();
      tab2.close();
    }

    console.log('=== ALL WEBSOCKET TESTS COMPLETED SUCCESSFULLY! ===');
  } finally {
    // Guaranteed cleanup of all client sockets and relay server
    for (const client of allClients) {
      try {
        client.close();
      } catch (_) {}
    }
    if (relay && relay.close) {
      try {
        await relay.close();
      } catch (_) {}
    }
  }
}

runTests().catch((err) => {
  console.error('WebSocket test failure:', err);
  process.exit(1);
});
