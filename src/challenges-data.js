/**
 * src/challenges-data.js
 * 
 * Reusable Local Python Challenge Dataset
 * 12 high-quality challenges covering variables, conditionals, loops, functions, lists, and debugging.
 */

export const CHALLENGES = [
  {
    id: "special-slam-1",
    title: "Special Slam: Charge Calculation",
    topic: "conditionals",
    difficulty: "beginner",
    instructions: "Fix the syntax bug in special_attack(power, energy). When energy is 10 or greater, return double the power (power * 2); otherwise return 0.",
    signature: "def special_attack(power: int, energy: int) -> int",
    entrypoint: "special_attack",
    starterCode: `def special_attack(power, energy):
    if energy >= 10
        return power * 2
    return 0`,
    solutionCode: `def special_attack(power, energy):
    if energy >= 10:
        return power * 2
    return 0`,
    hints: [
      "Check line 2: Python 'if' conditions must terminate with a colon (:).",
      "Ensure the return statement inside the if block has 4 spaces of indentation."
    ],
    testCases: [
      { input: "special_attack(8, 12)", args: [8, 12], expected: 16 },
      { input: "special_attack(8, 5)", args: [8, 5], expected: 0 },
      { input: "special_attack(0, 12)", args: [0, 12], expected: 0 }
    ],
    unlockAction: "special"
  },
  {
    id: "strike-power-1",
    title: "Strike Power: Kinetic Boost",
    topic: "variables",
    difficulty: "beginner",
    instructions: "Calculate the final strike damage by adding base_damage to velocity multiplied by 3. Return the resulting integer.",
    signature: "def calc_strike(base_damage: int, velocity: int) -> int",
    entrypoint: "calc_strike",
    starterCode: `def calc_strike(base_damage, velocity):
    # Calculate base_damage + (velocity * 3)
    pass`,
    solutionCode: `def calc_strike(base_damage, velocity):
    return base_damage + (velocity * 3)`,
    hints: [
      "Use operator precedence: multiplication (*) has higher priority than addition (+).",
      "Formula: return base_damage + velocity * 3"
    ],
    testCases: [
      { input: "calc_strike(10, 4)", args: [10, 4], expected: 22 },
      { input: "calc_strike(15, 0)", args: [15, 0], expected: 15 },
      { input: "calc_strike(5, 10)", args: [5, 10], expected: 35 }
    ],
    unlockAction: "slash"
  },
  {
    id: "guard-defense-1",
    title: "Guard Defense: Shield Absorption",
    topic: "conditionals",
    difficulty: "beginner",
    instructions: "If is_blocking is True, absorb half the damage by returning incoming_damage // 2 (integer floor division). Otherwise, return incoming_damage in full.",
    signature: "def shield_absorb(incoming_damage: int, is_blocking: bool) -> int",
    entrypoint: "shield_absorb",
    starterCode: `def shield_absorb(incoming_damage, is_blocking):
    # Check if blocking and halve damage
    return incoming_damage`,
    solutionCode: `def shield_absorb(incoming_damage, is_blocking):
    if is_blocking:
        return incoming_damage // 2
    return incoming_damage`,
    hints: [
      "Use 'if is_blocking:' to branch.",
      "Use integer division '//' so the return value is an integer."
    ],
    testCases: [
      { input: "shield_absorb(30, True)", args: [30, true], expected: 15 },
      { input: "shield_absorb(25, False)", args: [25, false], expected: 25 },
      { input: "shield_absorb(0, True)", args: [0, true], expected: 0 }
    ],
    unlockAction: "block"
  },
  {
    id: "evasion-check-1",
    title: "Evasion Reflex: Duck Timing",
    topic: "conditionals",
    difficulty: "beginner",
    instructions: "Return True if agility is strictly greater than attack_speed; otherwise return False.",
    signature: "def can_dodge(agility: int, attack_speed: int) -> bool",
    entrypoint: "can_dodge",
    starterCode: `def can_dodge(agility, attack_speed):
    # Return True if agility > attack_speed
    return False`,
    solutionCode: `def can_dodge(agility, attack_speed):
    return agility > attack_speed`,
    hints: [
      "Comparison operator '>' evaluates directly to a boolean True or False.",
      "Equal speed (agility == attack_speed) should return False."
    ],
    testCases: [
      { input: "can_dodge(15, 10)", args: [15, 10], expected: true },
      { input: "can_dodge(10, 10)", args: [10, 10], expected: false },
      { input: "can_dodge(8, 12)", args: [8, 12], expected: false }
    ],
    unlockAction: "duck"
  },
  {
    id: "combo-counter-1",
    title: "Combo Counter: Accumulate Hits",
    topic: "loops",
    difficulty: "beginner",
    instructions: "Calculate cumulative combo damage. For each hit number from 1 up to hit_count (inclusive), add (base_damage + hit) to the total. If hit_count <= 0, return 0.",
    signature: "def total_combo_damage(hit_count: int, base_damage: int) -> int",
    entrypoint: "total_combo_damage",
    starterCode: `def total_combo_damage(hit_count, base_damage):
    total = 0
    # Loop from 1 to hit_count and accumulate damage
    return total`,
    solutionCode: `def total_combo_damage(hit_count, base_damage):
    total = 0
    for hit in range(1, hit_count + 1):
        total += base_damage + hit
    return total`,
    hints: [
      "Use range(1, hit_count + 1) to include hit_count.",
      "Add base_damage + hit on each step."
    ],
    testCases: [
      { input: "total_combo_damage(3, 10)", args: [3, 10], expected: 36 },
      { input: "total_combo_damage(1, 10)", args: [1, 10], expected: 11 },
      { input: "total_combo_damage(0, 10)", args: [0, 10], expected: 0 }
    ],
    unlockAction: "slash"
  },
  {
    id: "stamina-recovery-1",
    title: "Stamina Recovery: Cap at Max",
    topic: "loops",
    difficulty: "intermediate",
    instructions: "Each round restores 5 stamina. Loop for rounds times, adding 5 each round, but stamina must never exceed max_stamina. Return the final stamina.",
    signature: "def recover_stamina(current: int, max_stamina: int, rounds: int) -> int",
    entrypoint: "recover_stamina",
    starterCode: `def recover_stamina(current, max_stamina, rounds):
    stamina = current
    # Recover 5 per round, capped at max_stamina
    return stamina`,
    solutionCode: `def recover_stamina(current, max_stamina, rounds):
    stamina = current
    for _ in range(rounds):
        stamina = min(max_stamina, stamina + 5)
    return stamina`,
    hints: [
      "Use min(max_stamina, stamina + 5) inside the loop.",
      "If rounds is 0, the loop does not run and current stamina is returned."
    ],
    testCases: [
      { input: "recover_stamina(80, 100, 3)", args: [80, 100, 3], expected: 95 },
      { input: "recover_stamina(92, 100, 4)", args: [92, 100, 4], expected: 100 },
      { input: "recover_stamina(50, 100, 0)", args: [50, 100, 0], expected: 50 }
    ],
    unlockAction: "block"
  },
  {
    id: "critical-hit-1",
    title: "Critical Hit: Multiplier Bonus",
    topic: "functions",
    difficulty: "intermediate",
    instructions: "If is_crit is True, multiply damage by multiplier and return the integer floor using int(). Otherwise return damage unchanged.",
    signature: "def calc_crit(damage: int, is_crit: bool, multiplier: float) -> int",
    entrypoint: "calc_crit",
    starterCode: `def calc_crit(damage, is_crit, multiplier):
    # Return int(damage * multiplier) if is_crit else damage
    return damage`,
    solutionCode: `def calc_crit(damage, is_crit, multiplier):
    if is_crit:
        return int(damage * multiplier)
    return damage`,
    hints: [
      "Use int() to truncate float multiplication to an integer.",
      "Check if is_crit is True before applying multiplier."
    ],
    testCases: [
      { input: "calc_crit(20, True, 2.5)", args: [20, true, 2.5], expected: 50 },
      { input: "calc_crit(20, False, 2.5)", args: [20, false, 2.5], expected: 20 },
      { input: "calc_crit(15, True, 1.5)", args: [15, true, 1.5], expected: 22 }
    ],
    unlockAction: "special"
  },
  {
    id: "potion-inventory-1",
    title: "Potion Inventory: Sum Healing",
    topic: "lists",
    difficulty: "beginner",
    instructions: "Given a list of healing potion numbers, return the total sum of healing. Return 0 if the list is empty.",
    signature: "def total_healing(potions: list) -> int",
    entrypoint: "total_healing",
    starterCode: `def total_healing(potions):
    # Return total sum of potions
    pass`,
    solutionCode: `def total_healing(potions):
    return sum(potions)`,
    hints: [
      "Python built-in sum(potions) handles both empty and populated lists cleanly.",
      "Alternatively, loop through the list and add to a running total."
    ],
    testCases: [
      { input: "total_healing([10, 20, 15])", args: [[10, 20, 15]], expected: 45 },
      { input: "total_healing([])", args: [[]], expected: 0 },
      { input: "total_healing([50])", args: [[50]], expected: 50 }
    ],
    unlockAction: "block"
  },
  {
    id: "max-threat-1",
    title: "Threat Assessment: Highest Power",
    topic: "lists",
    difficulty: "intermediate",
    instructions: "Find and return the highest enemy power value from the enemy_powers list. Return 0 if the list is empty.",
    signature: "def max_threat(enemy_powers: list) -> int",
    entrypoint: "max_threat",
    starterCode: `def max_threat(enemy_powers):
    # Return maximum threat or 0 if empty
    pass`,
    solutionCode: `def max_threat(enemy_powers):
    if not enemy_powers:
        return 0
    return max(enemy_powers)`,
    hints: [
      "Guard against empty lists first using 'if not enemy_powers: return 0'.",
      "Use max(enemy_powers) for non-empty lists."
    ],
    testCases: [
      { input: "max_threat([12, 45, 23, 8])", args: [[12, 45, 23, 8]], expected: 45 },
      { input: "max_threat([5])", args: [[5]], expected: 5 },
      { input: "max_threat([])", args: [[]], expected: 0 }
    ],
    unlockAction: "special"
  },
  {
    id: "filter-alive-1",
    title: "Combat Sweep: Count Standing Fighters",
    topic: "lists",
    difficulty: "intermediate",
    instructions: "Given health_list, count and return how many fighters still have health strictly greater than 0.",
    signature: "def count_alive(health_list: list) -> int",
    entrypoint: "count_alive",
    starterCode: `def count_alive(health_list):
    count = 0
    # Count how many fighters have hp > 0
    return count`,
    solutionCode: `def count_alive(health_list):
    count = 0
    for hp in health_list:
        if hp > 0:
            count += 1
    return count`,
    hints: [
      "Loop through each hp in health_list.",
      "Increment count only when hp > 0."
    ],
    testCases: [
      { input: "count_alive([100, 0, 45, -5, 80])", args: [[100, 0, 45, -5, 80]], expected: 3 },
      { input: "count_alive([0, -10])", args: [[0, -10]], expected: 0 },
      { input: "count_alive([])", args: [[]], expected: 0 }
    ],
    unlockAction: "slash"
  },
  {
    id: "debug-indent-1",
    title: "Debug: Fix Meter Indentation",
    topic: "debugging",
    difficulty: "beginner",
    instructions: "Fix the IndentationError in block_meter(gauge, delta). Add delta to gauge and return the result capped at 100.",
    signature: "def block_meter(gauge: int, delta: int) -> int",
    entrypoint: "block_meter",
    starterCode: `def block_meter(gauge, delta):
result = gauge + delta
    if result > 100:
        return 100
    return result`,
    solutionCode: `def block_meter(gauge, delta):
    result = gauge + delta
    if result > 100:
        return 100
    return result`,
    hints: [
      "In Python, all lines inside a function block must be indented with 4 spaces.",
      "Check line 2: 'result = gauge + delta' is missing its indentation."
    ],
    testCases: [
      { input: "block_meter(40, 20)", args: [40, 20], expected: 60 },
      { input: "block_meter(90, 20)", args: [90, 20], expected: 100 },
      { input: "block_meter(0, 10)", args: [0, 10], expected: 10 }
    ],
    unlockAction: "block"
  },
  {
    id: "debug-typo-1",
    title: "Debug: Fix Variable Name Typo",
    topic: "debugging",
    difficulty: "beginner",
    instructions: "Fix the NameError typo in speed_boost(speed, duration). It should return the product of speed and duration.",
    signature: "def speed_boost(speed: int, duration: int) -> int",
    entrypoint: "speed_boost",
    starterCode: `def speed_boost(speed, duration):
    # Typo on variable name
    return spedd * duration`,
    solutionCode: `def speed_boost(speed, duration):
    return speed * duration`,
    hints: [
      "Look closely at the return line: 'spedd' is not defined.",
      "Replace 'spedd' with the parameter 'speed'."
    ],
    testCases: [
      { input: "speed_boost(10, 5)", args: [10, 5], expected: 50 },
      { input: "speed_boost(0, 5)", args: [0, 5], expected: 0 },
      { input: "speed_boost(8, 2)", args: [8, 2], expected: 16 }
    ],
    unlockAction: "duck"
  }
];

export default CHALLENGES;
