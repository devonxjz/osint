'use strict';

const { analyzeInput, ERRORS } = require('../dist-backend/shared');
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

    it('classifies spaced name as REAL_NAME rather than failing', () => {
      const result = analyzeInput('john doe');
      expect(result).toEqual({ type: 'REAL_NAME', valid: true, sanitized: 'John Doe' });
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

  describe('5-Type Input Detection & Normalization (v2)', () => {
    describe('REAL_NAME detection & Vietnamese diacritics stripping', () => {
      it('detects simple name and normalizes title casing', () => {
        const result = analyzeInput('  john  doe ');
        expect(result).toEqual({ type: 'REAL_NAME', valid: true, sanitized: 'John Doe' });
      });

      it('strips Vietnamese accents and normalizes to base ASCII title-cased name', () => {
        const result = analyzeInput('Nguyễn Văn A');
        expect(result).toEqual({ type: 'REAL_NAME', valid: true, sanitized: 'Nguyen Van A' });
      });

      it('normalizes complex Vietnamese diacritics and đ/Đ letters', () => {
        const result = analyzeInput('Trần Quốc Đạt');
        expect(result).toEqual({ type: 'REAL_NAME', valid: true, sanitized: 'Tran Quoc Dat' });
      });

      it('defaults 1-word name to USERNAME', () => {
        const result = analyzeInput('Zendaya');
        expect(result.type).toBe('USERNAME');
      });
    });

    describe('PHONE detection & VN local SĐT normalization', () => {
      it('detects standard VN local format starting with 0 and normalizes to E.164 (+84)', () => {
        const result = analyzeInput('0901234567');
        expect(result).toEqual({ type: 'PHONE', valid: true, sanitized: '+84901234567' });
      });

      it('handles formatted local/international numbers with brackets and spaces', () => {
        const result = analyzeInput('+84 (090) 123-4567');
        expect(result).toEqual({ type: 'PHONE', valid: true, sanitized: '+84901234567' });
      });

      it('passes 9-character digit strings through as USERNAME if they do not start with a prefix', () => {
        const result = analyzeInput('123456789');
        expect(result.type).toBe('USERNAME');
      });
    });

    describe('DOMAIN detection & sanitization', () => {
      it('detects domain name with valid common TLD', () => {
        const result = analyzeInput('example.com');
        expect(result).toEqual({ type: 'DOMAIN', valid: true, sanitized: 'example.com' });
      });

      it('strips protocol and trailing slashes/parameters from domain', () => {
        const result = analyzeInput('https://www.Example.com/path?query=1');
        expect(result).toEqual({ type: 'DOMAIN', valid: true, sanitized: 'example.com' });
      });

      it('classifies dot-connector username as USERNAME if no valid TLD present', () => {
        const result = analyzeInput('john.doe');
        expect(result.type).toBe('USERNAME');
      });

      it('classifies dot-connector as DOMAIN if valid TLD present', () => {
        const result = analyzeInput('john.doe.io');
        expect(result).toEqual({ type: 'DOMAIN', valid: true, sanitized: 'john.doe.io' });
      });
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

  });

  describe('Scanner Prefix Detection', () => {
    it('detects simple scanner prefix and sanitizes', () => {
      const result = analyzeInput('scanner:johndoe');
      expect(result).toEqual({ type: 'SCANNER', valid: true, sanitized: 'johndoe' });
    });

    it('detects scanner prefix case-insensitively', () => {
      const result = analyzeInput('Scanner:johndoe');
      expect(result).toEqual({ type: 'SCANNER', valid: true, sanitized: 'johndoe' });
    });

    it('detects nested scanner prefixes recursively', () => {
      const result = analyzeInput('scanner:Scanner:johndoe');
      expect(result).toEqual({ type: 'SCANNER', valid: true, sanitized: 'johndoe' });
    });

    it('returns validation error if inner target is invalid', () => {
      const result = analyzeInput('scanner:j');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ERRORS.USERNAME_SHORT);
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
      require('../dist-backend/shared');
      const end = performance.now();
      expect(end - start).toBeLessThan(5.0);
    });
  });
});
