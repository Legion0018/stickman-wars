/**
 * src/challenges-data.js
 *
 * Reusable Local Python Challenge Dataset
 * 24 validated challenges covering variables, conditionals, loops, functions, lists, and debugging.
 *
 * Tiers:
 * - Basic: 8 challenges (variables, conditionals, loops, lists, debugging)
 * - Intermediate: 8 challenges (loops, functions, lists, debugging)
 * - Hard: 8 challenges (functions, loops, lists, conditionals, variables, debugging)
 *
 * Licensing & Attribution:
 * - Handcrafted combat-themed challenges: (c) Stickman Wars Authors (MIT License)
 * - Adapted canonical programming specifications: Exercism (Python track, MIT License)
 *   and TheAlgorithms / Python (MIT License).
 * All test cases and reference solutions are deterministically evaluated locally.
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
  },
  {
    id: "combo-chain-2",
    title: "Combo Chain: Escalating Multiplier",
    topic: "loops",
    difficulty: "intermediate",
    instructions: "Calculate cumulative damage for a combo sequence. Start with multiplier = 1. For each hit in hit_values, add hit * multiplier to total. If hit > 10, increase multiplier by 1 for subsequent hits. Return the total damage.",
    signature: "def combo_chain(hit_values: list) -> int",
    entrypoint: "combo_chain",
    starterCode: `def combo_chain(hit_values):
    total = 0
    # Calculate damage with escalating multiplier
    return total`,
    solutionCode: `def combo_chain(hit_values):
    total = 0
    multiplier = 1
    for hit in hit_values:
        total += hit * multiplier
        if hit > 10:
            multiplier += 1
    return total`,
    hints: [
      "Start multiplier at 1.",
      "Check if hit > 10 after adding to total, then increment multiplier by 1."
    ],
    testCases: [
      { input: "combo_chain([5, 12, 8])", args: [[5, 12, 8]], expected: 33 },
      { input: "combo_chain([])", args: [[]], expected: 0 },
      { input: "combo_chain([15, 20])", args: [[15, 20]], expected: 55 }
    ],
    unlockAction: "slash"
  },
  {
    id: "parry-timing-2",
    title: "Parry Window: Reaction Velocity",
    topic: "functions",
    difficulty: "intermediate",
    instructions: "A parry succeeds if defender_reaction is within tolerance milliseconds of attack_impact (inclusive), meaning abs(defender_reaction - attack_impact) <= tolerance. Return True if parry succeeds, False otherwise.",
    signature: "def can_parry(defender_reaction: int, attack_impact: int, tolerance: int) -> bool",
    entrypoint: "can_parry",
    starterCode: `def can_parry(defender_reaction, attack_impact, tolerance):
    # Return True if reaction is within tolerance of impact
    return False`,
    solutionCode: `def can_parry(defender_reaction, attack_impact, tolerance):
    return abs(defender_reaction - attack_impact) <= tolerance`,
    hints: [
      "Use Python's built-in abs() function.",
      "Compare with <= tolerance."
    ],
    testCases: [
      { input: "can_parry(310, 300, 15)", args: [310, 300, 15], expected: true },
      { input: "can_parry(325, 300, 15)", args: [325, 300, 15], expected: false },
      { input: "can_parry(300, 300, 0)", args: [300, 300, 0], expected: true }
    ],
    unlockAction: "block"
  },
  {
    id: "target-priority-2",
    title: "Target Priority: Filter Threat Range",
    topic: "lists",
    difficulty: "intermediate",
    instructions: "Given a list of enemy distances (in meters), filter and return a new list containing only enemies within threat range (distance <= max_range), sorted in ascending order (closest enemies first).",
    signature: "def priority_targets(distances: list, max_range: int) -> list",
    entrypoint: "priority_targets",
    starterCode: `def priority_targets(distances, max_range):
    # Return sorted list of distances <= max_range
    return []`,
    solutionCode: `def priority_targets(distances, max_range):
    in_range = [d for d in distances if d <= max_range]
    in_range.sort()
    return in_range`,
    hints: [
      "Filter distances with d <= max_range.",
      "Sort the resulting list in ascending order."
    ],
    testCases: [
      { input: "priority_targets([15, 4, 25, 8, 2], 10)", args: [[15, 4, 25, 8, 2], 10], expected: [2, 4, 8] },
      { input: "priority_targets([30, 40], 20)", args: [[30, 40], 20], expected: [] },
      { input: "priority_targets([], 10)", args: [[], 10], expected: [] }
    ],
    unlockAction: "duck"
  },
  {
    id: "debug-syntax-loop-2",
    title: "Debug: Fix While Loop Condition",
    topic: "debugging",
    difficulty: "intermediate",
    instructions: "Fix the loop condition in charge_shield(charge, target). While charge is strictly less than target, add 5 to charge. Return the final charge value. If charge is already >= target, return charge unchanged.",
    signature: "def charge_shield(charge: int, target: int) -> int",
    entrypoint: "charge_shield",
    starterCode: `def charge_shield(charge, target):
    # Fix the loop condition
    while charge > target:
        charge += 5
    return charge`,
    solutionCode: `def charge_shield(charge, target):
    while charge < target:
        charge += 5
    return charge`,
    hints: [
      "Notice the comparison: charge > target will never loop if charge < target.",
      "Change condition to charge < target."
    ],
    testCases: [
      { input: "charge_shield(10, 25)", args: [10, 25], expected: 25 },
      { input: "charge_shield(20, 20)", args: [20, 20], expected: 20 },
      { input: "charge_shield(30, 20)", args: [30, 20], expected: 30 },
      { input: "charge_shield(0, 12)", args: [0, 12], expected: 15 }
    ],
    unlockAction: "block"
  },
  {
    id: "special-overdrive-3",
    title: "Overdrive Matrix: Energy Conversion",
    topic: "functions",
    difficulty: "advanced",
    instructions: "Calculate amplified strike damage across energy levels. Given base_power and an energy_levels list, for each energy level: if energy >= 50, amplify by 2.5; elif energy >= 20, amplify by 1.5; else multiply by 0.5. Add int() of each amplified strike to total. Return the total.",
    signature: "def overdrive_total(base_power: int, energy_levels: list) -> int",
    entrypoint: "overdrive_total",
    starterCode: `def overdrive_total(base_power, energy_levels):
    total = 0
    # Calculate amplified energy strikes
    return total`,
    solutionCode: `def overdrive_total(base_power, energy_levels):
    total = 0
    for e in energy_levels:
        if e >= 50:
            total += int(base_power * 2.5)
        elif e >= 20:
            total += int(base_power * 1.5)
        else:
            total += int(base_power * 0.5)
    return total`,
    hints: [
      "Iterate through each energy level.",
      "Use int(base_power * factor) to truncate to integer.",
      "Return 0 if list is empty."
    ],
    testCases: [
      { input: "overdrive_total(10, [60, 25, 10])", args: [10, [60, 25, 10]], expected: 45 },
      { input: "overdrive_total(20, [100])", args: [20, [100]], expected: 50 },
      { input: "overdrive_total(15, [])", args: [15, []], expected: 0 }
    ],
    unlockAction: "special"
  },
  {
    id: "longest-dodge-streak-3",
    title: "Evasion Mastery: Longest Dodge Streak",
    topic: "loops",
    difficulty: "advanced",
    instructions: "Given a combat log where True indicates a successful dodge and False indicates a hit taken, find and return the length of the longest consecutive dodge streak. Return 0 if combat_log is empty or contains no dodges.",
    signature: "def longest_dodge_streak(combat_log: list) -> int",
    entrypoint: "longest_dodge_streak",
    starterCode: `def longest_dodge_streak(combat_log):
    max_streak = 0
    # Count longest consecutive True streak
    return max_streak`,
    solutionCode: `def longest_dodge_streak(combat_log):
    max_streak = 0
    current = 0
    for dodge in combat_log:
        if dodge:
            current += 1
            if current > max_streak:
                max_streak = current
        else:
            current = 0
    return max_streak`,
    hints: [
      "Keep track of both current streak and maximum streak.",
      "Reset current streak to 0 when an entry is False."
    ],
    testCases: [
      { input: "longest_dodge_streak([True, True, False, True, True, True, False])", args: [[true, true, false, true, true, true, false]], expected: 3 },
      { input: "longest_dodge_streak([False, False])", args: [[false, false]], expected: 0 },
      { input: "longest_dodge_streak([])", args: [[]], expected: 0 },
      { input: "longest_dodge_streak([True, True, True, True])", args: [[true, true, true, true]], expected: 4 }
    ],
    unlockAction: "duck"
  },
  {
    id: "optimal-strike-pair-3",
    title: "Tactical Strike: Two-Hit Combination",
    topic: "lists",
    difficulty: "advanced",
    instructions: "Find two distinct strikes in strike_damage list whose sum equals exact target_hp. Return a list of their indices [i, j] with i < j. If no two strikes sum to target_hp, return an empty list [].",
    signature: "def find_strike_pair(strike_damage: list, target_hp: int) -> list",
    entrypoint: "find_strike_pair",
    starterCode: `def find_strike_pair(strike_damage, target_hp):
    # Find indices [i, j] where strike_damage[i] + strike_damage[j] == target_hp
    return []`,
    solutionCode: `def find_strike_pair(strike_damage, target_hp):
    seen = {}
    for i, val in enumerate(strike_damage):
        comp = target_hp - val
        if comp in seen:
            return [seen[comp], i]
        seen[val] = i
    return []`,
    hints: [
      "Use a hash map / dictionary to store seen strike damage values and their indices.",
      "Return [seen[comp], i] when comp is found."
    ],
    testCases: [
      { input: "find_strike_pair([10, 25, 30, 45, 15], 40)", args: [[10, 25, 30, 45, 15], 40], expected: [0, 2] },
      { input: "find_strike_pair([5, 8, 12], 20)", args: [[5, 8, 12], 20], expected: [1, 2] },
      { input: "find_strike_pair([10, 20], 50)", args: [[10, 20], 50], expected: [] }
    ],
    unlockAction: "slash"
  },
  {
    id: "armor-defense-matrix-3",
    title: "Armor Matrix: Tiered Mitigation",
    topic: "conditionals",
    difficulty: "advanced",
    instructions: "Calculate mitigated damage using defense dictionary with keys 'armor_rating' (int), 'shield_active' (bool), and 'fortify_stacks' (int). If shield_active is True: damage is reduced by armor_rating * 2; else by armor_rating. Each fortify stack subtracts an additional 3 damage. Damage can never drop below 0. Return net damage as int.",
    signature: "def calculate_mitigated_damage(incoming: int, defense: dict) -> int",
    entrypoint: "calculate_mitigated_damage",
    starterCode: `def calculate_mitigated_damage(incoming, defense):
    # Calculate damage after armor, shield, and fortify reduction
    return incoming`,
    solutionCode: `def calculate_mitigated_damage(incoming, defense):
    armor = defense.get('armor_rating', 0)
    shield = defense.get('shield_active', False)
    fortify = defense.get('fortify_stacks', 0)
    reduction = (armor * 2 if shield else armor) + (fortify * 3)
    return max(0, incoming - reduction)`,
    hints: [
      "Use defense.get() with fallback defaults.",
      "Make sure to return max(0, incoming - reduction) so damage is never negative."
    ],
    testCases: [
      { input: "calculate_mitigated_damage(50, {'armor_rating': 10, 'shield_active': True, 'fortify_stacks': 2})", args: [50, { armor_rating: 10, shield_active: true, fortify_stacks: 2 }], expected: 24 },
      { input: "calculate_mitigated_damage(30, {'armor_rating': 15, 'shield_active': False, 'fortify_stacks': 5})", args: [30, { armor_rating: 15, shield_active: false, fortify_stacks: 5 }], expected: 0 },
      { input: "calculate_mitigated_damage(20, {'armor_rating': 25, 'shield_active': True, 'fortify_stacks': 0})", args: [20, { armor_rating: 25, shield_active: true, fortify_stacks: 0 }], expected: 0 }
    ],
    unlockAction: "block"
  },
  {
    id: "grid-flank-path-3",
    title: "Tactical Flank: Arena Grid Perimeter",
    topic: "lists",
    difficulty: "advanced",
    instructions: "In a 2D arena grid represented as a list of lists of integers, calculate the total hazard cost along the perimeter (first row, last row, first column, last column). Do not double-count corner cells! If the grid is empty or 1x1, return the total sum of cells safely.",
    signature: "def perimeter_hazard(grid: list) -> int",
    entrypoint: "perimeter_hazard",
    starterCode: `def perimeter_hazard(grid):
    # Return sum of all cells on the outer perimeter of the 2D grid
    return 0`,
    solutionCode: `def perimeter_hazard(grid):
    if not grid or not grid[0]:
        return 0
    rows = len(grid)
    cols = len(grid[0])
    if rows == 1:
        return sum(grid[0])
    if cols == 1:
        return sum(grid[r][0] for r in range(rows))
    total = sum(grid[0]) + sum(grid[rows - 1])
    for r in range(1, rows - 1):
        total += grid[r][0] + grid[r][cols - 1]
    return total`,
    hints: [
      "Sum the first row and last row completely.",
      "For the intermediate rows, add only the first and last column elements."
    ],
    testCases: [
      { input: "perimeter_hazard([[1, 2, 3], [4, 5, 6], [7, 8, 9]])", args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: 40 },
      { input: "perimeter_hazard([[5, 10], [15, 20]])", args: [[[5, 10], [15, 20]]], expected: 50 },
      { input: "perimeter_hazard([])", args: [[]], expected: 0 },
      { input: "perimeter_hazard([[42]])", args: [[[42]]], expected: 42 }
    ],
    unlockAction: "duck"
  },
  {
    id: "stamina-budget-knapsack-3",
    title: "Stamina Allocation: Maximize Move Power",
    topic: "loops",
    difficulty: "advanced",
    instructions: "You have stamina_budget and a list of techniques, where each technique is a dict with 'cost' (int) and 'power' (int). Each technique can be used at most once. Find the maximum total power achievable without exceeding stamina_budget.",
    signature: "def max_combat_power(techniques: list, stamina_budget: int) -> int",
    entrypoint: "max_combat_power",
    starterCode: `def max_combat_power(techniques, stamina_budget):
    # Find maximum power achievable within stamina budget
    return 0`,
    solutionCode: `def max_combat_power(techniques, stamina_budget):
    dp = [0] * (stamina_budget + 1)
    for tech in techniques:
        cost = tech['cost']
        power = tech['power']
        for w in range(stamina_budget, cost - 1, -1):
            if dp[w - cost] + power > dp[w]:
                dp[w] = dp[w - cost] + power
    return dp[stamina_budget]`,
    hints: [
      "Use a 1D dynamic programming array dp of size stamina_budget + 1.",
      "Iterate backwards from stamina_budget down to cost to avoid reusing the same technique."
    ],
    testCases: [
      { input: "max_combat_power([{'cost': 2, 'power': 10}, {'cost': 3, 'power': 20}, {'cost': 4, 'power': 30}], 5)", args: [[{ cost: 2, power: 10 }, { cost: 3, power: 20 }, { cost: 4, power: 30 }], 5], expected: 30 },
      { input: "max_combat_power([], 10)", args: [[], 10], expected: 0 },
      { input: "max_combat_power([{'cost': 10, 'power': 100}], 5)", args: [[{ cost: 10, power: 100 }], 5], expected: 0 }
    ],
    unlockAction: "special"
  },
  {
    id: "debug-recursion-depth-3",
    title: "Debug: Fix Factorial Combo Multiplier",
    topic: "debugging",
    difficulty: "advanced",
    instructions: "Fix the missing base case and negative guard in combo_multiplier(n). It should compute the mathematical factorial n! for n >= 0 (where 0! = 1 and 1! = 1). If n < 0, return 0.",
    signature: "def combo_multiplier(n: int) -> int",
    entrypoint: "combo_multiplier",
    starterCode: `def combo_multiplier(n):
    # Fix the missing base case and negative guard
    return n * combo_multiplier(n - 1)`,
    solutionCode: `def combo_multiplier(n):
    if n < 0:
        return 0
    if n <= 1:
        return 1
    res = 1
    for i in range(2, n + 1):
        res *= i
    return res`,
    hints: [
      "Guard against negative input: if n < 0: return 0.",
      "Ensure n == 0 and n == 1 return 1 without infinite recursion."
    ],
    testCases: [
      { input: "combo_multiplier(4)", args: [4], expected: 24 },
      { input: "combo_multiplier(0)", args: [0], expected: 1 },
      { input: "combo_multiplier(1)", args: [1], expected: 1 },
      { input: "combo_multiplier(-3)", args: [-3], expected: 0 }
    ],
    unlockAction: "slash"
  },
  {
    id: "counter-cadence-analyzer-3",
    title: "Counter Cadence: Rhythm Analysis",
    topic: "variables",
    difficulty: "advanced",
    instructions: "Given a list of strike interval timestamps (in milliseconds), determine if the sequence is rhythmic. A sequence is rhythmic if the difference between every consecutive timestamp is identical within a jitter tolerance of 2ms (i.e. max_diff - min_diff <= 2). If there are fewer than 3 timestamps, return False.",
    signature: "def is_rhythmic_attack(timestamps: list) -> bool",
    entrypoint: "is_rhythmic_attack",
    starterCode: `def is_rhythmic_attack(timestamps):
    # Return True if intervals between timestamps have <= 2ms variance\n    return False`,
    solutionCode: `def is_rhythmic_attack(timestamps):
    if len(timestamps) < 3:
        return False
    intervals = [timestamps[i] - timestamps[i - 1] for i in range(1, len(timestamps))]
    return (max(intervals) - min(intervals)) <= 2`,
    hints: [
      "Calculate differences between consecutive timestamps.",
      "Check if max(intervals) - min(intervals) <= 2.",
      "Return False if len(timestamps) < 3."
    ],
    testCases: [
      { input: "is_rhythmic_attack([100, 200, 301, 400])", args: [[100, 200, 301, 400]], expected: true },
      { input: "is_rhythmic_attack([100, 200, 350])", args: [[100, 200, 350]], expected: false },
      { input: "is_rhythmic_attack([100, 200])", args: [[100, 200]], expected: false }
    ],
    unlockAction: "duck"
  }
];

/**
 * Dedicated Tactical Combat AI Move Strategy Challenge
 * Author a deterministic decision function: choose_move(opponent_state, player_state) -> str
 * Permitted outputs: 'heavy', 'block', 'duck', 'slash'
 */
