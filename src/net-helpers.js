/**
 * Stickman Wars - Network & URL Resolution Helpers
 * 
 * Provides pure helper functions for:
 * - Detecting local/LAN vs. public/remote host environments
 * - Resolving WebSocket relay URLs across local, LAN, and public HTTPS deployments
 * - Determining the default transport (websocket for public hosting, loopback for local dev)
 * - Parsing URL query parameters (?role=, ?room=, ?transport=, ?relay=)
 */

import { CONFIG } from '../config.js';

/**
 * Checks whether a hostname represents a local machine or a private LAN address.
 * Matches:
 * - localhost, 127.0.0.1, ::1
 * - *.local (mDNS)
 * - RFC 1918 private IPv4 ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
 * - Link-local: 169.254.x.x
 * 
 * @param {string|null|undefined} hostname
 * @returns {boolean}
 */
export function isLocalOrLanHost(hostname) {
  if (!hostname) return true;
  const host = String(hostname).toLowerCase().trim();

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return true;
  }
  if (host.endsWith('.local')) {
    return true;
  }

  // Check IPv4 private and link-local ranges
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4Match) {
    const o1 = Number(ipv4Match[1]);
    const o2 = Number(ipv4Match[2]);
    const o3 = Number(ipv4Match[3]);
    const o4 = Number(ipv4Match[4]);
    if (o1 <= 255 && o2 <= 255 && o3 <= 255 && o4 <= 255) {
      if (o1 === 127) return true; // Loopback
      if (o1 === 10) return true; // Class A private
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // Class B private (172.16.0.0 - 172.31.255.255)
      if (o1 === 192 && o2 === 168) return true; // Class C private (192.168.0.0 - 192.168.255.255)
      if (o1 === 169 && o2 === 254) return true; // Link-local
    }
  }

  return false;
}

/**
 * Resolves the WebSocket endpoint for client connections.
 * 
 * Rules:
 * 1. Query parameter override (?relay=wss://... or ?ws=wss://...) takes top priority.
 * 2. On public domains or HTTPS (e.g. GitHub Pages), uses config.relayServerUrl.
 * 3. On LAN IP over HTTP (e.g. Laptop 2 accessing Laptop 1 at http://192.168.1.50:8000),
 *    targets ws://<host>:8080 (or port from directServerUrl).
 * 4. On localhost development, targets config.directServerUrl (ws://localhost:8080).
 * 
 * @param {Location|object|null} locationObj
 * @param {object} [config=CONFIG]
 * @returns {string} WebSocket URL
 */
export function resolveWebSocketUrl(locationObj = (typeof window !== 'undefined' ? window.location : null), config = CONFIG) {
  const currentConfig = config || CONFIG;

  if (!locationObj || !locationObj.hostname) {
    return currentConfig.directServerUrl || 'ws://localhost:8080';
  }

  // 1. Query parameter override (?relay=... or ?ws=...)
  if (locationObj.search) {
    try {
      const params = new URLSearchParams(locationObj.search);
      const queryRelay = params.get('relay') || params.get('ws');
      if (queryRelay && queryRelay.trim()) {
        return queryRelay.trim();
      }
    } catch (_) {}
  }

  const host = String(locationObj.hostname).toLowerCase().trim();
  const isHttps = locationObj.protocol === 'https:';
  const isLanOrLocal = isLocalOrLanHost(host);

  // 2. Public hosted domain or HTTPS origin -> public relay URL
  if (isHttps || !isLanOrLocal) {
    if (host.includes('onrender.com') || host.includes('trycloudflare.com')) {
      const wsProto = isHttps ? 'wss:' : 'ws:';
      const portPart = locationObj.port ? `:${locationObj.port}` : '';
      return `${wsProto}//${host}${portPart}`;
    }
    return currentConfig.relayServerUrl || 'wss://relay.example.com';
  }

  // 3. LAN IP over HTTP -> host machine port 8080
  if (host !== 'localhost' && host !== '127.0.0.1') {
    let port = '8080';
    if (currentConfig.directServerUrl) {
      try {
        const parsed = new URL(currentConfig.directServerUrl);
        if (parsed.port) port = parsed.port;
      } catch (_) {}
    }
    return `ws://${host}:${port}`;
  }

  // 4. Localhost default
  return currentConfig.directServerUrl || 'ws://localhost:8080';
}

