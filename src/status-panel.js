/**
 * Status Panel & Latency Diagnostics
 * 
 * Manages diagnostics, latency calculation, message counters, event logs,
 * and test report generation / copying.
 */

export class StatusPanel {
  constructor(elements = {}) {
    const hasDoc = typeof document !== 'undefined';
    this.dom = {
      transport: elements.transport || (hasDoc ? document.getElementById('status-transport') : null),
      room: elements.room || (hasDoc ? document.getElementById('status-room') : null),
      badge: elements.badge || (hasDoc ? document.getElementById('status-badge') : null),
      rttLatest: elements.rttLatest || (hasDoc ? document.getElementById('stat-rtt-latest') : null),
      rttMin: elements.rttMin || (hasDoc ? document.getElementById('stat-rtt-min') : null),
      rttMax: elements.rttMax || (hasDoc ? document.getElementById('stat-rtt-max') : null),
      rttAvg: elements.rttAvg || (hasDoc ? document.getElementById('stat-rtt-avg') : null),
      rttJitter: elements.rttJitter || (hasDoc ? document.getElementById('stat-rtt-jitter') : null),
      msgSent: elements.msgSent || (hasDoc ? document.getElementById('stat-msg-sent') : null),
      msgRecv: elements.msgRecv || (hasDoc ? document.getElementById('stat-msg-recv') : null),
      eventLog: elements.eventLog || (hasDoc ? document.getElementById('event-log') : null),
      copyBtn: elements.copyBtn || (hasDoc ? document.getElementById('copy-report-btn') : null),
      copyFeedback: elements.copyFeedback || (hasDoc ? document.getElementById('copy-feedback') : null),
    };

    this.transportName = "Loopback (Same Browser)";
    this.roomCode = "fight-room-1";
    this.status = "disconnected";
    this.playerRole = "Fighter A (Left)";

    // Traffic counters
    this.sentCount = 0;
    this.recvCount = 0;

    // Latency stats
    this.rttSamples = [];
    this.latestRtt = null;
    this.minRtt = null;
    this.maxRtt = null;
    this.avgRtt = null;
    this.jitter = null;

    // Log storage
    this.logs = [];

    // Bind copy report button
    if (this.dom.copyBtn) {
      this.dom.copyBtn.addEventListener('click', () => this.copyReport());
    }

    this.renderAll();
  }

  setTransportName(name) {
    this.transportName = name;
    if (this.dom.transport) this.dom.transport.textContent = name;
  }

  setRoomCode(code) {
    this.roomCode = code;
    if (this.dom.room) this.dom.room.textContent = code;
  }

  setPlayerRole(roleText) {
    this.playerRole = roleText;
  }

  setStatus(status, reason = null) {
    this.status = status;
    if (this.dom.badge) {
      this.dom.badge.textContent = status.toUpperCase();
      this.dom.badge.className = `badge badge-${status.toLowerCase()}`;
      if (reason) {
        this.dom.badge.title = reason;
      } else {
        this.dom.badge.removeAttribute('title');
      }
    }
    this.log(`Status changed: ${status}${reason ? ` (${reason})` : ''}`, status === 'failed' ? 'warn' : 'info');
  }

  incrementSent() {
    this.sentCount++;
    if (this.dom.msgSent) this.dom.msgSent.textContent = this.sentCount;
  }

  incrementReceived() {
    this.recvCount++;
    if (this.dom.msgRecv) this.dom.msgRecv.textContent = this.recvCount;
  }

  /**
   * Record an RTT pong sample in milliseconds
   * @param {number} rttMs 
   */
  recordPong(rttMs) {
    this.latestRtt = rttMs;
    this.rttSamples.push(rttMs);
    if (this.rttSamples.length > 100) {
      this.rttSamples.shift();
    }

    this.minRtt = Math.min(...this.rttSamples);
    this.maxRtt = Math.max(...this.rttSamples);
    this.avgRtt = this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length;

    // Jitter: mean difference of successive latency samples
    if (this.rttSamples.length >= 2) {
      let diffSum = 0;
      for (let i = 1; i < this.rttSamples.length; i++) {
        diffSum += Math.abs(this.rttSamples[i] - this.rttSamples[i - 1]);
      }
      this.jitter = diffSum / (this.rttSamples.length - 1);
    } else {
      this.jitter = 0;
    }

    this.renderStats();
  }

