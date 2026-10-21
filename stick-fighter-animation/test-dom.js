const fs = require('fs');
const vm = require('vm');
const path = require('path');

function createMockElement(id, tag = 'div') {
  return {
    id: id,
    tagName: tag.toUpperCase(),
    children: [],
    classList: {
      toggle: function(cls, state) {},
      add: function(cls) {},
      remove: function(cls) {}
    },
    style: {},
    textContent: '',
    innerHTML: '',
    checked: false,
    getAttribute: function(attr) { return this[attr] || ''; },
    setAttribute: function(attr, val) { this[attr] = val; },
    addEventListener: function(evt, handler) {
      this.handlers = this.handlers || {};
      this.handlers[evt] = this.handlers[evt] || [];
      this.handlers[evt].push(handler);
    },
    click: function() {
      if (this.handlers && this.handlers.click) {
        this.handlers.click.forEach(h => h({ target: this }));
      }
    },
    appendChild: function(c) { this.children.push(c); },
    removeChild: function(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
    }
  };
}

const mockCanvas = createMockElement('preview-canvas', 'canvas');
mockCanvas.width = 800;
mockCanvas.height = 450;
mockCanvas.getContext = () => ({
  save: () => {},
  restore: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  beginPath: () => {},
  arc: () => {},
  ellipse: () => {},
  stroke: () => {},
  fill: () => {},
  moveTo: () => {},
  lineTo: () => {},
  fillRect: () => {},
  fillText: () => {}
});

const elementsMap = {
  'preview-canvas': mockCanvas,
  'status-fighter': createMockElement('status-fighter'),
  'status-move': createMockElement('status-move'),
  'status-speed': createMockElement('status-speed'),
  'status-joints': createMockElement('status-joints'),
  'event-log': createMockElement('event-log'),
  'btn-theme-toggle': createMockElement('btn-theme-toggle', 'button'),
  'btn-joints-toggle': createMockElement('btn-joints-toggle', 'button'),
  'btn-stop': createMockElement('btn-stop', 'button'),
  'btn-chain': createMockElement('btn-chain', 'button'),
  'target-fighter-a': createMockElement('target-fighter-a', 'input'),
  'target-fighter-b': createMockElement('target-fighter-b', 'input')
};

const moveButtons = ['idle', 'windup', 'strike', 'block', 'duck', 'hurt', 'slash'].map(m => {
  const btn = createMockElement('btn-' + m, 'button');
  btn['data-move'] = m;
  return btn;
});

const speedButtons = ['1.0', '0.5', '0.25'].map(s => {
  const btn = createMockElement('btn-spd-' + s, 'button');
  btn['data-speed'] = s;
  return btn;
});

const context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Date: Date,
  Promise: Promise,
  Array: Array,
  Object: Object,
  document: {
    hidden: false,
    readyState: 'complete',
    body: { classList: { toggle: () => {} } },
    getElementById: (id) => elementsMap[id] || null,
    querySelectorAll: (sel) => {
      if (sel === '[data-move]') return moveButtons;
      if (sel === '[data-speed]') return speedButtons;
      return [];
    },
    createElement: (tag) => createMockElement('el', tag),
    addEventListener: () => {}
  },
  window: null,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (cb) => { setTimeout(() => cb(Date.now()), 16); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const baseDir = __dirname;
const files = [
  'config.js',
  'src/poses.js',
  'src/moves.js',
  'src/effects.js',
  'src/fighter.js',
  'src/animation.js',
  'src/main.js'
];

for (const f of files) {
  const fullPath = path.join(baseDir, f);
  const code = fs.readFileSync(fullPath, 'utf8');
  vm.runInContext(code, context);
}

console.log('Main.js initialized successfully with mock DOM!');

// Verify global ArcAnim exposure
if (!context.ArcAnim || !context.ArcAnim.getFighterA || !context.ArcAnim.getFighterB) {
  throw new Error('ArcAnim global helper missing');
}

const fighterA = context.ArcAnim.getFighterA();
const fighterB = context.ArcAnim.getFighterB();
console.log('Fighter A facing:', fighterA.facing, 'Fighter B facing:', fighterB.facing);

// Simulate clicking Strike button
moveButtons.find(b => b['data-move'] === 'strike').click();
console.log('Active fighter move after clicking Strike button:', fighterA.currentMoveName);
if (fighterA.currentMoveName !== 'strike') throw new Error('Strike button click failed');

// Simulate clicking Stop button
elementsMap['btn-stop'].click();
console.log('Active fighter after Stop click - isReturningToIdle:', fighterA.anim.isReturningToIdle);

// Simulate clicking Skeleton Joints Toggle
elementsMap['btn-joints-toggle'].click();
console.log('Joints toggled to:', fighterA.showJoints);
if (!fighterA.showJoints) throw new Error('Joints toggle failed');

// Simulate speed button click
speedButtons.find(b => b['data-speed'] === '0.5').click();
console.log('Global timeScale after speed click:', context.timeScale);
if (context.timeScale !== 0.5) throw new Error('Speed click failed');

console.log('=== FULL DOM & MAIN.JS TEST PASSED! ===');
process.exit(0);
