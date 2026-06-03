// backend/sseManager.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEStreamManager = void 0;
const zod_1 = require("zod");
// Outbound validation schema for SSE payloads to protect client EventSource
const ssePayloadSchema = zod_1.z.object({
    event: zod_1.z.enum(['progress', 'result', 'end', 'error', 'verified']),
    data: zod_1.z.any()
});
class SSEStreamManager {
    res;
    heartbeatInterval = null;
    isClosed = false;
    constructor(res) {
        this.res = res;
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
        if (this.isClosed)
            return;
        // Strict Outbound validation
        const validation = ssePayloadSchema.safeParse({ event, data });
        if (!validation.success) {
            throw new Error(`Outbound SSE validation failed: ${validation.error.message}`);
        }
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
exports.SSEStreamManager = SSEStreamManager;
