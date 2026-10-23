// anim/test_group2.js - Code Fighters Group 2 Verification Test Suite
// Verifies Group 2 moves against original spec durations and CONTRACT.md
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

console.log('=== Running Code Fighters Group 2 Automated Tests ===\n');

// 1. Check getMoveInfo for all Group 2 moves
const g2Moves = {
  weakSlash: { totalMs: 360, strikeMs: 210, persistent: false },
  strongSlash: { totalMs: 700, strikeMs: 390, persistent: false },
  comboHeavy: { totalMs: 1400, strikeMs: 300, strikeTimes: [300, 650, 1050], persistent: false },
  stumble: { totalMs: 1000, strikeMs: null, persistent: false },
  knockdown: { totalMs: 900, strikeMs: null, persistent: true },
  victory: { totalMs: 800, strikeMs: null, persistent: true }
};

for (const [name, expected] of Object.entries(g2Moves)) {
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

// 2. Test weakSlash playback & strike timing
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  let strikeFired = false;
  f.on('strike', (d) => {
    strikeFired = true;
    assert(d.strikeIndex === 0, 'weakSlash strikeIndex is 0');
    assert(d.declaredMs === 210, 'weakSlash strike declaredMs is 210');
  });
  const rc = f.play('weakSlash');
  assert(rc.totalMs === 360, 'play weakSlash returns totalMs: 360');
  assert(rc.strikeMs === 210, 'play weakSlash returns strikeMs: 210');
  f.update(200);
  assert(!strikeFired, 'weakSlash strike does not fire before 210ms');
  f.update(20);
  assert(strikeFired, 'weakSlash strike fires at 210ms');
  f.update(200);
  assert(f.currentMove().name === 'idle', 'weakSlash returns to idle after completion');
}

// 3. Test strongSlash playback & strike timing
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  let strikeFired = false;
  f.on('strike', (d) => {
    strikeFired = true;
    assert(d.strikeIndex === 0, 'strongSlash strikeIndex is 0');
    assert(d.declaredMs === 390, 'strongSlash strike declaredMs is 390');
  });
  const rc = f.play('strongSlash');
  assert(rc.totalMs === 700, 'play strongSlash returns totalMs: 700');
  assert(rc.strikeMs === 390, 'play strongSlash returns strikeMs: 390');
  f.update(380);
  assert(!strikeFired, 'strongSlash strike does not fire before 390ms');
  f.update(20);
  assert(strikeFired, 'strongSlash strike fires at 390ms');
  f.update(350);
  assert(f.currentMove().name === 'idle', 'strongSlash returns to idle after completion');
}

// 4. Test comboHeavy 3-hit strike sequence
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  const strikesReceived = [];
  f.on('strike', (d) => {
    strikesReceived.push({ idx: d.strikeIndex, declared: d.declaredMs, elapsed: d.elapsedMs });
  });
  const rc = f.play('comboHeavy');
  assert(rc.totalMs === 1400, 'play comboHeavy returns totalMs: 1400');
  assert(rc.strikeMs === 300, 'play comboHeavy returns initial strikeMs: 300');

  // Step to hit 1
  f.update(300);
  assert(strikesReceived.length === 1 && strikesReceived[0].idx === 0, 'comboHeavy hit 1 landed at 300ms');

  // Step to hit 2
  f.update(350); // 650ms total
  assert(strikesReceived.length === 2 && strikesReceived[1].idx === 1, 'comboHeavy hit 2 landed at 650ms');

  // Step to hit 3
  f.update(400); // 1050ms total
  assert(strikesReceived.length === 3 && strikesReceived[2].idx === 2, 'comboHeavy hit 3 landed at 1050ms');

  f.update(400); // 1450ms total
  assert(f.currentMove().name === 'idle', 'comboHeavy returns to idle after completion');
}

// 5. Test stumble whiff
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  let strikeFired = false;
  f.on('strike', () => { strikeFired = true; });
  const rc = f.play('stumble');
  assert(rc.totalMs === 1000, 'play stumble returns totalMs: 1000');
  f.update(1050);
  assert(!strikeFired, 'stumble never emits a strike event');
  assert(f.currentMove().name === 'idle', 'stumble returns to idle after completion');
}

// 6. Test knockdown persistence
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  const rc = f.play('knockdown');
  assert(rc.totalMs === 900, 'play knockdown returns totalMs: 900');
  f.update(950);
  assert(f.currentMove().name === 'knockdown', 'knockdown remains in knockdown pose (persistent)');
  f.update(1000);
  assert(f.currentMove().name === 'knockdown', 'knockdown stays persistent until reset');
  f.reset();
  assert(f.currentMove().name === 'idle', 'knockdown returns to idle on reset()');
}

// 7. Test victory persistence
{
  const f = new CF.Fighter({ x: 200, facing: 1 });
  const rc = f.play('victory');
  assert(rc.totalMs === 800, 'play victory returns totalMs: 800');
  f.update(850);
  assert(f.currentMove().name === 'victory', 'victory remains in victory pose (persistent)');
  f.reset();
  assert(f.currentMove().name === 'idle', 'victory returns to idle on reset()');
}

console.log('\n=== ALL GROUP 2 TESTS PASSED SUCCESSFULLY ===');
