/**
 * Loopback Transport
 * 
 * Extends Transport using browser BroadcastChannel:
 * - Channel name: `stick-fight-${roomCode}`
 * - Allows two tabs on the same browser to communicate with zero network requirements.
 * - Emits "connected" immediately upon creation.
 */

import { Transport } from './transport.js';

export class LoopbackTransport extends Transport {
  constructor() {
    super();
    this.name = "Loopback (Same Browser)";
    this.channel = null;
  }

  /**
   * Connect to the specified room code
   * @param {string} roomCode 
   */
  connect(roomCode) {
    if (this.channel) {
      this.close();
    }

    this.roomCode = roomCode || "fight-room-1";
    const channelName = `stick-fight-${this.roomCode}`;

    try {
      this.channel = new BroadcastChannel(channelName);

      this.channel.onmessage = (event) => {
        this.emitMessage(event.data);
      };

      this.channel.onmessageerror = (event) => {
        this.emitStatus("failed", "BroadcastChannel message error");
      };

      // Emits "connected" immediately upon creation
      this.emitStatus("connected");
    } catch (err) {
      this.emitStatus("failed", err.message || "Failed to create BroadcastChannel");
    }
  }

  /**
   * Send a message through BroadcastChannel
   * @param {object} messageObject 
   */
  send(messageObject) {
    if (!this.channel) {
      console.warn("LoopbackTransport: Cannot send, channel closed");
      return;
    }
    try {
      this.channel.postMessage(messageObject);
    } catch (err) {
      console.error("LoopbackTransport send error:", err);
      this.emitStatus("failed", err.message);
    }
  }

  /**
   * Close the channel and emit disconnected
   */
  close() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch (err) {
        console.error("Error closing BroadcastChannel:", err);
      }
      this.channel = null;
    }
    this.emitStatus("disconnected");
  }
}

export default LoopbackTransport;
