/**
 * Main Application Orchestrator
 * 
 * Ties inputs, animation loop (requestAnimationFrame),
 * transport, fighters, and diagnostics UI together.
 */

import { CONFIG } from '../config.js';
import { Fighter } from './fighter.js';
import { LoopbackTransport } from './loopback-transport.js';
import { WebSocketTransport } from './websocket-transport.js';
import { StatusPanel } from './status-panel.js';
import { animBridge } from './anim-bridge.js';
import { ChallengeController } from './challenge-controller.js';
import {
  isLocalOrLanHost,
  resolveWebSocketUrl,
  resolveDefaultTransport,
  parseStartupParams,
  buildInviteUrl,
} from './net-helpers.js';

// DOM Elements
const hasDoc = typeof document !== 'undefined';
const canvas = hasDoc ? document.getElementById('game-canvas') : null;
const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

const transportSelect = hasDoc ? document.getElementById('transport-select') : null;
const roomInput = hasDoc ? document.getElementById('room-input') : null;
const connectBtn = hasDoc ? document.getElementById('connect-btn') : null;
const btnCopyInvite = hasDoc ? document.getElementById('btn-copy-invite') : null;
const inviteFeedback = hasDoc ? document.getElementById('invite-feedback') : null;
const roleSelectA = hasDoc ? document.getElementById('role-a') : null;
const roleSelectB = hasDoc ? document.getElementById('role-b') : null;

const btnSlash = hasDoc ? document.getElementById('btn-slash') : null;
const btnBlock = hasDoc ? document.getElementById('btn-block') : null;
const btnDuck = hasDoc ? document.getElementById('btn-duck') : null;
const btnSpecial = hasDoc ? document.getElementById('btn-special') : null;

// Initialize Diagnostics Panel
const statusPanel = new StatusPanel({
  transport: hasDoc ? document.getElementById('status-transport') : null,
  room: hasDoc ? document.getElementById('status-room') : null,
  badge: hasDoc ? document.getElementById('status-badge') : null,
  rttLatest: hasDoc ? document.getElementById('stat-rtt-latest') : null,
  rttMin: hasDoc ? document.getElementById('stat-rtt-min') : null,
  rttMax: hasDoc ? document.getElementById('stat-rtt-max') : null,
  rttAvg: hasDoc ? document.getElementById('stat-rtt-avg') : null,
  rttJitter: hasDoc ? document.getElementById('stat-rtt-jitter') : null,
  msgSent: hasDoc ? document.getElementById('stat-msg-sent') : null,
  msgRecv: hasDoc ? document.getElementById('stat-msg-recv') : null,
  eventLog: hasDoc ? document.getElementById('event-log') : null,
  copyBtn: hasDoc ? document.getElementById('copy-report-btn') : null,
  copyFeedback: hasDoc ? document.getElementById('copy-feedback') : null,
});

// Create Fighters
// Fighter A at x=200 facing right (ink: '#333333', sword: '#EF9F27')
// Fighter B at x=440 facing left (mirror=true)
const fighterA = new Fighter('A', '#333333', '#EF9F27');
const fighterB = new Fighter('B', '#444444', '#EF9F27');

// Application State
let localRole = 'A'; // 'A' or 'B'
let currentRoom = CONFIG.defaultRoom || 'fight-room-1';
let isConnected = false;
let pingSeq = 0;
let pingIntervalId = null;

// Initialize Transport
let transport = null;

function initTransport(type) {
  const chosenType = type || resolveDefaultTransport();
  if (transport) {
    disconnectRoom();
  }

  if (chosenType === 'websocket') {
    const wsUrl = resolveWebSocketUrl();
    transport = new WebSocketTransport(wsUrl);
    statusPanel.setTransportName(`WebSocket Relay (${wsUrl})`);
  } else {
    transport = new LoopbackTransport();
    statusPanel.setTransportName("Loopback (Same Browser)");
  }

  statusPanel.setRoomCode(currentRoom);
  statusPanel.setPlayerRole(localRole === 'A' ? "Fighter A (Left)" : "Fighter B (Right)");

  transport.onMessage(handleTransportMessage);
  transport.onStatus(handleTransportStatus);
}