  renderStats() {
    const fmt = (val) => (val !== null && val !== undefined) ? `${val.toFixed(2)} ms` : '--';

    if (this.dom.rttLatest) this.dom.rttLatest.textContent = fmt(this.latestRtt);
    if (this.dom.rttMin) this.dom.rttMin.textContent = fmt(this.minRtt);
    if (this.dom.rttMax) this.dom.rttMax.textContent = fmt(this.maxRtt);
    if (this.dom.rttAvg) this.dom.rttAvg.textContent = fmt(this.avgRtt);
    if (this.dom.rttJitter) this.dom.rttJitter.textContent = fmt(this.jitter);
  }

  renderAll() {
    this.setTransportName(this.transportName);
    this.setRoomCode(this.roomCode);
    this.setStatus(this.status);
    this.renderStats();
    if (this.dom.msgSent) this.dom.msgSent.textContent = this.sentCount;
    if (this.dom.msgRecv) this.dom.msgRecv.textContent = this.recvCount;
  }

  /**
   * Append an entry to the event log
   * @param {string} text 
   * @param {'info'|'action'|'combat'|'warn'|'net'} [type='info'] 
   */
  log(text, type = 'info') {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const entry = { time: timeStr, text, type };
    this.logs.push(entry);
    if (this.logs.length > 200) {
      this.logs.shift();
    }

    if (this.dom.eventLog && typeof document !== 'undefined') {
      const row = document.createElement('div');
      row.className = `log-entry log-${type}`;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-time';
      timeSpan.textContent = `[${timeStr}]`;

      const textSpan = document.createElement('span');
      textSpan.className = 'log-msg';
      textSpan.textContent = ` ${text}`;

      row.appendChild(timeSpan);
      row.appendChild(textSpan);
      this.dom.eventLog.appendChild(row);

      // Keep max 100 children in DOM
      while (this.dom.eventLog.children.length > 100) {
        this.dom.eventLog.removeChild(this.dom.eventLog.firstChild);
      }

      // Auto-scroll to bottom
      this.dom.eventLog.scrollTop = this.dom.eventLog.scrollHeight;
    }
  }

  /**
   * Format metrics into clean plain-text block
   */
  formatReport() {
    const fmt = (val) => (val !== null && val !== undefined) ? `${val.toFixed(2)} ms` : 'N/A';
    const recentLogs = this.logs.slice(-15).map(l => `[${l.time}] [${l.type}] ${l.text}`).join('\n');

    return [
      '================ STICK FIGHT TEST REPORT ================',
      `Timestamp:         ${new Date().toISOString()}`,
      `Active Transport:  ${this.transportName}`,
      `Room Code:         ${this.roomCode}`,
      `Connection Status: ${this.status.toUpperCase()}`,
      `Player Role:       ${this.playerRole}`,
      '',
      '--- LATENCY STATISTICS ---',
      `Samples Count:     ${this.rttSamples.length}`,
      `Latest RTT:        ${fmt(this.latestRtt)}`,
      `Min RTT:           ${fmt(this.minRtt)}`,
      `Max RTT:           ${fmt(this.maxRtt)}`,
      `Average RTT:       ${fmt(this.avgRtt)}`,
      `Jitter:            ${fmt(this.jitter)}`,
      '',
      '--- MESSAGE TRAFFIC ---',
      `Messages Sent:     ${this.sentCount}`,
      `Messages Received: ${this.recvCount}`,
      '',
      '--- RECENT EVENT LOG ---',
      recentLogs || '(No events logged)',
      '=========================================================',
    ].join('\n');
  }

  /**
   * Copy formatted report to clipboard
   */
  async copyReport() {
    const reportText = this.formatReport();

    let success = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(reportText);
        success = true;
      } catch (err) {
        console.warn("Clipboard API write failed, using fallback:", err);
      }
    }

    if (!success) {
      // Fallback using textarea
      const ta = document.createElement('textarea');
      ta.value = reportText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        success = true;
      } catch (err) {
        console.error("Fallback execCommand copy failed:", err);
      }
      document.body.removeChild(ta);
    }

    if (this.dom.copyFeedback) {
      this.dom.copyFeedback.textContent = success ? "Report copied to clipboard!" : "Failed to copy report";
      this.dom.copyFeedback.classList.add('visible');
      setTimeout(() => {
        if (this.dom.copyFeedback) {
          this.dom.copyFeedback.classList.remove('visible');
        }
      }, 2500);
    }

    this.log(success ? "Test report copied to clipboard." : "Failed to copy test report.", "info");
  }
}

export default StatusPanel;
