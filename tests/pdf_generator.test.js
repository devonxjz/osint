'use strict';

const { generateDossierPDF } = require('../dist-backend/email');
const { HttpFactory } = require('../dist-backend/shared/http_factory');

jest.mock('../dist-backend/shared/http_factory', () => ({
  HttpFactory: {
    fetchWithSession: jest.fn().mockImplementation(async (url) => {
      if (url.includes('avatar') || url.includes('pravatar')) {
        return {
          status: 200,
          headers: {},
          body: Buffer.from('mock-avatar-bytes')
        };
      }
      return { status: 404, headers: {}, body: '' };
    })
  }
}));

describe('PDF Dossier Generator', () => {
  const mockDossier = {
    email: 'mike.brown@company.com',
    validation: { syntaxValid: true, domainExists: true, isDisposable: false },
    breaches: [
      { name: 'LinkedIn', domain: 'linkedin.com', breachDate: '2012-05-05', pwnCount: 164611595, compromisedData: ['Email', 'Passwords'], isVerified: true },
      { name: 'Adobe', domain: 'adobe.com', breachDate: '2013-10-04', pwnCount: 153000000, compromisedData: ['Email', 'Passwords', 'Usernames'], isVerified: true },
    ],
    gravatar: { hasGravatar: true, avatarUrl: 'https://www.gravatar.com/avatar/abc?s=200', displayName: 'Mike Brown' },
    identity: { realName: 'Mike Brown', employer: 'Acme Corp', position: 'Engineer', confidence: 'HIGH', sources: ['hunter', 'gravatar'] },
    usernames: { primary: 'mike.brown', variants: ['mikebrown', 'mike_brown'] },
    permutations: {
      workEmails: ['m.brown@company.com', 'mbrown@company.com'],
      personalEmails: ['mike.brown@gmail.com'],
    },
    timeTakenMs: 4250,
  };

  // Behavior 1: Generates a valid PDF buffer
  test('returns a non-empty Buffer', async () => {
    const buffer = await generateDossierPDF(mockDossier);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  // Behavior 2: PDF starts with correct header magic bytes
  test('buffer starts with PDF magic bytes (%PDF)', async () => {
    const buffer = await generateDossierPDF(mockDossier);
    const header = buffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  // Behavior 3: Handles dossier with no breaches gracefully
  test('generates PDF even when breaches array is empty', async () => {
    const noBreach = { ...mockDossier, breaches: [] };
    const buffer = await generateDossierPDF(noBreach);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  // Behavior 4: Handles dossier with no avatar gracefully
  test('generates PDF when Gravatar has no avatar', async () => {
    const noAvatar = {
      ...mockDossier,
      gravatar: { hasGravatar: false, avatarUrl: null, displayName: null },
    };
    const buffer = await generateDossierPDF(noAvatar);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  // Behavior 5: Handles completely minimal dossier (invalid email)
  test('generates PDF for minimal dossier from invalid email scan', async () => {
    const minimal = {
      email: 'not-an-email',
      validation: { syntaxValid: false },
      breaches: [],
      gravatar: { hasGravatar: false, avatarUrl: null },
      identity: { realName: null, employer: null, position: null, confidence: 'LOW', sources: [] },
      usernames: { primary: '', variants: [] },
      permutations: { workEmails: [], personalEmails: [] },
      timeTakenMs: 50,
    };
    const buffer = await generateDossierPDF(minimal);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  // Behavior 6: Generates a valid Telephone PDF dossier
  test('generates PDF for a telephone OSINT dossier successfully', async () => {
    const phoneDossier = {
      phone: '+84987654321',
      validation: { valid: true, formatted: '+84987654321', countryCode: 'VN', carrier: 'Viettel' },
      callerId: { realName: 'Nguyen Van A', location: 'Hanoi, Vietnam', carrier: 'Viettel', sources: ['Twilio', 'Mock DB'] },
      peopleSearch: { name: 'Nguyen Van A', realAddress: '123 Le Loi, Hanoi', relatives: ['Nguyen Van B'], business: 'FPT Software', dorkUrls: ['https://google.com/search?q=Nguyen+Van+A'] },
      socialSync: {
        facebook: { profileUrl: 'https://facebook.com/nva', pageName: 'Nguyen Van A Profile', candidateName: 'Nguyen Van A' },
        ottProfiles: [
          { app: 'Zalo', username: 'nva', displayName: 'Nguyen Van A', avatarUrl: 'https://avatar.zalo.me/nva' },
          { app: 'Telegram', username: 'nva_tg', displayName: 'Van Nguyen', avatarUrl: 'https://t.me/i/nva' }
        ]
      },
      timeTakenMs: 1200
    };
    const buffer = await generateDossierPDF(phoneDossier);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);

    const header = buffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});

