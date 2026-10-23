/**
 * WebSocket Transport
 * 
 * Extends Transport using standard WebSockets to communicate with
 * the Stickman Wars Room Relay Server for genuine cross-device multiplayer.
 */

import { Transport } from './transport.js';

export class WebSocketTransport extends Transport {
  /**
   * @param {string} [serverUrl="ws://localhost:8080"] 
   */
  constructor(serverUrl = "ws://localhost:8080") {
    super();
    this.name = "WebSocket Relay (Cross-Device)";
    this.serverUrl = serverUrl;
    this.socket = null;
    this.sendQueue = [];
    this._connectionAttempt = 0;
    this._userClosed = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 3;
    this._reconnectTimer = null;
  }

  /**
   * Connect to the specified room code
   * @param {string} roomCode 
   * @param {boolean} [isAutoReconnect=false]
   */
  connect(roomCode, isAutoReconnect = false) {
    if (!isAutoReconnect) {
      this._userClosed = false;
      this._reconnectAttempts = 0;
    }

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this.socket) {
      const prevWs = this.socket;
      this.socket = null;
      prevWs.onopen = null;
      prevWs.onmessage = null;
      prevWs.onerror = null;
      prevWs.onclose = null;
      try { prevWs.close(1000, "Reconnecting"); } catch (_) {}
    }

    this.roomCode = roomCode || "fight-room-1";
    this.emitStatus(isAutoReconnect ? "reconnecting" : "connecting");

    const attemptId = ++this._connectionAttempt;

    // Detect available WebSocket implementation
    const WebSocketCtor = (typeof globalThis !== 'undefined' && globalThis.WebSocket)
      ? globalThis.WebSocket
      : (typeof window !== 'undefined' ? window.WebSocket : null);

    if (!WebSocketCtor) {
      this.emitStatus("failed", "WebSocket API not available in this environment");
      return;
    }

    // Construct room query URL
    const separator = this.serverUrl.includes('?') ? '&' : '?';
    const wsUrl = `${this.serverUrl}${separator}room=${encodeURIComponent(this.roomCode)}`;

    try {
      const ws = new WebSocketCtor(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        if (this._connectionAttempt !== attemptId || this.socket !== ws) return;

        this._reconnectAttempts = 0;

        // Send in-band join envelope for redundancy and validation
        try {
          ws.send(JSON.stringify({ t: 'join', v: 1, room: this.roomCode }));
        } catch (_) {}

        // Flush any queued messages
        while (this.sendQueue.length > 0) {
          const queued = this.sendQueue.shift();
          try {
            ws.send(JSON.stringify(queued));
          } catch (err) {
            console.error("WebSocketTransport: Failed to flush queued message:", err);
          }
        }

        this.emitStatus("connected");
      };

      ws.onmessage = (event) => {
        if (this._connectionAttempt !== attemptId || this.socket !== ws) return;
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : JSON.parse(event.data.toString());
          this.emitMessage(data);
        } catch (err) {
          console.warn("WebSocketTransport: Failed to parse incoming packet:", err);
        }
      };

      ws.onerror = (event) => {
        if (this._connectionAttempt !== attemptId || this.socket !== ws) return;
        const reason = event.message || "WebSocket connection error";
        this.emitStatus("failed", reason);
      };

      ws.onclose = (event) => {
        if (this._connectionAttempt !== attemptId || this.socket !== ws) return;
        this.socket = null;

        if (this._userClosed) {
          this.emitStatus("disconnected", event.reason || `Connection closed (${event.code})`);
          return;
        }

        if (this.status === "connecting") {
          this.emitStatus("failed", event.reason || `Connection refused (${event.code})`);
        } else if (this.status === "connected" || this.status === "reconnecting") {
          // Attempt bounded reconnection for unexpected socket drops
          if (this._reconnectAttempts < this._maxReconnectAttempts) {
            this._reconnectAttempts++;
            const delay = Math.min(4000, 1000 * Math.pow(1.5, this._reconnectAttempts - 1));
            this.emitStatus("reconnecting", `Reconnecting (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})...`);
            this._reconnectTimer = setTimeout(() => {
              if (!this._userClosed) {
                this.connect(this.roomCode, true);
              }
            }, delay);
          } else {
            this.emitStatus("disconnected", event.reason || `Connection closed after ${this._maxReconnectAttempts} retries`);
          }
        }
      };
    } catch (err) {
      this.socket = null;
      this.emitStatus("failed", err.message || "Failed to initialize WebSocket");
    }
  }

  /**
   * Send a JSON-serializable message object
   * @param {object} messageObject 
   */
  send(messageObject) {
    // Standard WebSocket readyState values: 0 = CONNECTING, 1 = OPEN
    if (this.socket && this.socket.readyState === 1 /* OPEN */) {
      try {
        this.socket.send(JSON.stringify(messageObject));
      } catch (err) {
        console.error("WebSocketTransport send error:", err);
        this.emitStatus("failed", err.message);
      }
      return;
    }

    // Buffer outgoing messages while connection is being established
    if (this.status === "connecting" || (this.socket && this.socket.readyState === 0 /* CONNECTING */)) {
      this.sendQueue.push(messageObject);
      return;
    }

    console.warn("WebSocketTransport: Cannot send, socket is disconnected");
  }

  /**
   * Cleanly close the socket and emit disconnected
   */
  close() {
    this._userClosed = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempts = 0;
    this._connectionAttempt++;
    this.sendQueue = [];

    if (this.socket) {
      const ws = this.socket;
      this.socket = null;

      // Detach event listeners to prevent stale callbacks
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;

      try {
        if (ws.readyState === 1 /* OPEN */) {
          ws.send(JSON.stringify({ t: 'leave', v: 1, room: this.roomCode }));
        }
      } catch (_) {}

      try {
        ws.close(1000, "Client closed connection");
      } catch (err) {
        console.error("WebSocketTransport: Error closing socket:", err);
      }
    }

    this.emitStatus("disconnected");
  }
}

export default WebSocketTransport;
