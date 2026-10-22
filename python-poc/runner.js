/**
 * Stickman Wars - Python Lesson Runner Host Interface
 * 
 * Manages the Pyodide Web Worker lifecycle, timeout protection,
 * worker re-creation upon freeze, and action-unlock dispatching.
 */

export class PythonSpecialAttackRunner {
  /**
   * @param {object} [options]
   * @param {string} [options.workerUrl='./worker.js']
   * @param {number} [options.timeoutMs=3500]
   */
  constructor(options = {}) {
    this.workerUrl = options.workerUrl || './worker.js';
    this.timeoutMs = options.timeoutMs || 3500;
    this.worker = null;
    this.status = 'idle'; // 'idle' | 'loading' | 'ready' | 'running' | 'error'
    this.statusListeners = [];
    this.pendingResolvers = new Map();
    this.requestId = 0;
  }

  /**
   * Register a status change callback
   * @param {Function} callback - (status, message) => void
   * @returns {Function} unsubscribe function
   */
  onStatus(callback) {
    this.statusListeners.push(callback);
    callback(this.status, '');
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  _emitStatus(status, message = '') {
    this.status = status;
    for (const cb of this.statusListeners) {
      try {
        cb(status, message);
      } catch (err) {
        console.error('PythonSpecialAttackRunner status listener error:', err);
      }
    }
  }

  /**
   * Initialize or retrieve the active Web Worker
   */
  initWorker() {
    if (this.worker) return this.worker;

    this.worker = new Worker(this.workerUrl);

    this.worker.onmessage = (event) => {
      const { id, type, status, message, result, error } = event.data || {};

      if (type === 'STATUS') {
        this._emitStatus(status, message);
        return;
      }

      if (id && this.pendingResolvers.has(id)) {
        const { resolve, timer } = this.pendingResolvers.get(id);
        clearTimeout(timer);
        this.pendingResolvers.delete(id);
        this._emitStatus('ready', 'Execution completed.');

        if (type === 'RESULT') {
          resolve(this._formatUnlockResult(result));
        } else {
          resolve({
            unlocked: false,
            action: 'special',
            passed: false,
            error_type: 'WorkerError',
            error_message: error || 'Unknown worker error',
            details: []
          });
        }
      }
    };

    this.worker.onerror = (err) => {
      console.error('Python Web Worker fatal error:', err);
      this._emitStatus('error', err.message || 'Worker runtime error');
      this.terminateWorker();
    };

    // Pre-warm the Pyodide runtime
    this.worker.postMessage({ type: 'INIT' });
    return this.worker;
  }

  /**
   * Terminate the worker thread immediately
   */
  terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    // Reject any pending promises
    for (const [id, { resolve, timer }] of this.pendingResolvers.entries()) {
      clearTimeout(timer);
      resolve({
        unlocked: false,
        action: 'special',
        passed: false,
        error_type: 'TimeoutError',
        error_message: `Execution timed out (${this.timeoutMs}ms limit). Thread terminated to prevent freeze.`,
        details: []
      });
    }
    this.pendingResolvers.clear();
    this.status = 'idle';
  }

  /**
   * Restart the worker (e.g. after infinite loop timeout)
   */
  restartWorker() {
    this.terminateWorker();
    this.initWorker();
  }

  /**
   * Execute Python code and evaluate lesson pass/fail
   * @param {string} code 
   * @returns {Promise<{ unlocked: boolean, action: 'special', passed: boolean, error_type: string|null, error_message: string|null, details: Array }>}
   */
  async runCode(code) {
    const worker = this.initWorker();
    const id = ++this.requestId;

    this._emitStatus('running', 'Executing Python submission...');

    return new Promise((resolve) => {
      // Watchdog timeout to catch infinite loops (e.g. while True)
      const timer = setTimeout(() => {
        console.warn(`[PythonRunner] Submission ${id} exceeded ${this.timeoutMs}ms. Terminating worker...`);
        this.terminateWorker();
        this._emitStatus('ready', 'Worker restarted after timeout.');
        // Auto-recreate fresh worker for next run
        this.initWorker();
      }, this.timeoutMs);

      this.pendingResolvers.set(id, { resolve, timer });

      worker.postMessage({
        id,
        type: 'RUN',
        code
      });
    });
  }

  /**
   * Format lesson result into combat unlock contract without direct damage authority
   */
  _formatUnlockResult(result = {}) {
    const passed = Boolean(result.passed);
    return {
      unlocked: passed,
      action: 'special', // Action granted upon lesson mastery
      passed,
      error_type: result.error_type || null,
      error_message: result.error_message || null,
      details: Array.isArray(result.details) ? result.details : []
    };
  }
}

export default PythonSpecialAttackRunner;
