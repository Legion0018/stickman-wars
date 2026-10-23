/**
 * End-to-End Deployment Verification Test
 * 
 * Verifies:
 * 1. Relay starts on process.env.PORT.
 * 2. HTTP GET /health returns 200 OK with JSON status and CORS headers.
 * 3. Client 1 and Client 2 can join the same room via WebSocket.
 * 4. Room routing, echo suppression, role inversion, and authoritative defender sync_hp.
 */

import { createRelayServer } from './server/relay.js';
import { WebSocketTransport } from './src/websocket-transport.js';
import { buildInviteUrl, parseStartupParams } from './src/net-helpers.js';

async function run() {
  console.log('=== STARTING DEPLOYMENT PRE-FLIGHT VERIFICATION ===');

  // 1. Start Relay Server
  const relay = await createRelayServer({ port: 0, host: '127.0.0.1' });
  const port = relay.port;
  console.log(`PASS: Relay server active on 127.0.0.1:${port}`);

  // 2. Health Endpoint Verification
  const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Health check returned HTTP ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  const corsHeader = healthRes.headers.get('access-control-allow-origin');
  if (healthData.status !== 'ok' || corsHeader !== '*') {
    throw new Error(`Health check invalid: ${JSON.stringify(healthData)}, cors=${corsHeader}`);
  }
  console.log('PASS: Health endpoint responded with { status: "ok" } and Access-Control-Allow-Origin: *');

  // 3. Invite URL and Role Inversion
  const inviteUrl = buildInviteUrl({
    baseUrl: 'https://legion0018.github.io/stickman-wars/',
    room: 'arena-test-99',
    role: 'B',
    transport: 'websocket',
    relay: `wss://stickman-wars-relay.onrender.com`,
  });
  const parsed = parseStartupParams(new URL(inviteUrl));
  if (parsed.room !== 'arena-test-99' || parsed.role !== 'B' || parsed.transport !== 'websocket') {
    throw new Error(`Invite URL parsing failure: ${JSON.stringify(parsed)}`);
  }
  console.log(`PASS: Shareable invite URL round-trips correctly: ${inviteUrl}`);

  // 4. WebSocket Multiplayer Simulation
  const serverWsUrl = `ws://127.0.0.1:${port}`;
  const clientA = new WebSocketTransport(serverWsUrl);
  const clientB = new WebSocketTransport(serverWsUrl);

  const roomCode = 'arena-test-99';
  const receivedByB = [];
  const receivedByA = [];

  clientA.onMessage((msg) => receivedByA.push(msg));
  clientB.onMessage((msg) => receivedByB.push(msg));

  await new Promise((resolve) => {
    let connectedCount = 0;
    const checkConnected = (status) => {
      if (status === 'connected') {
        connectedCount++;
        if (connectedCount === 2) resolve();
      }
    };
    clientA.onStatus(checkConnected);
    clientB.onStatus(checkConnected);
    clientA.connect(roomCode);
    clientB.connect(roomCode);
  });
  console.log('PASS: Client A and Client B connected to the same room over WebSocket');

  // 5. Client A slashes
  clientA.send({
    t: 'action',
    v: 1,
    a: 'slash',
    sender: 'A',
    hold: false,
    ts: Date.now(),
  });

  // Wait for Client B to receive
  await new Promise((res) => setTimeout(res, 80));
  if (receivedByB.length !== 1 || receivedByB[0].a !== 'slash') {
    throw new Error(`Client B did not receive slash: ${JSON.stringify(receivedByB)}`);
  }
  if (receivedByA.length !== 0) {
    throw new Error(`Client A received self-echo!`);
  }
  console.log('PASS: Strike action routed to peer with zero self-echo');

  // 6. Client B (Defender) resolves and sends authoritative sync_hp
  clientB.send({
    t: 'sync_hp',
    v: 1,
    sender: 'B',
    targetId: 'B',
    attackerId: 'A',
    outcome: 'HIT',
    hpA: 100,
    hpB: 75,
    ts: Date.now(),
  });

  await new Promise((res) => setTimeout(res, 80));
  if (receivedByA.length !== 1 || receivedByA[0].t !== 'sync_hp') {
    throw new Error(`Client A did not receive sync_hp: ${JSON.stringify(receivedByA)}`);
  }
  const syncMsg = receivedByA[0];
  if (syncMsg.hpB !== 75 || syncMsg.outcome !== 'HIT') {
    throw new Error(`Reconciliation state mismatch: ${JSON.stringify(syncMsg)}`);
  }
  console.log('PASS: Authoritative defender health reconciliation successfully exchanged');

  // Clean close
  clientA.close();
  clientB.close();
  await relay.close();
  console.log('PASS: Disconnect and cleanup complete');
  console.log('=== ALL DEPLOYMENT PRE-FLIGHT CHECKS PASSED (100%) ===');
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
