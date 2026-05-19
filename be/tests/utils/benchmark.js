'use strict';

const { performance } = require('perf_hooks');

/**
 * Measures the average execution time of a synchronous function.
 * @param {Function} fn - The function to benchmark.
 * @param {Array} [args=[]] - Arguments to pass to the function.
 * @param {number} [iterations=1000] - Number of iterations to average over.
 * @returns {number} Average execution time in milliseconds.
 */
function benchmarkSync(fn, args = [], iterations = 1000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn(...args);
  }
  const end = performance.now();
  return (end - start) / iterations;
}

module.exports = {
  benchmarkSync
};
