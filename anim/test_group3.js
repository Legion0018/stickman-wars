// anim/test_group3.js - Code Fighters Group 3 Verification Test Suite
// Verifies Group 3 moves against original spec durations and CONTRACT.md
const fs = require('fs');

global.window = global;
global.CF = {};

// Load modules in order
eval(fs.readFileSync(__dirname + '/rig.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/poses.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/effects.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/moves.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/fighter.js', 'utf8'));

function assert(cond, msg) {
  if (!cond) {
    console.error('[FAIL] ' + msg);
    process.exit(1);
  } else {
    console.log('[PASS] ' + msg);
  }
}

console.log('=== Running Code Fighters Group 3 Automated Tests ===\n');

// 1. Check getMoveInfo for all Group 3 moves
const g3Moves = {
  riposte: { totalMs: 900, strikeMs: 600, persistent: false },
  spinSlash: { totalMs: 900, strikeMs: 300, strikeTimes: [300, 560], persistent: false },
  backflipEvade: { totalMs: 650, strikeMs: null, persistent: false },
  dashThrust: { totalMs: 700, strikeMs: 200, persistent: false },
  focus: { totalMs: 1500, strikeMs: null, persistent: true }
};

for (const [name, expected] of Object.entries(g3Moves)) {
  const info = CF.getMoveInfo(name);
  assert(info.totalMs === expected.totalMs, `${name} totalMs is ${expected.totalMs}ms (got ${info.totalMs})`);
  assert(info.persistent === expected.persistent, `${name} persistent is ${expected.persistent}`);
  if (expected.strikeMs !== null) {
    assert(info.strikeMs === expected.strikeMs, `${name} strikeMs is ${expected.strikeMs}ms`);
  }
  if (expected.strikeTimes) {
    assert(JSON.stringify(info.strikeTimes) === JSON.stringify(expected.strikeTimes), `${name} strikeTimes match`);
  }
}

// 2. Test riposte parry and strike timing
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  let parryFired = false;
  let strikeFired = false;
  f.on('parry', () => {
    parryFired = true;
  });
  f.on('strike', (d) => {
    strikeFired = true;
    assert(d.declaredMs === 600, 'riposte strike declaredMs is 600');
  });
  const rc = f.play('riposte');
  assert(rc.totalMs === 900, 'play riposte returns totalMs: 900');
  assert(rc.strikeMs === 600, 'play riposte returns strikeMs: 600');

  // Step to parry moment
  f.update(140);
  assert(!parryFired, 'riposte parry does not fire before 150ms');
  f.update(20);
  assert(parryFired, 'riposte parry event fires at 150ms');

  // Step to strike moment
  f.update(430);
  assert(!strikeFired, 'riposte strike does not fire before 600ms');
  f.update(20);
  assert(strikeFired, 'riposte strike fires at 600ms');

  // Finish
  f.update(350);
  assert(f.currentMove().name === 'idle', 'riposte returns to idle after completion');
}

// 3. Test spinSlash 2-hit strike sequence
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  const strikesReceived = [];
  f.on('strike', (d) => {
    strikesReceived.push({ idx: d.strikeIndex, declared: d.declaredMs });
  });
  const rc = f.play('spinSlash');
  assert(rc.totalMs === 900, 'play spinSlash returns totalMs: 900');
  assert(rc.strikeMs === 300, 'play spinSlash returns strikeMs: 300');

  // Step to hit 1
  f.update(300);
  assert(strikesReceived.length === 1 && strikesReceived[0].idx === 0, 'spinSlash hit 1 landed at 300ms');

  // Step to hit 2
  f.update(260); // 560ms total
  assert(strikesReceived.length === 2 && strikesReceived[1].idx === 1, 'spinSlash hit 2 landed at 560ms');

  f.update(350); // 910ms total
  assert(f.currentMove().name === 'idle', 'spinSlash returns to idle after completion');
}

// 4. Test backflipEvade dodge tag & duration
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  const rc = f.play('backflipEvade');
  assert(rc.totalMs === 650, 'play backflipEvade returns totalMs: 650');
  assert(f.currentMove().tags.includes('dodge'), 'backflipEvade has dodge tag');
  f.update(660);
  assert(f.currentMove().name === 'idle', 'backflipEvade returns to idle after completion');
}

// 5. Test dashThrust strike timing & tag
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  let strikeFired = false;
  f.on('strike', (d) => {
    strikeFired = true;
    assert(d.tag === 'thrust', 'dashThrust strike tag is thrust');
    assert(d.declaredMs === 200, 'dashThrust declaredMs is 200');
  });
  const rc = f.play('dashThrust');
  assert(rc.totalMs === 700, 'play dashThrust returns totalMs: 700');
  assert(rc.strikeMs === 200, 'play dashThrust returns strikeMs: 200');
  f.update(190);
  assert(!strikeFired, 'dashThrust strike does not fire before 200ms');
  f.update(20);
  assert(strikeFired, 'dashThrust strike fires at 200ms');
  f.update(500);
  assert(f.currentMove().name === 'idle', 'dashThrust returns to idle after completion');
}

// 6. Test focus persistence & shieldBreak
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  f.play('focus');
  assert(f.currentMove().name === 'focus', 'plays focus');
  assert(f.currentMove().tags.includes('persistent'), 'focus has persistent tag');
  f.update(2000);
  assert(f.currentMove().name === 'focus', 'focus loops and remains persistent');
  f.reset();
  assert(f.currentMove().name === 'idle', 'focus resets to idle');
}

console.log('\n=== ALL GROUP 3 TESTS PASSED SUCCESSFULLY ===');