// Combat HUD Elements
const hudHpValA = typeof document !== 'undefined' ? document.getElementById('hud-hp-val-a') : null;
const hudHpFillA = typeof document !== 'undefined' ? document.getElementById('hud-hp-fill-a') : null;
const hudHpGhostA = typeof document !== 'undefined' ? document.getElementById('hud-hp-ghost-a') : null;
const hudHpValB = typeof document !== 'undefined' ? document.getElementById('hud-hp-val-b') : null;
const hudHpFillB = typeof document !== 'undefined' ? document.getElementById('hud-hp-fill-b') : null;
const hudHpGhostB = typeof document !== 'undefined' ? document.getElementById('hud-hp-ghost-b') : null;

function updateCombatHud() {
  if (hudHpValA && hudHpFillA) {
    const pctA = Math.max(0, Math.min(100, (fighterA.hp / fighterA.maxHp) * 100));
    hudHpValA.textContent = `${fighterA.hp} / ${fighterA.maxHp}`;
    hudHpFillA.style.width = `${pctA}%`;
    if (hudHpGhostA) {
      setTimeout(() => { if (hudHpGhostA) hudHpGhostA.style.width = `${pctA}%`; }, 250);
    }
    hudHpFillA.className = 'hud-hp-bar-fill' + (pctA < 30 ? ' hp-critical' : pctA < 60 ? ' hp-warning' : '');
  }

  if (hudHpValB && hudHpFillB) {
    const pctB = Math.max(0, Math.min(100, (fighterB.hp / fighterB.maxHp) * 100));
    hudHpValB.textContent = `${fighterB.hp} / ${fighterB.maxHp}`;
    hudHpFillB.style.width = `${pctB}%`;
    if (hudHpGhostB) {
      setTimeout(() => { if (hudHpGhostB) hudHpGhostB.style.width = `${pctB}%`; }, 250);
    }
    hudHpFillB.className = 'hud-hp-bar-fill' + (pctB < 30 ? ' hp-critical' : pctB < 60 ? ' hp-warning' : '');
  }
}

/**
 * Combat Strike Resolution Callback
 * Called when a slash's strike lands (~310ms after strike motion begins)
 * @param {Fighter} attacker 
 * @param {Fighter} target 
 */
function handleStrikeLand(attacker, target) {
  const outcome = target.checkHit('slash');
  statusPanel.log(`Strike from Fighter ${attacker.id} landed on Fighter ${target.id} -> ${outcome}`, 'combat');
  animBridge.onCombatResolution(attacker.id, target.id, outcome);
  updateCombatHud();

  if (isConnected && transport) {
    try {
      transport.send({
        t: 'sync_hp',
        v: 1,
        sender: localRole,
        targetId: target.id,
        attackerId: attacker.id,
        outcome: outcome,
        hpA: fighterA.hp,
        hpB: fighterB.hp,
        ts: performance.now(),
      });
      statusPanel.incrementSent();
    } catch (_) {}
  }
}

/**
 * Send an action message through transport
 * @param {'slash'|'block'|'duck'|'hurt'|'special'} actionName 
 * @param {'A'|'B'} [senderRole=localRole]
 * @param {boolean} [isHold=false]
 */
function broadcastAction(actionName, senderRole = localRole, isHold = false) {
  if (!isConnected) return;
  const msg = {
    t: 'action',
    v: 1,
    a: actionName,
    sender: senderRole,
    hold: Boolean(isHold),
    ts: performance.now(),
  };
  transport.send(msg);
  statusPanel.incrementSent();
}

/**
 * Send a release message through transport for held actions
 * @param {'block'|'duck'} actionName
 * @param {'A'|'B'} [senderRole=localRole]
 */
function broadcastRelease(actionName, senderRole = localRole) {
  if (!isConnected) return;
  const msg = {
    t: 'release',
    v: 1,
    a: actionName,
    sender: senderRole,
    ts: performance.now(),
  };
  transport.send(msg);
  statusPanel.incrementSent();
}

/**
 * Execute action for a specific fighter (role-independent)
 * @param {'A'|'B'} targetRole
 * @param {'slash'|'block'|'duck'|'special'} actionName 
 * @param {boolean} [isHold=false]
 */
