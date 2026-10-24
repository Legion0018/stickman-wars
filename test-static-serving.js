/**
 * Stickman Wars - Static Serving & Relay Verification Test
 * 
 * Verifies that server/relay.js serves:
 * 1. index.html on / and /index.html with text/html; charset=utf-8
 * 2. health endpoint on /health with application/json
 * 3. Static assets (style.css, src/main.js, python-poc/worker.js, config.js) with correct MIME types
 * 4. HEAD requests cleanly
 * 5. Rejects path traversal and hidden file attempts with 404
 * 6. Preserves WebSocket upgrade handling and packet exchange
 */

import { createRelayServer } from './server/relay.js';
import { WebSocket } from 'ws';
import assert from 'node:assert';

async function runTests() {
  console.log('🧪 [Test] Starting Static Serving & Relay Verification...');
  
  const testPort = 8092;
  const relay = await createRelayServer({ port: testPort, host: '127.0.0.1' });
  const baseUrl = `http://127.0.0.1:${testPort}`;
  const wsUrl = `ws://127.0.0.1:${testPort}`;

  try {
    // 1. GET /
    console.log('  Testing GET / ...');
    const resRoot = await fetch(`${baseUrl}/`);
    assert.strictEqual(resRoot.status, 200, 'GET / must return 200 OK');
    assert.match(resRoot.headers.get('content-type') || '', /text\/html/, 'GET / Content-Type must be text/html');
    const rootHtml = await resRoot.text();
    assert(rootHtml.includes('Stickman Wars'), 'GET / must contain "Stickman Wars"');
    assert(rootHtml.includes('game-canvas'), 'GET / must contain "game-canvas"');
    console.log('    ✓ GET / serves index.html correctly');

    // 2. GET /index.html
    console.log('  Testing GET /index.html ...');
    const resIndex = await fetch(`${baseUrl}/index.html`);
    assert.strictEqual(resIndex.status, 200, 'GET /index.html must return 200 OK');
    assert.match(resIndex.headers.get('content-type') || '', /text\/html/, 'GET /index.html Content-Type must be text/html');
    const indexHtml = await resIndex.text();
    assert(indexHtml.includes('game-canvas'), 'GET /index.html must contain "game-canvas"');
    console.log('    ✓ GET /index.html serves index.html correctly');

    // 3. GET /health
    console.log('  Testing GET /health ...');
    const resHealth = await fetch(`${baseUrl}/health`);
    assert.strictEqual(resHealth.status, 200, 'GET /health must return 200 OK');
    assert.match(resHealth.headers.get('content-type') || '', /application\/json/, 'GET /health Content-Type must be application/json');
    const healthJson = await resHealth.json();
    assert.strictEqual(healthJson.status, 'ok', 'healthJson.status must be "ok"');
    assert(typeof healthJson.time === 'number', 'healthJson.time must be a timestamp number');
    console.log('    ✓ GET /health returns valid JSON');

    // 4. GET /style.css
    console.log('  Testing GET /style.css ...');
    const resCss = await fetch(`${baseUrl}/style.css`);
    assert.strictEqual(resCss.status, 200, 'GET /style.css must return 200 OK');
    assert.match(resCss.headers.get('content-type') || '', /text\/css/, 'GET /style.css Content-Type must be text/css');
    const cssBody = await resCss.text();
    assert(cssBody.includes('--'), 'GET /style.css must contain CSS variables/content');
    console.log('    ✓ GET /style.css serves CSS with correct MIME type');

    // 5. GET /src/main.js
    console.log('  Testing GET /src/main.js ...');
    const resMain = await fetch(`${baseUrl}/src/main.js`);
    assert.strictEqual(resMain.status, 200, 'GET /src/main.js must return 200 OK');
    assert.match(resMain.headers.get('content-type') || '', /application\/javascript/, 'GET /src/main.js Content-Type must be javascript');
    console.log('    ✓ GET /src/main.js serves JS module with correct MIME type');

    // 6. GET /python-poc/worker.js
    console.log('  Testing GET /python-poc/worker.js ...');
    const resWorker = await fetch(`${baseUrl}/python-poc/worker.js`);
    assert.strictEqual(resWorker.status, 200, 'GET /python-poc/worker.js must return 200 OK');
    assert.match(resWorker.headers.get('content-type') || '', /application\/javascript/, 'GET /python-poc/worker.js Content-Type must be javascript');
    console.log('    ✓ GET /python-poc/worker.js serves Web Worker script');

    // 7. GET /config.js
    console.log('  Testing GET /config.js ...');
    const resConfig = await fetch(`${baseUrl}/config.js`);
    assert.strictEqual(resConfig.status, 200, 'GET /config.js must return 200 OK');
    assert.match(resConfig.headers.get('content-type') || '', /application\/javascript/, 'GET /config.js Content-Type must be javascript');
    const configBody = await resConfig.text();
    assert(configBody.includes('stickman-wars.onrender.com'), 'GET /config.js contains deployed relay URL');
    console.log('    ✓ GET /config.js serves config module');

    // 8. HEAD /
    console.log('  Testing HEAD / ...');
    const resHead = await fetch(`${baseUrl}/`, { method: 'HEAD' });
    assert.strictEqual(resHead.status, 200, 'HEAD / must return 200 OK');
    const headText = await resHead.text();
    assert.strictEqual(headText, '', 'HEAD / must have empty body');
    console.log('    ✓ HEAD / works cleanly');

    // 9. Query params on root and static assets
    console.log('  Testing Query Params (?room=xyz) ...');
    const resQueryRoot = await fetch(`${baseUrl}/?room=testroom123`);
    assert.strictEqual(resQueryRoot.status, 200, 'GET /?room=testroom123 must return 200');
    const queryHtml = await resQueryRoot.text();
    assert(queryHtml.includes('game-canvas'), 'GET /?room=testroom123 must return index.html');

    const resQueryCss = await fetch(`${baseUrl}/style.css?v=2`);
    assert.strictEqual(resQueryCss.status, 200, 'GET /style.css?v=2 must return 200');
    console.log('    ✓ Query params handled cleanly');

    // 10. Subdirectory assets (anim/rig.js)
    console.log('  Testing Subdirectory assets (anim/rig.js) ...');
    const resAnim = await fetch(`${baseUrl}/anim/rig.js`);
    assert.strictEqual(resAnim.status, 200, 'GET /anim/rig.js must return 200');
    assert.match(resAnim.headers.get('content-type') || '', /application\/javascript/, 'anim/rig.js Content-Type must be javascript');
    console.log('    ✓ Subdirectory assets served correctly');

    // 11. Sensitive internal files blocked
    console.log('  Testing Disallowed Internal Files (package.json, render.yaml, server/relay.js) ...');
    const resPkg = await fetch(`${baseUrl}/package.json`);
    assert.strictEqual(resPkg.status, 404, 'Direct GET /package.json must be blocked (404)');

    const resYaml = await fetch(`${baseUrl}/render.yaml`);
    assert.strictEqual(resYaml.status, 404, 'Direct GET /render.yaml must be blocked (404)');

    const resServer = await fetch(`${baseUrl}/server/relay.js`);
    assert.strictEqual(resServer.status, 404, 'Direct GET /server/relay.js must be blocked (404)');
    console.log('    ✓ Internal files (server code, configs) protected with 404');

    // 12. Path traversal protection
    console.log('  Testing Path Traversal Protection ...');
    const resTraversal = await fetch(`${baseUrl}/../../package.json`);
    assert.strictEqual(resTraversal.status, 404, 'Path traversal must be rejected with 404');
    console.log('    ✓ Path traversal attempt blocked (404)');

    // 13. Hidden file protection
    console.log('  Testing Hidden File Protection ...');
    const resHidden = await fetch(`${baseUrl}/.git/config`);
    assert.strictEqual(resHidden.status, 404, 'Hidden file request must be rejected with 404');
    console.log('    ✓ Hidden file attempt blocked (404)');

    // 14. WebSocket Upgrade & Room Communication
    console.log('  Testing WebSocket Relay functionality ...');
    await new Promise((resolve, reject) => {
      const room = 'verify-room-' + Date.now();
      const wsA = new WebSocket(`${wsUrl}?room=${room}`);
      const wsB = new WebSocket(`${wsUrl}?room=${room}`);

      let aOpen = false;
      let bOpen = false;

      function checkConnected() {
        if (aOpen && bOpen) {
          // Send packet from A to B
          wsA.send(JSON.stringify({ t: 'action', action: 'slash', role: 'fighter_a' }));
        }
      }

      wsA.on('open', () => { aOpen = true; checkConnected(); });
      wsB.on('open', () => { bOpen = true; checkConnected(); });

      wsB.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.t === 'action' && msg.action === 'slash') {
          wsA.close();
          wsB.close();
          resolve();
        }
      });

      wsA.on('error', reject);
      wsB.on('error', reject);

      setTimeout(() => reject(new Error('WebSocket verification timeout')), 5000);
    });
    console.log('    ✓ WebSocket connection & room routing working seamlessly');

    console.log('\n🎉 ALL STATIC SERVING & RELAY TESTS PASSED SUCCESSFULLY!');
  } finally {
    await relay.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
