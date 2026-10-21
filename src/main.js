/**
 * Main Application Orchestrator
 * 
 * Ties inputs, animation loop (requestAnimationFrame),
 * transport, fighters, and diagnostics UI together.
 */

import { CONFIG } from '../config.js';
import { Fighter } from './fighter.js';
import { LoopbackTransport } from './loopback-transport.js';
import { StatusPanel } from './status-panel.js';

// DOM Elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const transportSelect = document.getElementById('transport-select');
const roomInput = document.getElementById('room-input');
const connectBtn = document.getElementById('connect-btn');
const roleSelectA = document.getElementById('role-a');
const roleSelectB = document.getElementById('role-b');

const btnSlash = document.getElementById('btn-slash');
const btnBlock = document.getElementById('btn-block');
const btnDuck = document.getElementById('btn-duck');
const btnSpecial = document.getElementById('btn-special');

// Initialize Diagnostics Panel
const statusPanel = new StatusPanel({
  transport: document.getElementById('status-transport'),
  room: document.getElementById('status-room'),
  badge: document.getElementById('status-badge'),
  rttLatest: document.getElementById('stat-rtt-latest'),
  rttMin: document.getElementById('stat-rtt-min'),
  rttMax: document.getElementById('stat-rtt-max'),
  rttAvg: document.getElementById('stat-rtt-avg'),
  rttJitter: document.getElementById('stat-rtt-jitter'),
  msgSent: document.getElementById('stat-msg-sent'),
  msgRecv: document.getElementById('stat-msg-recv'),
  eventLog: document.getElementById('event-log'),
  copyBtn: document.getElementById('copy-report-btn'),
  copyFeedback: document.getElementById('copy-feedback'),
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
let transport = new LoopbackTransport();
statusPanel.setTransportName("Loopback (Same Browser)");
statusPanel.setRoomCode(currentRoom);
statusPanel.setPlayerRole(localRole === 'A' ? "Fighter A (Left)" : "Fighter B (Right)");

/**
 * Combat Strike Resolution Callback
 * Called when a slash's strike lands (~310ms after strike motion begins)
 * @param {Fighter} attacker 
 * @param {Fighter} target 
 */
function handleStrikeLand(attacker, target) {
  const outcome = target.checkHit('slash');
  statusPanel.log(`Strike from Fighter ${attacker.id} landed on Fighter ${target.id} -> ${outcome}`, 'combat');
}

/**
 * Send an action message through transport
 * @param {'slash'|'block'|'duck'|'hurt'|'special'} actionName 
 * @param {'A'|'B'} [senderRole=localRole]
 */
function broadcastAction(actionName, senderRole = localRole) {
  if (!isConnected) return;
  const msg = {
    t: 'action',
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
 */
function triggerFighterAction(targetRole, actionName) {
  const actor = targetRole === 'A' ? fighterA : fighterB;
  const opponent = targetRole === 'A' ? fighterB : fighterA;

  // If in hurt sequence or special slam is already running, prevent override
  if (actor.currentMoveName === 'hurt' || actor.specialSlamActive) {
    return;
  }

  if (actionName === 'special') {
    actor.playSpecialSlam(() => handleStrikeLand(actor, opponent));
    broadcastAction('special', targetRole);
    statusPanel.log(`Fighter ${targetRole} executed SPECIAL SLAM`, 'action');
  } else if (actionName === 'slash') {
    actor.playMove('slash', () => handleStrikeLand(actor, opponent));
    broadcastAction('slash', targetRole);
    statusPanel.log(`Fighter ${targetRole} triggered slash`, 'action');
  } else if (actionName === 'block') {
    actor.playMove('block');
    broadcastAction('block', targetRole);
    statusPanel.log(`Fighter ${targetRole} blocked`, 'action');
  } else if (actionName === 'duck') {
    actor.playMove('duck');
    broadcastAction('duck', targetRole);
    statusPanel.log(`Fighter ${targetRole} ducked`, 'action');
  }
}

/**
 * Check if the element is an editable form field
 * @param {EventTarget|null} element 
 * @returns {boolean}
 */
function isEditableElement(element) {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable
  );
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

      if (msg.a === 'special') {
        actor.playSpecialSlam(() => handleStrikeLand(actor, target));
        statusPanel.log(`[Remote] Fighter ${msg.sender} executed SPECIAL SLAM`, 'action');
      } else if (msg.a === 'slash') {
        actor.playMove('slash', () => handleStrikeLand(actor, target));
        statusPanel.log(`[Remote] Fighter ${msg.sender} initiated slash`, 'action');
      } else if (msg.a === 'block') {
        actor.playMove('block');
        statusPanel.log(`[Remote] Fighter ${msg.sender} blocked`, 'action');
      } else if (msg.a === 'duck') {
        actor.playMove('duck');
        statusPanel.log(`[Remote] Fighter ${msg.sender} ducked`, 'action');
      } else if (msg.a === 'hurt') {
        actor.playMove('hurt');
        statusPanel.log(`[Remote] Fighter ${msg.sender} played hurt`, 'action');
      }
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
  transport.connect(currentRoom);
}

/**
 * Disconnect from room
 */
function disconnectRoom() {
  transport.close();
}

// Attach Transport Listeners
transport.onMessage(handleTransportMessage);
transport.onStatus(handleTransportStatus);

// Auto-connect to default room
connectRoom(currentRoom);

// UI Event Listeners
connectBtn.addEventListener('click', () => {
  if (isConnected) {
    disconnectRoom();
  } else {
    connectRoom(roomInput.value.trim() || CONFIG.defaultRoom);
  }
});

roomInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    connectRoom(roomInput.value.trim() || CONFIG.defaultRoom);
  }
});

