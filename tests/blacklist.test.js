// tests/blacklist.test.js

'use strict';

const { isSoft404, GLOBAL_HTML_BLACKLIST } = require('../dist-backend/shared/blacklist');

describe('isSoft404 - Centralized Soft-404 Validation', () => {
  test('should return false if input HTML is not a string', () => {
    expect(isSoft404(null, 'username', 'bio')).toBe(false);
    expect(isSoft404(undefined, 'username', 'bio')).toBe(false);
    expect(isSoft404(12345, 'username', 'bio')).toBe(false);
  });

  test('should return false if HTML does not contain any blacklist phrases', () => {
    const html = '<html><body><h1>Welcome to My Profile</h1><p>Active user page.</p></body></html>';
    expect(isSoft404(html, 'username', 'bio')).toBe(false);
  });

  test('should return true if HTML contains a standard blacklist phrase (case insensitive)', () => {
    const html = '<html><body><h1>PAGE NOT FOUND</h1></body></html>';
    expect(isSoft404(html, 'johndoe', 'My awesome bio')).toBe(true);
  });

  test('should detect Vietnamese soft-404 error page phrase', () => {
    const html = '<div>Rất tiếc! Không tìm thấy nội dung này</div>';
    expect(isSoft404(html, 'tranlethai', 'Bio details')).toBe(true);
  });

  test('should detect Patreon-specific empty profile phrase', () => {
    const html = '<div>This member isn’t supporting any creators at the moment.</div>';
    expect(isSoft404(html, 'tranlethai', 'Bio details')).toBe(true);
  });

  describe('Exclusion Guard Safeguard', () => {
    test('should return false if matched phrase is inside the username', () => {
      const phrase = 'user not found';
      const html = `<html><body>Welcome ${phrase} page</body></html>`;
      
      // Username is exact match or contains the phrase
      expect(isSoft404(html, 'user not found', 'some bio')).toBe(false);
      expect(isSoft404(html, 'user not found profile', 'some bio')).toBe(false);
    });

    test('should return false if matched phrase is inside the user bio', () => {
      const phrase = 'page not found';
      const html = `<html><body>Welcome page holding ${phrase} message.</body></html>`;
      
      // Bio is exact match or contains the phrase
      expect(isSoft404(html, 'johndoe', 'this is my page not found profile')).toBe(false);
    });

    test('should return true if matched phrase is in HTML but not in bio/username', () => {
      const html = '<html><body><h1>profile not found</h1><p>Bio: hello</p></body></html>';
      expect(isSoft404(html, 'johndoe', 'hello')).toBe(true);
    });
  });
});
