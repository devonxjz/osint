// backend/sseManager.ts

'use strict';

import { z } from 'zod';

export type SSEEventType = 'progress' | 'result' | 'end' | 'error';

// Outbound validation schema for SSE payloads to protect client EventSource
const ssePayloadSchema = z.object({
  event: z.enum(['progress', 'result', 'end', 'error']),
  data: z.any()
});

export class SSEStreamManager {
  private res: any;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  public isClosed: boolean = false;

  constructor(res: any) {
    this.res = res;
  }

  init(): void {
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

  send(event: SSEEventType, data: any): void {
    if (this.isClosed) return;

    // Strict Outbound validation
    const validation = ssePayloadSchema.safeParse({ event, data });
    if (!validation.success) {
      throw new Error(`Outbound SSE validation failed: ${validation.error.message}`);
    }

    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isClosed = true;
  }

  end(): void {
    this.cleanup();
    this.res.end();
  }
}