function triggerFighterAction(targetRole, actionName, isHold = false) {
  const actor = targetRole === 'A' ? fighterA : fighterB;
  const opponent = targetRole === 'A' ? fighterB : fighterA;

  // If in hurt sequence or special slam is already running, prevent override
  if (actor.currentMoveName === 'hurt' || actor.specialSlamActive) {
    return;
  }

  if (actionName === 'special') {
    actor.playSpecialSlam(() => handleStrikeLand(actor, opponent));
    broadcastAction('special', targetRole, false);
    statusPanel.log(`Fighter ${targetRole} executed SPECIAL SLAM`, 'action');
    animBridge.onAction(targetRole, 'special', false);
  } else if (actionName === 'slash') {
    actor.playMove('slash', () => handleStrikeLand(actor, opponent));
    broadcastAction('slash', targetRole, false);
    statusPanel.log(`Fighter ${targetRole} triggered slash`, 'action');
    animBridge.onAction(targetRole, 'slash', false);
  } else if (actionName === 'block') {
    actor.playMove('block');
    broadcastAction('block', targetRole, isHold);
    statusPanel.log(`Fighter ${targetRole} blocked${isHold ? ' (holding)' : ''}`, 'action');
    animBridge.onAction(targetRole, 'block', isHold);
  } else if (actionName === 'duck') {
    actor.playMove('duck');
    broadcastAction('duck', targetRole, isHold);
    statusPanel.log(`Fighter ${targetRole} ducked${isHold ? ' (holding)' : ''}`, 'action');
    animBridge.onAction(targetRole, 'duck', isHold);
  }
}

/**
 * Release a held action for a specific fighter (role-independent)
 * @param {'A'|'B'} targetRole
 * @param {'block'|'duck'} actionName
 */
function releaseFighterAction(targetRole, actionName) {
  const actor = targetRole === 'A' ? fighterA : fighterB;
  actor.setHolding(actionName, false);
  broadcastRelease(actionName, targetRole);
  statusPanel.log(`Fighter ${targetRole} released ${actionName}`, 'action');
  animBridge.onRelease(targetRole, actionName);
}

/**
 * Check if the element is an editable form field
 * @param {EventTarget|null} element 
 * @returns {boolean}
 */
