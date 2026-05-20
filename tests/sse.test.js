// tests/sse.test.js

'use strict';

const { SSEStreamManager } = require('../api/sseManager');

describe('SSEStreamManager - Behavior 1: SSE Manager Basics', () => {
  let mockRes;
  let sseManager;

  beforeEach(() => {
    mockRes = {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should set standard SSE headers and start heartbeat interval on init', () => {
    sseManager = new SSEStreamManager(mockRes);
    sseManager.init();

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Fast-forward 15 seconds to trigger heartbeat
    jest.advanceTimersByTime(15000);
    expect(mockRes.write).toHaveBeenCalledWith(':\n\n');
  });

  test('should send formatted SSE events', () => {
    sseManager = new SSEStreamManager(mockRes);
    sseManager.init();

    sseManager.send('progress', { percentage: 50 });

    expect(mockRes.write).toHaveBeenLastCalledWith(
      'event: progress\ndata: {"percentage":50}\n\n'
    );
  });

  test('should stop writing and clear heartbeat interval on end', () => {
    sseManager = new SSEStreamManager(mockRes);
    sseManager.init();

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    sseManager.end();

    expect(mockRes.end).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(sseManager.isClosed).toBe(true);

    // Write should do nothing if closed
    mockRes.write.mockClear();
    sseManager.send('progress', { percentage: 100 });
    expect(mockRes.write).not.toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});