// Role Switch
function setRole(role) {
  localRole = role;
  statusPanel.setPlayerRole(role === 'A' ? "Fighter A (Left)" : "Fighter B (Right)");
  if (role === 'A') {
    roleSelectA.checked = true;
  } else {
    roleSelectB.checked = true;
  }
  updateActionButtonsUI();
  statusPanel.log(`Switched local role to Fighter ${role}`, 'info');

  if (isConnected) {
    transport.send({ t: 'hello', v: 1, role: localRole });
    statusPanel.incrementSent();
  }
}

roleSelectA.addEventListener('change', () => {
  if (roleSelectA.checked) setRole('A');
});
roleSelectB.addEventListener('change', () => {
  if (roleSelectB.checked) setRole('B');
});

// Initialize action buttons UI according to default role
updateActionButtonsUI();

// Action Buttons: trigger actions for currently selected player role
btnSlash.addEventListener('click', () => triggerFighterAction(localRole, 'slash'));
btnSpecial.addEventListener('click', () => triggerFighterAction(localRole, 'special'));

// Support both click and press-and-hold for block and duck buttons
btnBlock.addEventListener('mousedown', () => {
  const localFighter = localRole === 'A' ? fighterA : fighterB;
  localFighter.setHolding('block', true);
  triggerFighterAction(localRole, 'block');
});
btnDuck.addEventListener('mousedown', () => {
  const localFighter = localRole === 'A' ? fighterA : fighterB;
  localFighter.setHolding('duck', true);
  triggerFighterAction(localRole, 'duck');
});
window.addEventListener('mouseup', () => {
  fighterA.setHolding('block', false);
  fighterA.setHolding('duck', false);
  fighterB.setHolding('block', false);
  fighterB.setHolding('duck', false);
});

// Role-Independent Keyboard Controls:
// - Fighter A: A (slash), S (block), D (duck), F (special slam)
// - Fighter B: J (slash), K (block), L (duck), ; (special slam)
const activeKeys = new Set();

window.addEventListener('keydown', (e) => {
  // Ignore keyboard shortcuts while the user is typing in editable controls
  if (isEditableElement(e.target)) return;

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

  triggerFighterAction(mapped.role, mapped.action);
});

window.addEventListener('keyup', (e) => {
  if (isEditableElement(e.target)) return;

  const mapped = getActionFromKey(e);
  if (!mapped) return;

  const keyId = `${mapped.role}-${mapped.action}`;
  activeKeys.delete(keyId);

  const targetFighter = mapped.role === 'A' ? fighterA : fighterB;
  if (mapped.hold) {
    targetFighter.setHolding(mapped.action, false);
  }
});

// Clear active keys when window loses focus to prevent stuck keys
window.addEventListener('blur', () => {
  activeKeys.clear();
  fighterA.setHolding('block', false);
  fighterA.setHolding('duck', false);
  fighterB.setHolding('block', false);
  fighterB.setHolding('duck', false);
});

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

  // 2. Clear & Draw Arena (Canvas fixed 640x360, floor at y=190)
  drawArena(ctx, canvas.width, canvas.height);

  // 3. Draw Fighters
  // Fighter A at x=200 facing right
  // Fighter B at x=440 facing left (mirror=true)
  fighterA.draw(ctx, 200, '#e2e8f0', false);
  fighterB.draw(ctx, 440, '#cbd5e1', true);

  // 4. Draw Special Slam Banners if active
  fighterA.drawSpecialSlamBanner(ctx, canvas.width, canvas.height);
  fighterB.drawSpecialSlamBanner(ctx, canvas.width, canvas.height);

  requestAnimationFrame(animate);
}

requestAnimationFrame((time) => {
  lastTime = time;
  animate(time);
});