function isEditableElement(element) {
  if (!element || typeof element !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && !(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(element.isContentEditable)
  );
}

/**
 * Check if keyboard event should be isolated from controlling fighters
 * Guarantees 100% keyboard isolation when typing in code editor, console,
 * inputs, selects, sidebar rail, or any child of the coding workspace.
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
function shouldIgnoreGameHotkeys(e) {
  if (isEditableElement(e.target)) return true;
  if (e.target && e.target.closest) {
    if (e.target.closest('#challenge-section')) return true;
    if (e.target.closest('.coding-workspace-panel')) return true;
    if (e.target.closest('#sidebar-rail')) return true;
    if (e.target.closest('.sidebar-rail')) return true;
  }
  return false;
}

/**
 * Maps keyboard events to specific fighter role and action
 * - Fighter A (Left): A (slash), S (block), D (duck), F (special)
 * - Fighter B (Right): J (slash), K (block), L (duck), ; (special)
 * @param {KeyboardEvent} e 
 * @returns {{ role: 'A'|'B', action: string, hold: boolean } | null}
 */
function getActionFromKey(e) {
  const code = e.code;
  const key = e.key ? e.key.toUpperCase() : '';

  // Fighter A keys: A, S, D, F
  if (code === 'KeyA' || key === 'A') {
    return { role: 'A', action: 'slash', hold: false };
  }
  if (code === 'KeyS' || key === 'S') {
    return { role: 'A', action: 'block', hold: true };
  }
  if (code === 'KeyD' || key === 'D') {
    return { role: 'A', action: 'duck', hold: true };
  }
  if (code === 'KeyF' || key === 'F') {
    return { role: 'A', action: 'special', hold: false };
  }

  // Fighter B keys: J, K, L, ;
  if (code === 'KeyJ' || key === 'J') {
    return { role: 'B', action: 'slash', hold: false };
  }
  if (code === 'KeyK' || key === 'K') {
    return { role: 'B', action: 'block', hold: true };
  }
  if (code === 'KeyL' || key === 'L') {
    return { role: 'B', action: 'duck', hold: true };
  }
  if (code === 'Semicolon' || e.key === ';' || e.key === ':') {
    return { role: 'B', action: 'special', hold: false };
  }

  return null;
}

/**
 * Update on-screen action button labels and badges according to selected role
 */
function updateActionButtonsUI() {
  const isA = localRole === 'A';
  const slashKey = isA ? 'A' : 'J';
  const blockKey = isA ? 'S' : 'K';
  const duckKey = isA ? 'D' : 'L';
  const specialKey = isA ? 'F' : ';';

  if (btnSlash) {
    const badge = btnSlash.querySelector('.key-badge');
    if (badge) badge.textContent = slashKey;
    btnSlash.title = `Hotkey: ${slashKey} (${isA ? 'Fighter A' : 'Fighter B'})`;
  }
  if (btnBlock) {
    const badge = btnBlock.querySelector('.key-badge');
    if (badge) badge.textContent = blockKey;
    btnBlock.title = `Hotkey: ${blockKey} (Hold to guard)`;
  }
  if (btnDuck) {
    const badge = btnDuck.querySelector('.key-badge');
    if (badge) badge.textContent = duckKey;
    btnDuck.title = `Hotkey: ${duckKey} (Hold to crouch)`;
  }
  if (btnSpecial) {
    const badge = btnSpecial.querySelector('.key-badge');
    if (badge) badge.textContent = specialKey;
    btnSpecial.title = `Hotkey: ${specialKey} (${isA ? 'Fighter A' : 'Fighter B'})`;
  }
}

/**
 * Handle incoming transport message
 * Protocol versioning: v: 1
 */
function handleTransportMessage(msg) {
  statusPanel.incrementReceived();

  if (!msg || msg.v !== 1) {
    console.warn("Received message with invalid or mismatched version:", msg);
    return;
  }

  const localFighter = localRole === 'A' ? fighterA : fighterB;
  const remoteFighter = localRole === 'A' ? fighterB : fighterA;

  switch (msg.t) {
    case 'hello': {
      statusPanel.log(`Peer connected as Fighter ${msg.role}`, 'net');
      if (msg.role === localRole) {
        statusPanel.log(`Role collision detected: both connected as Fighter ${localRole}. Please switch one player to the opposite role.`, 'warn');
      }
      break;
    }

    case 'sync_hp': {
      if (msg.sender === localRole) {
        return;
      }

      // Authoritative defender synchronization:
      // Only accept HP reconciliation if the sender was the defender (target) of the strike
      if (msg.targetId === msg.sender) {
        if (typeof msg.hpA === 'number' && typeof msg.hpB === 'number') {
          fighterA.hp = msg.hpA;
          fighterB.hp = msg.hpB;
          updateCombatHud();
          statusPanel.log(`[Reconciled] HP synced from defender (${msg.sender}): outcome=${msg.outcome}, A=${fighterA.hp}, B=${fighterB.hp}`, 'combat');
        }
      }
      break;
    }

    case 'ping': {
      // Respond with pong
      const pongMsg = {
        t: 'pong',
        v: 1,
        n: msg.n,
        ts: msg.ts,
      };
      transport.send(pongMsg);
      statusPanel.incrementSent();
      break;
    }

    case 'pong': {
      const now = performance.now();
      const rtt = Math.max(0, now - msg.ts);
      statusPanel.recordPong(rtt);
      break;
    }

    case 'action': {
      // Incoming action from peer
      if (msg.sender === localRole) {
        // Ignore messages echoed from self (BroadcastChannel does not self-echo, but good practice)
        return;
      }

      const actor = msg.sender === 'A' ? fighterA : fighterB;
      const target = msg.sender === 'A' ? fighterB : fighterA;

      if (msg.hold !== undefined && (msg.a === 'block' || msg.a === 'duck')) {
        actor.setHolding(msg.a, Boolean(msg.hold));
      }

      if (msg.a === 'special') {
        actor.playSpecialSlam(() => handleStrikeLand(actor, target));
        statusPanel.log(`[Remote] Fighter ${msg.sender} executed SPECIAL SLAM`, 'action');
        animBridge.onAction(msg.sender, 'special', false);
      } else if (msg.a === 'slash') {
        actor.playMove('slash', () => handleStrikeLand(actor, target));
        statusPanel.log(`[Remote] Fighter ${msg.sender} initiated slash`, 'action');
        animBridge.onAction(msg.sender, 'slash', false);
      } else if (msg.a === 'block') {
        actor.playMove('block');
        statusPanel.log(`[Remote] Fighter ${msg.sender} blocked${msg.hold ? ' (holding)' : ''}`, 'action');
        animBridge.onAction(msg.sender, 'block', Boolean(msg.hold));
      } else if (msg.a === 'duck') {
        actor.playMove('duck');
        statusPanel.log(`[Remote] Fighter ${msg.sender} ducked${msg.hold ? ' (holding)' : ''}`, 'action');
        animBridge.onAction(msg.sender, 'duck', Boolean(msg.hold));
      } else if (msg.a === 'hurt') {
        actor.playMove('hurt');
        statusPanel.log(`[Remote] Fighter ${msg.sender} played hurt`, 'action');
        animBridge.onAction(msg.sender, 'hurt', false);
      }
      break;
    }

    case 'release': {
      if (msg.sender === localRole) {
        return;
      }

      const actor = msg.sender === 'A' ? fighterA : fighterB;
      if (msg.a === 'block' || msg.a === 'duck') {
        actor.setHolding(msg.a, false);
        statusPanel.log(`[Remote] Fighter ${msg.sender} released ${msg.a}`, 'action');
        animBridge.onRelease(msg.sender, msg.a);
      }
      break;
    }

    case 'leave': {
      statusPanel.log(`Peer departed room (Fighter ${msg.role || 'Unknown'})`, 'net');
      fighterA.setHolding('block', false);
      fighterA.setHolding('duck', false);
      fighterB.setHolding('block', false);
      fighterB.setHolding('duck', false);
      break;
    }

    default:
      console.warn("Unknown message type:", msg.t);
  }
}

/**
 * Handle transport status changes
 */
function handleTransportStatus(status, reason) {
  statusPanel.setStatus(status, reason);
  isConnected = (status === 'connected');

  if (connectBtn) {
    connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
    connectBtn.className = isConnected ? 'btn btn-disconnect' : 'btn btn-connect';
  }

  if (isConnected) {
    startPingInterval();
    // Announce role to peer
    const helloMsg = {
      t: 'hello',
      v: 1,
      role: localRole,
    };
    transport.send(helloMsg);
    statusPanel.incrementSent();
  } else {
    stopPingInterval();
  }
}

/**
 * Start periodic ping (every 2s)
 */
function startPingInterval() {
  stopPingInterval();
  pingIntervalId = setInterval(() => {
    if (!isConnected) return;
    pingSeq++;
    const pingMsg = {
      t: 'ping',
      v: 1,
      n: pingSeq,
      ts: performance.now(),
    };
    transport.send(pingMsg);
    statusPanel.incrementSent();
  }, CONFIG.pingIntervalMs || 2000);
}

function stopPingInterval() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
}