/**
 * Determines the initial default transport type:
 * - 'websocket' when running on a public website (GitHub Pages, custom domain, HTTPS)
 * - 'loopback' when running in local development (localhost, 127.0.0.1, LAN IP)
 * - May be explicitly overridden via ?transport=websocket or ?transport=loopback
 * 
 * @param {Location|object|null} locationObj
 * @returns {'loopback'|'websocket'}
 */
export function resolveDefaultTransport(locationObj = (typeof window !== 'undefined' ? window.location : null)) {
  if (!locationObj || !locationObj.hostname) {
    return 'loopback';
  }

  // Query parameter override (?transport=websocket or loopback)
  if (locationObj.search) {
    try {
      const params = new URLSearchParams(locationObj.search);
      const transportParam = params.get('transport');
      if (transportParam) {
        const lower = transportParam.toLowerCase().trim();
        if (lower === 'websocket' || lower === 'loopback') {
          return lower;
        }
      }
    } catch (_) {}
  }

  const host = String(locationObj.hostname).toLowerCase().trim();
  const isHttps = locationObj.protocol === 'https:';

  // Public domain or HTTPS -> default to websocket
  if (isHttps || !isLocalOrLanHost(host)) {
    return 'websocket';
  }

  // Local development -> default to loopback
  return 'loopback';
}

/**
 * Parses startup query parameters from URL search string.
 * Supports:
 * - ?role=A or ?role=B (case-insensitive)
 * - ?room=<room-code>
 * - ?transport=websocket|loopback
 * - ?relay=<url>
 * 
 * @param {Location|object|null} locationObj
 * @returns {{ role: 'A'|'B'|null, room: string|null, transport: 'websocket'|'loopback'|null, relay: string|null }}
 */
export function parseStartupParams(locationObj = (typeof window !== 'undefined' ? window.location : null)) {
  const result = {
    role: null,
    room: null,
    transport: null,
    relay: null,
  };

  if (!locationObj || !locationObj.search) {
    return result;
  }

  try {
    const params = new URLSearchParams(locationObj.search);

    const roleParam = params.get('role');
    if (roleParam) {
      const upper = roleParam.trim().toUpperCase();
      if (upper === 'A' || upper === 'B') {
        result.role = upper;
      }
    }

    const roomParam = params.get('room');
    if (roomParam && roomParam.trim()) {
      result.room = roomParam.trim();
    }

    const transParam = params.get('transport');
    if (transParam) {
      const lower = transParam.trim().toLowerCase();
      if (lower === 'websocket' || lower === 'loopback') {
        result.transport = lower;
      }
    }

    const relayParam = params.get('relay') || params.get('ws');
    if (relayParam && relayParam.trim()) {
      result.relay = relayParam.trim();
    }
  } catch (err) {
    console.warn("Failed to parse startup query parameters:", err);
  }

  return result;
}

/**
 * Builds a shareable invite URL with pre-configured room code, assigned role,
 * and optional relay endpoint.
 * 
 * @param {object} [options={}]
 * @param {string} [options.baseUrl] - Base URL (defaults to window.location.href or http://localhost:8000/)
 * @param {string} [options.room] - Room code (defaults to CONFIG.defaultRoom)
 * @param {'A'|'B'} [options.role='B'] - Target player role for the invitee
 * @param {'websocket'|'loopback'} [options.transport='websocket'] - Transport to use
 * @param {string|null} [options.relay] - Custom WebSocket relay URL to include
 * @returns {string} The complete shareable URL
 */
export function buildInviteUrl(options = {}) {
  let base = options.baseUrl;
  if (!base) {
    if (typeof window !== 'undefined' && window.location && window.location.href) {
      base = window.location.href;
    } else {
      base = 'http://localhost:8000/';
    }
  }

  let url;
  try {
    url = new URL(base);
  } catch (_) {
    url = new URL('http://localhost:8000/');
  }

  const room = options.room || CONFIG.defaultRoom || 'fight-room-1';
  const role = options.role || 'B';
  const transport = options.transport || 'websocket';

  url.searchParams.set('room', room);
  url.searchParams.set('role', role);
  url.searchParams.set('transport', transport);

  if (options.relay && options.relay.trim()) {
    url.searchParams.set('relay', options.relay.trim());
  }

  return url.toString();
}
