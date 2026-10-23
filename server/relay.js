/**
 * Stickman Wars - Room-Based WebSocket Relay Server
 * 
 * Lightweight relay routing stickman fighting game packets
 * between players in the same room.
 * 
 * Startup:
 *   npm run relay
 *   # or
 *   node server/relay.js
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

export const ROOM_CODE_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;

/**
 * Create and start a relay server instance
 * @param {object} options
 * @param {number} [options.port=8080]
 * @param {string} [options.host='0.0.0.0']
 * @returns {Promise<{ server: import('node:http').Server, wss: WebSocketServer, close: Function, port: number }>}
 */
export function createRelayServer(options = {}) {
  const port = options.port !== undefined ? options.port : 8080;
  const host = options.host || '0.0.0.0';

  const httpServer = createServer((req, res) => {
    let pathname = '/';
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch (_) {
      pathname = req.url || '/';
    }

    if (pathname === '/health' || pathname === '/health/') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Stickman Wars Relay Server is active.\n');
  });

  const wss = new WebSocketServer({ server: httpServer });

  // Map of roomCode => Set<WebSocket>
  const rooms = new Map();

  /**
   * Assign a client socket to a room
   * @param {WebSocket} ws 
   * @param {string} roomCode 
   */
  function joinRoom(ws, roomCode) {
    if (!roomCode || !ROOM_CODE_REGEX.test(roomCode)) {
      console.warn(`[Relay] Rejected connection with invalid room code: "${roomCode}"`);
      try {
        ws.send(JSON.stringify({ t: 'error', reason: 'Invalid room code' }));
      } catch (_) {}
      ws.close(4000, 'Invalid room code');
      return false;
    }

    if (ws.roomCode === roomCode && rooms.has(roomCode) && rooms.get(roomCode).has(ws)) {
      return true;
    }

    // Leave existing room if switching
    if (ws.roomCode && ws.roomCode !== roomCode) {
      leaveRoom(ws);
    }

    ws.roomCode = roomCode;
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Set());
    }
    rooms.get(roomCode).add(ws);
    console.log(`[Relay] Client joined room "${roomCode}" (${rooms.get(roomCode).size} client(s) in room)`);
    return true;
  }

  /**
   * Remove a client socket from its room
   * @param {WebSocket} ws 
   */
  function leaveRoom(ws) {
    const roomCode = ws.roomCode;
    if (!roomCode) return;

    const roomClients = rooms.get(roomCode);
    if (roomClients) {
      roomClients.delete(ws);
      console.log(`[Relay] Client left room "${roomCode}" (${roomClients.size} client(s) remaining)`);
      if (roomClients.size === 0) {
        rooms.delete(roomCode);
        console.log(`[Relay] Room "${roomCode}" is now empty and cleaned up`);
      }
    }
    ws.roomCode = null;
  }

  /**
   * Broadcast message to all other clients in the same room
   * @param {WebSocket} senderWs 
   * @param {string} rawDataString 
   */
  function relayToRoom(senderWs, rawDataString) {
    const roomCode = senderWs.roomCode;
    if (!roomCode) {
      console.warn('[Relay] Attempted to send without a joined room');
      return;
    }

    const roomClients = rooms.get(roomCode);
    if (!roomClients) return;

    for (const client of roomClients) {
      // Prevent sender from receiving its own relayed message (no self-echo)
      if (client !== senderWs && client.readyState === WebSocket.OPEN) {
        try {
          client.send(rawDataString);
        } catch (err) {
          console.error(`[Relay] Error relaying message to client in room "${roomCode}":`, err.message);
        }
      }
    }
  }

  wss.on('connection', (ws, req) => {
    // Extract room from query string or URL path if provided (e.g. /?room=fight-room-1 or /fight-room-1)
    let initialRoom = null;
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      initialRoom = parsedUrl.searchParams.get('room');
      if (!initialRoom && parsedUrl.pathname && parsedUrl.pathname.length > 1) {
        initialRoom = parsedUrl.pathname.slice(1);
      }
    } catch (_) {}

    if (initialRoom) {
      joinRoom(ws, initialRoom);
    }

    ws.on('message', (data) => {
      let msgStr;
      let msgObj;
      try {
        msgStr = typeof data === 'string' ? data : data.toString('utf8');
        msgObj = JSON.parse(msgStr);
      } catch (err) {
        console.warn('[Relay] Ignored malformed non-JSON packet from client:', err.message);
        try {
          ws.send(JSON.stringify({ t: 'error', reason: 'Malformed JSON' }));
        } catch (_) {}
        return;
      }

      if (!msgObj || typeof msgObj !== 'object') {
        return;
      }

      // Handle in-band join request
      if (msgObj.t === 'join') {
        const room = msgObj.room || initialRoom;
        joinRoom(ws, room);
        return;
      }

      // Handle in-band leave request
      if (msgObj.t === 'leave') {
        relayToRoom(ws, msgStr);
        leaveRoom(ws);
        return;
      }

      // Relay valid game packets to other peers in the room
      relayToRoom(ws, msgStr);
    });

    ws.on('close', () => {
      leaveRoom(ws);
    });

    ws.on('error', (err) => {
      console.warn('[Relay] Client socket error:', err.message);
      leaveRoom(ws);
    });
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(port, host, () => {
      const actualPort = httpServer.address().port;
      console.log(`[Relay] Server listening on ${host}:${actualPort}`);
      resolve({
        server: httpServer,
        wss,
        port: actualPort,
        rooms,
        close: () => new Promise((res) => {
          for (const client of wss.clients) {
            try { client.terminate(); } catch (_) {}
          }
          wss.close(() => {
            httpServer.close(() => res());
          });
        }),
      });
    });

    httpServer.on('error', reject);
  });
}

// Auto-start when executed directly from CLI
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const HOST = process.env.HOST || '0.0.0.0';
  createRelayServer({ port: PORT, host: HOST }).catch((err) => {
    console.error('[Relay] Failed to start relay server:', err);
    process.exit(1);
  });
}