/**
 * Connect to room
 */
function connectRoom(roomCode) {
  currentRoom = roomCode || CONFIG.defaultRoom;
  statusPanel.setRoomCode(currentRoom);
  fighterA.resetHp();
  fighterB.resetHp();
  updateCombatHud();
  transport.connect(currentRoom);
}

/**
 * Disconnect from room
 */
function disconnectRoom() {
  if (isConnected) {
    try {
      transport.send({ t: 'leave', v: 1, role: localRole });
      statusPanel.incrementSent();
    } catch (_) {}
  }
  fighterA.setHolding('block', false);
  fighterA.setHolding('duck', false);
  fighterB.setHolding('block', false);
  fighterB.setHolding('duck', false);
  fighterA.resetHp();
  fighterB.resetHp();
  updateCombatHud();
  transport.close();
}

// Role Switch
function setRole(role) {
  localRole = role;
  statusPanel.setPlayerRole(role === 'A' ? "Fighter A (Left)" : "Fighter B (Right)");
  if (roleSelectA && roleSelectB) {
    roleSelectA.checked = (role === 'A');
    roleSelectB.checked = (role === 'B');
  }
  updateActionButtonsUI();
  statusPanel.log(`Switched local role to Fighter ${role}`, 'info');

  if (isConnected) {
    transport.send({ t: 'hello', v: 1, role: localRole });
    statusPanel.incrementSent();
  }
}

if (roleSelectA) {
  roleSelectA.addEventListener('change', () => {
    if (roleSelectA.checked) setRole('A');
  });
}
if (roleSelectB) {
  roleSelectB.addEventListener('change', () => {
    if (roleSelectB.checked) setRole('B');
  });
}

// Transport Selector Change
if (transportSelect) {
  transportSelect.addEventListener('change', () => {
    initTransport(transportSelect.value);
    connectRoom(roomInput.value.trim() || CONFIG.defaultRoom);
  });
}

