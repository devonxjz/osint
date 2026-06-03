'use strict';

const { generateVariants, scanIdentity, scoreConfidence } = require('../dist-backend/realname');
const { scanPlatform } = require('../dist-backend/username/scanner');

// Mock scanner module
jest.mock('../dist-backend/username/scanner');

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
    it('scores HIGH if display name matches and bio contains first and last name parts', () => {
      const results = [
        { platform: 'GitHub', status: 'FOUND', displayName: 'John Doe', bio: 'My name is John Doe, coder.' }
      ];
      const confidence = scoreConfidence(results, 'John Doe');
      expect(confidence).toBe('HIGH');
    });

    it('scores MEDIUM if display name matches but bio is missing names', () => {
      const results = [
        { platform: 'GitHub', status: 'FOUND', displayName: 'John Doe', bio: 'Just a quiet profile' }
      ];
      const confidence = scoreConfidence(results, 'John Doe');
      expect(confidence).toBe('MEDIUM');
    });

    it('scores LOW if profile exists but does not verify (username/display name mismatched)', () => {
      const results = [
        { platform: 'GitHub', status: 'FOUND', displayName: 'Jane Smith', bio: 'Nothing related to target' }
      ];
      const confidence = scoreConfidence(results, 'John Doe');
      expect(confidence).toBe('LOW');
    });

    it('scores HIGH due to avatar correlation boost (cross-platform URL match)', () => {
      const results = [
        { platform: 'GitHub', status: 'FOUND', displayName: 'J. Doe', avatar: 'https://example.com/avatar123.png?s=100' },
        { platform: 'Medium', status: 'FOUND', displayName: 'J. Doe', avatar: 'https://example.com/avatar123.png?s=400' }
      ];
      // Display Name J. Doe matches John Doe with Levenshtein < 0.8 (no display name points).
      // If no avatar match, score is 0 -> LOW.
      // With avatar match, they share 'https://example.com/avatar123.png' normalized -> +35 boost for both.
      // Wait, 35 points is still LOW (< 40). Let's add username tokens to cross over to MEDIUM/HIGH:
      // If variant is 'john_doe' (adds 20 points). Total = 20 (username) + 35 (avatar) = 55 -> MEDIUM.
      // Let's add display name: similarity of "John Doe" and "John Doe" is 1.0 (adds 40 points).
      // Total = 40 (display name) + 35 (avatar) = 75 -> HIGH.
      const resultsWithMatches = [
        { platform: 'GitHub', status: 'FOUND', displayName: 'John Doe', avatar: 'https://example.com/avatar123.png?s=100' },
        { platform: 'Medium', status: 'FOUND', displayName: 'John Doe', avatar: 'https://example.com/avatar123.png?s=400' }
      ];
      const confidence = scoreConfidence(resultsWithMatches, 'John Doe');
      expect(confidence).toBe('HIGH');
    });
  });
});
