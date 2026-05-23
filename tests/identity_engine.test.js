'use strict';

const { generateVariants, scanIdentity, scoreConfidence } = require('../dist-backend/identityEngine');
const { scanPlatform } = require('../dist-backend/scanner');

// Mock scanner module
jest.mock('../dist-backend/scanner');

describe('IdentityEngine - TDD Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVariants()', () => {
    it('generates top 4 default variants for a 2-word English name', () => {
      const variants = generateVariants('john doe');
      expect(variants).toEqual(['johndoe', 'john_doe', 'john.doe', 'jdoe']);
    });

    it('generates top 4 default variants for a 3-word Vietnamese name', () => {
      const variants = generateVariants('nguyen van a');
      expect(variants).toEqual(['nguyenvana', 'nguyen_van_a', 'nguyen.van.a', 'nguyena']);
    });

    it('generates deep scan variants when deepScan=true is passed', () => {
      const variants = generateVariants('john doe', true);
      // Contains default + deep variants
      expect(variants).toContain('johndoe');
      expect(variants).toContain('doejohn');
      expect(variants).toContain('doe_john');
      expect(variants).toContain('doe.john');
    });
  });

  describe('scanIdentity() - Per-Platform Early Termination', () => {
    it('runs platforms in parallel but stops checking remaining variants for a platform once FOUND', async () => {
      // Mock scanPlatform behavior:
      // For GitHub: first variant 'johndoe' is NOT_FOUND, second variant 'john_doe' is FOUND
      // For Medium: first variant 'johndoe' is FOUND
      scanPlatform.mockImplementation((username, platform) => {
        if (platform.name === 'GitHub') {
          if (username === 'johndoe') {
            return Promise.resolve({ platform: 'GitHub', status: 'NOT_FOUND', url: '...' });
          }
          if (username === 'john_doe') {
            return Promise.resolve({ platform: 'GitHub', status: 'FOUND', url: '...', bio: 'Software Developer' });
          }
        }
        if (platform.name === 'Medium') {
          if (username === 'johndoe') {
            return Promise.resolve({ platform: 'Medium', status: 'FOUND', url: '...', bio: 'Writer' });
          }
        }
        return Promise.resolve({ platform: platform.name, status: 'NOT_FOUND', url: '...' });
      });

      const results = await scanIdentity('john doe');

      // GitHub: should have called 'johndoe' and 'john_doe', but NOT 'john.doe' or 'jdoe'
      const githubCalls = scanPlatform.mock.calls.filter(call => call[1].name === 'GitHub');
      expect(githubCalls.map(c => c[0])).toEqual(['johndoe', 'john_doe']);

      // Medium: should have only called 'johndoe', because it was FOUND instantly
      const mediumCalls = scanPlatform.mock.calls.filter(call => call[1].name === 'Medium');
      expect(mediumCalls.map(c => c[0])).toEqual(['johndoe']);

      // Ensure correct matches returned in results
      const foundGit = results.found.find(r => r.platform === 'GitHub');
      expect(foundGit.variant).toBe('john_doe');
      expect(foundGit.status).toBe('FOUND');

      const foundMed = results.found.find(r => r.platform === 'Medium');
      expect(foundMed.variant).toBe('johndoe');
      expect(foundMed.status).toBe('FOUND');
    });
  });

  describe('scoreConfidence()', () => {
    it('scores HIGH if bio contains both first and last name parts', () => {
      const results = [
        { platform: 'GitHub', status: 'FOUND', bio: 'My name is John Doe, coder.' }
      ];
      const confidence = scoreConfidence(results, 'John Doe');
      expect(confidence).toBe('HIGH');
    });

    it('scores MEDIUM if profiles are found but bio is missing names', () => {
      const results = [
        { platform: 'GitHub', status: 'FOUND', bio: 'Just a quiet profile' }
      ];
      const confidence = scoreConfidence(results, 'John Doe');
      expect(confidence).toBe('MEDIUM');
    });

    it('scores LOW if no profiles are found', () => {
      const confidence = scoreConfidence([], 'John Doe');
      expect(confidence).toBe('LOW');
    });
  });
});