// UI Event Listeners for Connect Button & Room Input
if (connectBtn) {
  connectBtn.addEventListener('click', () => {
    if (isConnected) {
      disconnectRoom();
    } else {
      connectRoom(roomInput.value.trim() || CONFIG.defaultRoom);
    }
  });
}

if (roomInput) {
  roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      connectRoom(roomInput.value.trim() || CONFIG.defaultRoom);
    }
  });
}

// Room Invite Link Generation & Copy Handling
let inviteFeedbackTimer = null;
function showInviteFeedback(text) {
  if (!inviteFeedback) return;
  inviteFeedback.textContent = text;
  inviteFeedback.style.opacity = '1';
  if (inviteFeedbackTimer) clearTimeout(inviteFeedbackTimer);
  inviteFeedbackTimer = setTimeout(() => {
    if (inviteFeedback) {
      inviteFeedback.style.opacity = '0';
      setTimeout(() => { if (inviteFeedback) inviteFeedback.textContent = ''; }, 200);
    }
  }, 2500);
}

function handleCopyInvite() {
  const targetRole = localRole === 'A' ? 'B' : 'A';
  const activeRoom = (roomInput && roomInput.value.trim()) || currentRoom || CONFIG.defaultRoom;

  let relayUrl = startupParams.relay || null;
  if (!relayUrl && transportSelect && transportSelect.value === 'websocket') {
    const resolved = resolveWebSocketUrl();
    if (resolved && !resolved.includes('localhost') && !resolved.includes('127.0.0.1')) {
      relayUrl = resolved;
    }
  }

  const inviteUrl = buildInviteUrl({
    room: activeRoom,
    role: targetRole,
    transport: 'websocket',
    relay: relayUrl,
  });

  const notifySuccess = () => {
    showInviteFeedback(`Copied! (Fighter ${targetRole})`);
    statusPanel.log(`Copied invite link for Fighter ${targetRole} to clipboard: ${inviteUrl}`, 'info');
  };

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inviteUrl).then(notifySuccess).catch(() => {
      fallbackCopyText(inviteUrl, targetRole);
    });
  } else {
    fallbackCopyText(inviteUrl, targetRole);
  }
}

function fallbackCopyText(text, targetRole) {
  if (typeof document !== 'undefined') {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showInviteFeedback(`Copied! (Fighter ${targetRole})`);
      statusPanel.log(`Copied invite link for Fighter ${targetRole} to clipboard`, 'info');
      return;
    } catch (_) {}
  }
  showInviteFeedback(`Link: ${text.slice(0, 25)}...`);
}

if (btnCopyInvite) {
  btnCopyInvite.addEventListener('click', handleCopyInvite);
}

// Parse startup URL parameters (?role=, ?room=, ?transport=, ?relay=)
const startupParams = parseStartupParams();

if (startupParams.room) {
  currentRoom = startupParams.room;
  if (roomInput) {
    roomInput.value = currentRoom;
  }
}

// Set initial player role (query param ?role=A or ?role=B, default 'A')
const initialRole = startupParams.role || 'A';
setRole(initialRole);

// Determine initial transport (defaults to 'websocket' on public/HTTPS origin, 'loopback' locally)
const initialTransportType = startupParams.transport || resolveDefaultTransport();
if (transportSelect) {
  transportSelect.value = initialTransportType;
}

// Initial transport setup and auto-connect
initTransport(initialTransportType);
connectRoom(currentRoom);

// Action Buttons: trigger actions for currently selected player role
if (btnSlash) btnSlash.addEventListener('click', () => triggerFighterAction(localRole, 'slash'));
if (btnSpecial) btnSpecial.addEventListener('click', () => triggerFighterAction(localRole, 'special'));

