// api/sseManager.js

'use strict';

class SSEStreamManager {
  constructor(res) {
    this.res = res;
    this.heartbeatInterval = null;
    this.isClosed = false;
  }

  init() {
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    this.heartbeatInterval = setInterval(() => {
      if (!this.isClosed) {
        this.res.write(':\n\n');
      }
    }, 15000);
  }

  send(event, data) {
    if (this.isClosed) return;
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isClosed = true;
  }

  end() {
    this.cleanup();
    this.res.end();
  }
}

module.exports = { SSEStreamManager };
