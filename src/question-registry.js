/**
 * src/question-registry.js
 * 
 * Local Question Loader and Registry for Python Combat Challenges.
 * 
 * Key Responsibilities:
 * 1. Strict schema validation for question definitions.
 * 2. Safe challenge lookup by ID with deep cloning (preventing mutation leaks).
 * 3. Graceful fallback on unknown or malformed challenges.
 * 4. Filtering by topic, difficulty, and unlockable action.
 * 5. Sequential/progressive challenge navigation.
 */

import { CHALLENGES } from './challenges-data.js';

export const ALLOWED_TOPICS = ['variables', 'conditionals', 'loops', 'functions', 'lists', 'debugging'];
export const ALLOWED_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
export const ALLOWED_ACTIONS = ['special', 'slash', 'block', 'duck'];

export class QuestionRegistry {
  /**
   * @param {Array} [initialChallenges] - Initial array of challenge definitions
   */
  constructor(initialChallenges = CHALLENGES) {
    this._challenges = new Map();
    this.registerAll(initialChallenges);
  }

  /**
   * Validates a challenge object against the question schema
   * @param {object} c - Challenge object to validate
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateSchema(c) {
    const errors = [];

    if (!c || typeof c !== 'object') {
      return { valid: false, errors: ['Challenge must be a non-null object.'] };
    }

    // 1. ID
    if (typeof c.id !== 'string' || !c.id.trim() || !/^[a-z0-9-_]+$/i.test(c.id)) {
      errors.push(`Invalid 'id': must be non-empty alphanumeric string with dashes/underscores.`);
    }

    // 2. Title
    if (typeof c.title !== 'string' || !c.title.trim()) {
      errors.push(`Invalid 'title': must be a non-empty string.`);
    }

    // 3. Topic
    if (!ALLOWED_TOPICS.includes(c.topic)) {
      errors.push(`Invalid 'topic': must be one of [${ALLOWED_TOPICS.join(', ')}]. Received '${c.topic}'.`);
    }

    // 4. Difficulty
    if (!ALLOWED_DIFFICULTIES.includes(c.difficulty)) {
      errors.push(`Invalid 'difficulty': must be one of [${ALLOWED_DIFFICULTIES.join(', ')}]. Received '${c.difficulty}'.`);
    }

    // 5. Instructions
    if (typeof c.instructions !== 'string' || !c.instructions.trim()) {
      errors.push(`Invalid 'instructions': must be a non-empty string.`);
    }

    // 6. Signature
    if (typeof c.signature !== 'string' || !c.signature.trim()) {
      errors.push(`Invalid 'signature': must be a non-empty string.`);
    }

    // 7. Entrypoint
    if (typeof c.entrypoint !== 'string' || !/^[a-zA-Z_]\w*$/.test(c.entrypoint)) {
      errors.push(`Invalid 'entrypoint': must be a valid Python identifier. Received '${c.entrypoint}'.`);
    }

    // 8. Starter Code
    if (typeof c.starterCode !== 'string') {
      errors.push(`Invalid 'starterCode': must be a string.`);
    }

    // 9. Solution Code
    if (typeof c.solutionCode !== 'string' || !c.solutionCode.trim()) {
      errors.push(`Invalid 'solutionCode': must be a non-empty string.`);
    }

    // 10. Hints
    if (!Array.isArray(c.hints)) {
      errors.push(`Invalid 'hints': must be an array of strings.`);
    }

    // 11. Test Cases
    if (!Array.isArray(c.testCases) || c.testCases.length === 0) {
      errors.push(`Invalid 'testCases': must be a non-empty array.`);
    } else {
      c.testCases.forEach((tc, idx) => {
        if (!tc || typeof tc !== 'object') {
          errors.push(`testCases[${idx}] must be an object.`);
        } else {
          if (!Array.isArray(tc.args)) {
            errors.push(`testCases[${idx}].args must be an array.`);
          }
          if (!('expected' in tc)) {
            errors.push(`testCases[${idx}] missing required 'expected' property.`);
          }
        }
      });
    }

    // 12. Unlock Action
    if (!ALLOWED_ACTIONS.includes(c.unlockAction)) {
      errors.push(`Invalid 'unlockAction': must be one of [${ALLOWED_ACTIONS.join(', ')}]. Received '${c.unlockAction}'.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Register a new challenge in the registry
   * @param {object} challenge
   * @returns {boolean} true if registered successfully
   */
  register(challenge) {
    const result = this.validateSchema(challenge);
    if (!result.valid) {
      console.warn(`[QuestionRegistry] Rejected malformed challenge '${challenge?.id}':`, result.errors);
      return false;
    }

    // Store a deep clone to prevent external mutation
    this._challenges.set(challenge.id, JSON.parse(JSON.stringify(challenge)));
    return true;
  }

