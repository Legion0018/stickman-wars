/**
 * Transport Base Class
 * 
 * Defines the contract for all network and communication transports.
 * Emits status values: "connecting", "connected", "reconnecting", "disconnected", "failed" (with reason).
 */

export class Transport {
  constructor() {
    this.status = "disconnected";
    this.roomCode = null;
    this.messageCallbacks = [];
    this.statusCallbacks = [];
  }

  /**
   * Connect to a room by roomCode
   * @param {string} roomCode 
   */
  connect(roomCode) {
    throw new Error("connect(roomCode) must be implemented by subclass");
  }

  /**
   * Send a JSON-serializable message object
   * @param {object} messageObject 
   */
  send(messageObject) {
    throw new Error("send(messageObject) must be implemented by subclass");
  }

  /**
   * Register a message listener callback
   * @param {Function} callback - function(messageObject)
   * @returns {Function} unsubscribe function
   */
  onMessage(callback) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register a status listener callback
   * @param {Function} callback - function(status, reason)
   * @returns {Function} unsubscribe function
   */
  onStatus(callback) {
    this.statusCallbacks.push(callback);
    // Inform immediately of current state
    try {
      callback(this.status, null);
    } catch (e) {
      console.error("Error in initial status callback:", e);
    }
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit status changes to all listeners
   * @param {"connecting"|"connected"|"reconnecting"|"disconnected"|"failed"} status 
   * @param {string|null} [reason] 
   */
  emitStatus(status, reason = null) {
    this.status = status;
    for (const cb of this.statusCallbacks) {
      try {
        cb(status, reason);
      } catch (err) {
        console.error("Error in transport status callback:", err);
      }
    }
  }

  /**
   * Emit incoming message to all listeners
   * @param {object} messageObject 
   */
  emitMessage(messageObject) {
    for (const cb of this.messageCallbacks) {
      try {
        cb(messageObject);
      } catch (err) {
        console.error("Error in transport message callback:", err);
      }
    }
  }

  /**
   * Disconnect and clean up resources
   */
  close() {
    this.emitStatus("disconnected");
  }
}

export default Transport;