// Support both click and press-and-hold for block and duck buttons
if (btnBlock) {
  btnBlock.addEventListener('mousedown', () => {
    const localFighter = localRole === 'A' ? fighterA : fighterB;
    localFighter.setHolding('block', true);
    triggerFighterAction(localRole, 'block', true);
  });
}
if (btnDuck) {
  btnDuck.addEventListener('mousedown', () => {
    const localFighter = localRole === 'A' ? fighterA : fighterB;
    localFighter.setHolding('duck', true);
    triggerFighterAction(localRole, 'duck', true);
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('mouseup', () => {
    if (fighterA.isHoldingBlock) releaseFighterAction('A', 'block');
    if (fighterA.isHoldingDuck) releaseFighterAction('A', 'duck');
    if (fighterB.isHoldingBlock) releaseFighterAction('B', 'block');
    if (fighterB.isHoldingDuck) releaseFighterAction('B', 'duck');
  });
}

// Initialize Python Combat Challenge Controller (Hybrid Combat Integration)
const challengeController = new ChallengeController({
  onUnlock: (action) => {
    // Verified Python code unleashes Special Slam for local player
    triggerFighterAction(localRole, action || 'special', false);
    statusPanel.log(`[Python] Code verified! Special Slam unleashed for Fighter ${localRole}`, 'combat');
  },
  onPenalty: ({ type, challengeId, penalty }) => {
    const localFighter = localRole === 'A' ? fighterA : fighterB;
    const opponentFighter = localRole === 'A' ? fighterB : fighterA;
    if (penalty && penalty.hp && penalty.hp > 0) {
      // Mild non-lethal chip penalty, bounded to minimum 1 HP
      const damage = Math.min(penalty.hp, Math.max(0, localFighter.hp - 1));
      if (damage > 0) {
        localFighter.hp = Math.max(1, localFighter.hp - damage);
        updateCombatHud();
        statusPanel.log(`[Python] ${type === 'skip' ? 'Challenge skipped' : 'Challenge timed out'}! Fighter ${localRole} sustained -${damage} HP chip penalty`, 'combat');
        if (isConnected && transport) {
          try {
            transport.send({
              t: 'sync_hp',
              v: 1,
              sender: localRole,
              targetId: localFighter.id,
              attackerId: opponentFighter.id,
              outcome: type === 'skip' ? 'skip_penalty' : 'timeout_penalty',
              hpA: fighterA.hp,
              hpB: fighterB.hp,
              ts: performance.now(),
            });
            statusPanel.incrementSent();
          } catch (_) {}
        }
      }
    }
  },
});

if (typeof window !== 'undefined') {
  window.challengeController = challengeController;
}

// Role-Independent Keyboard Controls:
// - Fighter A: A (slash), S (block), D (duck), F (special slam)
// - Fighter B: J (slash), K (block), L (duck), ; (special slam)
const activeKeys = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    // Global shortcut to toggle Python code workspace (Alt+C)
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      challengeController.toggleWorkspace();
      return;
    }

    // Strict keyboard isolation: ignore fighting hotkeys while inside code workspace or editable field
    if (shouldIgnoreGameHotkeys(e)) return;

    const mapped = getActionFromKey(e);
    if (!mapped) return;

    // Prevent browser default behavior for mapped keys
    e.preventDefault();

    const keyId = `${mapped.role}-${mapped.action}`;
    const isRepeat = activeKeys.has(keyId);
    activeKeys.add(keyId);

    const targetFighter = mapped.role === 'A' ? fighterA : fighterB;

    if (mapped.hold) {
      targetFighter.setHolding(mapped.action, true);
    }

    // Avoid triggering an action repeatedly from a single held key
    if (isRepeat) {
      return;
    }

    triggerFighterAction(mapped.role, mapped.action, mapped.hold);
  });

  window.addEventListener('keyup', (e) => {
    // Strict keyboard isolation on keyup as well
    if (shouldIgnoreGameHotkeys(e)) return;

    const mapped = getActionFromKey(e);
    if (!mapped) return;

    const keyId = `${mapped.role}-${mapped.action}`;
    activeKeys.delete(keyId);

    if (mapped.hold) {
      releaseFighterAction(mapped.role, mapped.action);
    }
  });

  // Clear active keys when window loses focus to prevent stuck keys
  window.addEventListener('blur', () => {
    activeKeys.clear();
    if (fighterA.isHoldingBlock) releaseFighterAction('A', 'block');
    if (fighterA.isHoldingDuck) releaseFighterAction('A', 'duck');
    if (fighterB.isHoldingBlock) releaseFighterAction('B', 'block');
    if (fighterB.isHoldingDuck) releaseFighterAction('B', 'duck');
  });

  window.addEventListener('beforeunload', () => {
    if (isConnected) {
      try {
        transport.send({ t: 'leave', v: 1, role: localRole });
      } catch (_) {}
    }
  });
}

// Initial Combat HUD render
updateCombatHud();

