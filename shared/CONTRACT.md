CODE FIGHTERS CONTRACT v1



RULES FOR BOTH TRACKS

1\. Plain browser JavaScript with classic <script> tags. No ES modules, no frameworks, no build step for browser code.

2\. One global namespace: window.CF. Every file starts with: window.CF = window.CF || {};

3\. net/ owns CF.Net.\* . anim/ owns CF.Fighter, CF.getMoveInfo and CF.Effects. Never edit the other track's folder.

4\. If you think this contract is wrong, say so in your final message. Do not change it silently.



MOVE NAMES (exact, camelCase)

idle, stepLeft, stepRight, jump, duck, block, slash, weakSlash, strongSlash, comboHeavy, stumble, hurt, knockdown, victory, enemyAttack, feint, special, riposte, spinSlash, backflipEvade, dashThrust, focus



FIGHTER API (implemented by anim/, imitated by net/stub/StubFighter)

new CF.Fighter({x, facing: 1 or -1, accent: '#hex'})

f.play(name, opts) returns {id, totalMs, strikeMs}

&#x20; opts: speed (1), tier ('easy','medium','hard'), holdMs, windupMs (3000), tellMs (2000), dir ('h', 'v' or 'pending')

f.resolveDir(dir)   supplies the direction when play used dir 'pending'. If it has not arrived by tellMs the fighter holds the neutral coil until it does.

f.update(dtMs)   f.draw(ctx)   f.cancel()   f.reset()   f.isBusy()

f.currentMove() returns {name, tags, elapsedMs}

f.react(name)   name is 'blocked', 'dodged', 'parried' or 'hit'

f.setShield(bool)   f.shieldBreak()

f.on(event, cb)   events: 'strike' {strikeIndex, tag}, 'tell' {dir}, 'parry', 'end', 'shieldBreak'

CF.getMoveInfo(name) returns {totalMs, strikeMs or strikeTimes\[], persistent, tags}

&#x20; tags used: attack, block, dodge, reaction, special, persistent

&#x20; dodge tag moves: duck, stepLeft, stepRight, jump, backflipEvade



NETWORK MESSAGES

Every message is a JSON object with v (always 1) and t (type). Max 1 KB. Unknown types and fields are ignored.

&#x20; hello   id (8 random chars), name (max 16 chars, shown as text only, never as HTML)

&#x20; ping    n (counter), ts (sender clock, ms)

&#x20; pong    n, ts (copied from ping), rts (responder clock, ms)

&#x20; action  seq (counter per sender), move (a move name above), opts (small object; for enemyAttack and feint NEVER include dir), ts

&#x20; tell    seq, dir ('h' or 'v'); the attacker sends it about 300 ms before the tell moment of an enemyAttack or feint

&#x20; result  seq, outcome ('hit','blocked','dodged','parried'); sent by the DEFENDER after its own check

&#x20; bye



DEFENDER DECIDES

When an action arrives, replay the move on the remote fighter (use dir 'pending' for enemyAttack and feint, then resolveDir when the tell message arrives). At receipt time plus strikeMs, the receiving player's own client checks its own fighter:

&#x20; block active -> 'blocked'

&#x20; riposte active -> 'parried'

&#x20; a dodge-tag move active that counters the attack -> 'dodged'

&#x20; otherwise -> 'hit'

It plays the reaction locally and sends a result message. The attacker's client shows the same reaction on the remote fighter when the result arrives. A modified client could lie; this is accepted for a friends-only game.



WHICH DODGE COUNTERS WHAT (Phase 0 rule, to be tuned)

&#x20; enemyAttack with dir h: duck or backflipEvade

&#x20; enemyAttack with dir v: stepLeft, stepRight or backflipEvade

&#x20; every other attack: block, or any dodge-tag move

&#x20; feint: never sends a strike and never produces a result