export const TACTICAL_MOVE_CHALLENGE = {
  id: "tactical-move-strategy",
  title: "Tactical Combat AI: Move Strategy Selector",
  topic: "dictionaries",
  difficulty: "advanced",
  instructions: "Author a tactical decision function choose_move(opponent_state, player_state) -> str. Both arguments are read-only state dictionaries.\\n\\nTactical Rules:\\n1. If opponent is preparing heavy attack (opponent_state.get('is_attacking') and opponent_state.get('action') == 'heavy'): return 'duck'.\\n2. If opponent is blocking (opponent_state.get('is_blocking') is True): return 'heavy'.\\n3. If opponent is idle and player's special is ready (player_state.get('special_ready') is True): return 'heavy'.\\n4. In all other neutral situations: return 'slash'.\\n\\nPermitted return values are strictly: 'heavy', 'block', 'duck', or 'slash'.",
  signature: "def choose_move(opponent_state: dict, player_state: dict) -> str",
  entrypoint: "choose_move",
  starterCode: `def choose_move(opponent_state, player_state):
    # Analyze state snapshots and return 'heavy', 'block', 'duck', or 'slash'
    return 'slash'`,
  solutionCode: `def choose_move(opponent_state, player_state):
    if opponent_state.get('is_attacking') and opponent_state.get('action') == 'heavy':
        return 'duck'
    if opponent_state.get('is_blocking', False):
        return 'heavy'
    if player_state.get('special_ready', False):
        return 'heavy'
    return 'slash'`,
  hints: [
    "Check opponent_state.get('is_attacking') and action == 'heavy' first to dodge.",
    "Counter defensive opponents (is_blocking=True) with 'heavy'.",
    "Return only permitted move names: 'heavy', 'block', 'duck', or 'slash'."
  ],
  testCases: [
    {
      input: "choose_move({'is_attacking': True, 'action': 'heavy', 'is_blocking': False, 'hp': 80}, {'hp': 100, 'special_ready': True, 'heal_available': True})",
      args: [{ is_attacking: true, action: 'heavy', is_blocking: false, hp: 80 }, { hp: 100, special_ready: true, heal_available: true }],
      expected: "duck"
    },
    {
      input: "choose_move({'is_attacking': False, 'action': 'none', 'is_blocking': True, 'hp': 70}, {'hp': 90, 'special_ready': False, 'heal_available': True})",
      args: [{ is_attacking: false, action: 'none', is_blocking: true, hp: 70 }, { hp: 90, special_ready: false, heal_available: true }],
      expected: "heavy"
    },
    {
      input: "choose_move({'is_attacking': False, 'action': 'none', 'is_blocking': False, 'hp': 100}, {'hp': 100, 'special_ready': True, 'heal_available': True})",
      args: [{ is_attacking: false, action: 'none', is_blocking: false, hp: 100 }, { hp: 100, special_ready: true, heal_available: true }],
      expected: "heavy"
    },
    {
      input: "choose_move({'is_attacking': False, 'action': 'none', 'is_blocking': False, 'hp': 50}, {'hp': 60, 'special_ready': False, 'heal_available': True})",
      args: [{ is_attacking: false, action: 'none', is_blocking: false, hp: 50 }, { hp: 60, special_ready: false, heal_available: true }],
      expected: "slash"
    }
  ],
  unlockAction: "special",
  isTacticalStrategy: true
};

export default CHALLENGES;