// Clear active keys & held actions when clicking or focusing inside coding workspace or sidebar rail
const codingWorkspaceSection = hasDoc ? document.getElementById('challenge-section') : null;
if (codingWorkspaceSection) {
  codingWorkspaceSection.addEventListener('focusin', () => {
    activeKeys.clear();
    if (fighterA.isHoldingBlock) releaseFighterAction('A', 'block');
    if (fighterA.isHoldingDuck) releaseFighterAction('A', 'duck');
    if (fighterB.isHoldingBlock) releaseFighterAction('B', 'block');
    if (fighterB.isHoldingDuck) releaseFighterAction('B', 'duck');
  });
}

// Collapsible Diagnostics & Telemetry Panel Toggle
const diagHeader = hasDoc ? document.getElementById('diagnostics-header') : null;
const diagBody = hasDoc ? document.getElementById('diagnostics-collapsible-body') : null;
if (diagHeader && diagBody) {
  diagHeader.addEventListener('click', (e) => {
    // Avoid collapsing when clicking the "Copy Test Report" button
    if (e.target && e.target.closest && e.target.closest('#copy-report-btn')) return;
    const isCollapsed = diagBody.classList.toggle('collapsed');
    diagHeader.classList.toggle('collapsed', isCollapsed);
  });
}

/**
 * Render Arena Background & Floor
 */
function drawArena(ctx, width, height) {
  // Clear with clean subtle arena background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#1e2430');
  bgGrad.addColorStop(0.53, '#252d3d');
  bgGrad.addColorStop(0.53, '#1a1f29');
  bgGrad.addColorStop(1, '#11141c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle arena background pillars / grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 190);
    ctx.stroke();
  }

  // DISTINCT FLOOR LINE AT y = 190 (As specified)
  ctx.save();
  ctx.strokeStyle = '#EF9F27';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(239, 159, 39, 0.4)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(0, 190);
  ctx.lineTo(width, 190);
  ctx.stroke();
  ctx.restore();

  // Floor deck texture lines below y=190
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 215; y < height; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Fighter identity markers & floor labels
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = 'center';

  // Fighter A label at x=200
  ctx.fillStyle = localRole === 'A' ? '#EF9F27' : '#94a3b8';
  ctx.fillText(localRole === 'A' ? "FIGHTER A (YOU)" : "FIGHTER A", 200, 215);

  // Fighter B label at x=440
  ctx.fillStyle = localRole === 'B' ? '#EF9F27' : '#94a3b8';
  ctx.fillText(localRole === 'B' ? "FIGHTER B (YOU)" : "FIGHTER B", 440, 215);
}

/**
 * Main Animation Loop (requestAnimationFrame)
 */
let lastTime = performance.now();

function animate(currentTime) {
  const dt = Math.min(50, currentTime - lastTime); // clamp dt in case of tab switch
  lastTime = currentTime;

  // 1. Update State
  fighterA.update(dt);
  fighterB.update(dt);
  animBridge.update(dt);

  // 2. Clear & Draw Arena (Canvas fixed 640x360, floor at y=190)
  ctx.save();
  animBridge.applyCamera(ctx);
  drawArena(ctx, canvas.width, canvas.height);
  animBridge.drawBackgroundEffects(ctx);

  // 3. Draw Fighters
  if (animBridge.isEnabled()) {
    animBridge.drawFighters(ctx);
    animBridge.drawForegroundEffects(ctx, canvas.width, canvas.height);
  } else {
    // Standard rendering fallback
    fighterA.draw(ctx, 200, '#e2e8f0', false);
    fighterB.draw(ctx, 440, '#cbd5e1', true);
    fighterA.drawSpecialSlamBanner(ctx, canvas.width, canvas.height);
    fighterB.drawSpecialSlamBanner(ctx, canvas.width, canvas.height);
  }

  animBridge.restoreCamera(ctx);
  ctx.restore();

  requestAnimationFrame(animate);
}

if (typeof requestAnimationFrame === 'function' && ctx && canvas) {
  requestAnimationFrame((time) => {
    lastTime = time;
    animate(time);
  });
}

export {
  isLocalOrLanHost,
  resolveWebSocketUrl,
  resolveDefaultTransport,
  parseStartupParams,
  buildInviteUrl,
  handleCopyInvite,
  challengeController,
  shouldIgnoreGameHotkeys,
  updateCombatHud,
};