  /**
   * Register an array of challenges
   * @param {Array} challenges
   * @returns {number} count of successfully registered challenges
   */
  registerAll(challenges) {
    if (!Array.isArray(challenges)) return 0;
    let count = 0;
    for (const c of challenges) {
      if (this.register(c)) count++;
    }
    return count;
  }

  /**
   * Retrieve a challenge by unique ID
   * @param {string} id
   * @returns {object|null} Cloned challenge object or null if not found
   */
  get(id) {
    if (!id || typeof id !== 'string') return null;
    const found = this._challenges.get(id);
    if (!found) return null;
    return JSON.parse(JSON.stringify(found));
  }

  /**
   * Check if a challenge ID exists in the registry
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    if (!id || typeof id !== 'string') return false;
    return this._challenges.has(id);
  }

  /**
   * Return the default challenge (regression champion: 'special-slam-1')
   * @returns {object}
   */
  getDefault() {
    return this.get('special-slam-1') || this.getAll()[0];
  }

  /**
   * List challenges matching an optional filter
   * @param {object} [filter]
   * @param {string} [filter.topic]
   * @param {string} [filter.difficulty]
   * @param {string} [filter.unlockAction]
   * @returns {Array<object>}
   */
  list(filter = {}) {
    let result = Array.from(this._challenges.values());

    if (filter.topic) {
      result = result.filter((c) => c.topic === filter.topic);
    }
    if (filter.difficulty) {
      result = result.filter((c) => c.difficulty === filter.difficulty);
    }
    if (filter.unlockAction) {
      result = result.filter((c) => c.unlockAction === filter.unlockAction);
    }

    return JSON.parse(JSON.stringify(result));
  }

  /**
   * Return all registered challenges
   * @returns {Array<object>}
   */
  getAll() {
    return this.list();
  }

  /**
   * Get the total count of registered challenges
   * @returns {number}
   */
  count() {
    return this._challenges.size;
  }

  /**
   * Retrieve next challenge in sequential registry order
   * @param {string} currentId
   * @returns {object}
   */
  getNext(currentId) {
    const list = this.getAll();
    if (list.length === 0) return null;
    const idx = list.findIndex((c) => c.id === currentId);
    if (idx === -1 || idx === list.length - 1) {
      return list[0]; // Wrap to start
    }
    return list[idx + 1];
  }

  /**
   * Retrieve list of unique topics in registry
   * @returns {string[]}
   */
  getTopics() {
    const set = new Set();
    for (const c of this._challenges.values()) {
      set.add(c.topic);
    }
    return Array.from(set);
  }

  /**
   * Retrieve list of unique difficulties in registry
   * @returns {string[]}
   */
  getDifficulties() {
    const set = new Set();
    for (const c of this._challenges.values()) {
      set.add(c.difficulty);
    }
    return Array.from(set);
  }
}

// Global singleton instance for the game application
export const questionRegistry = new QuestionRegistry();

export default questionRegistry;
