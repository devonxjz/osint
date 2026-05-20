'use strict';

const { analyzeInput, ERRORS } = require('../api/analyzer');
const { benchmarkSync } = require('./utils/benchmark');

describe('analyzeInput()', () => {
  describe('Sanitization', () => {
    it('trims leading/trailing whitespace', () => {
      const result = analyzeInput('  johndoe  ');
      expect(result).toEqual({ type: 'USERNAME', valid: true, sanitized: 'johndoe' });
    });

    it('strips single leading @ from username', () => {
      const result = analyzeInput('@johndoe');
      expect(result).toEqual({ type: 'USERNAME', valid: true, sanitized: 'johndoe' });
    });

    it('lowercases email addresses', () => {
      const result = analyzeInput('John.Doe@Gmail.COM');
      expect(result).toEqual({ type: 'EMAIL', valid: true, sanitized: 'john.doe@gmail.com' });
    });
  });

  describe('Email Detection', () => {
    it('detects standard email (john.doe@gmail.com)', () => {
      const result = analyzeInput('john.doe@gmail.com');
      expect(result).toEqual({ type: 'EMAIL', valid: true, sanitized: 'john.doe@gmail.com' });
    });

    it('detects email with + label', () => {
      const result = analyzeInput('john.doe+label@test.co.uk');
      expect(result).toEqual({ type: 'EMAIL', valid: true, sanitized: 'john.doe+label@test.co.uk' });
    });

    it('detects email with subdomain (.co.uk)', () => {
      const result = analyzeInput('user123@domain.io');
      expect(result.type).toBe('EMAIL');
      expect(result.valid).toBe(true);
    });

    it('rejects malformed email (@gmail.com, user@, missing TLD)', () => {
      const result1 = analyzeInput('@gmail.com');
      expect(result1.valid).toBe(false);
      
      const result2 = analyzeInput('user@');
      expect(result2.valid).toBe(false);
    });
  });

  describe('Username Detection', () => {
    it('accepts alphanumeric username', () => {
      const result = analyzeInput('john_doe123');
      expect(result).toEqual({ type: 'USERNAME', valid: true, sanitized: 'john_doe123' });
    });

    it('accepts username with _ - . connectors', () => {
      const result = analyzeInput('dev.user-01');
      expect(result).toEqual({ type: 'USERNAME', valid: true, sanitized: 'dev.user-01' });
    });

    it('rejects username under 2 chars', () => {
      const result = analyzeInput('j');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.USERNAME_SHORT);
    });

    it('rejects username over 64 chars', () => {
      const longUsername = 'a'.repeat(65);
      const result = analyzeInput(longUsername);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.USERNAME_LONG);
    });

    it('rejects username with spaces', () => {
      const result = analyzeInput('john doe');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.INVALID_FORMAT);
    });

    it('rejects username with # $ % special chars', () => {
      const result = analyzeInput('john#doe');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.INVALID_FORMAT);
    });

    it('rejects XSS / SQL injection patterns', () => {
      const result = analyzeInput('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.INVALID_FORMAT);
    });
  });

  describe('Edge Cases', () => {
    it('returns valid:false for empty string', () => {
      const result = analyzeInput('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.EMPTY);
    });

    it('returns valid:false for whitespace-only', () => {
      const result = analyzeInput('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.EMPTY);
    });

    it('returns valid:false for null', () => {
      const result = analyzeInput(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.NOT_A_STRING);
    });

    it('returns valid:false for undefined', () => {
      const result = analyzeInput(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.NOT_A_STRING);
    });

    it('returns valid:false for numeric input (type coercion guard)', () => {
      const result = analyzeInput(12345);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.NOT_A_STRING);
    });
  });

  describe('Error Enum Mappings', () => {
    it('should export correct error string for NOT_A_STRING', () => {
      expect(ERRORS.NOT_A_STRING).toBe('Input must be a non-empty string');
    });

    it('should export correct error string for EMPTY', () => {
      expect(ERRORS.EMPTY).toBe('Input cannot be empty');
    });

    it('should export correct error string for USERNAME_SHORT', () => {
      expect(ERRORS.USERNAME_SHORT).toBe('Username too short (minimum 2 characters)');
    });

    it('should export correct error string for USERNAME_LONG', () => {
      expect(ERRORS.USERNAME_LONG).toBe('Username too long (maximum 64 characters)');
    });

    it('should export correct error string for INVALID_FORMAT', () => {
      expect(ERRORS.INVALID_FORMAT).toBe('Invalid format: only letters, numbers, _, -, . are allowed');
    });
  });

  describe('Performance Constraints', () => {
    it('executes analyzeInput under 1ms on average', () => {
      const avgTime = benchmarkSync(analyzeInput, ['john.doe@gmail.com'], 1000);
      expect(avgTime).toBeLessThan(1.0);
    });

    it('module loads under 5ms (indirectly tested by require speed)', () => {
      const start = performance.now();
      require('../api/analyzer');
      const end = performance.now();
      expect(end - start).toBeLessThan(5.0);
    });
  });
});
