'use strict';

const { benchmarkSync } = require('../../tests/utils/benchmark');

describe('benchmarkSync()', () => {
  it('should return a number representing the average execution time in milliseconds', () => {
    const mockFn = () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    };

    const avgTime = benchmarkSync(mockFn, [], 100);
    expect(typeof avgTime).toBe('number');
    expect(avgTime).toBeGreaterThanOrEqual(0);
  });

  it('should call the target function exactly N times', () => {
    let callCount = 0;
    const mockFn = () => {
      callCount++;
    };

    benchmarkSync(mockFn, [], 50);
    expect(callCount).toBe(50);
  });

  it('should measure higher execution times for slower functions', () => {
    const fastFn = () => {};
    const slowFn = () => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) {
        sum += i;
      }
      return sum;
    };

    const fastTime = benchmarkSync(fastFn, [], 500);
    const slowTime = benchmarkSync(slowFn, [], 500);

    expect(slowTime).toBeGreaterThan(fastTime);
  });
});
