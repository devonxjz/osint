# Task 18: Phone Social Media & App Sync Discovery

- **Module**: Modules 2 & 4 - Facebook & Mobile Sync Discovery
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: [x] Task 15: Phone Input Validation & Carrier Lookup
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-telephone-system-design.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-telephone-system-design.md)

## What to build
Build the social profile finder module that matches target phone numbers against Facebook direct lookup logs and simulates mobile app contact synchronization technique on OTT apps (WhatsApp, Telegram, Snapchat, Viber, Zalo) to discover usernames, display names, and profile avatars. **This module is strictly a Simulated Profile Lookup (mock-only) due to OTT API blocks and encryption.**

## Acceptance criteria
- [x] Implement `api/phone/social_sync.js` with discovery function `discoverSocialProfiles(phone)`.
- [x] Implement Simulated OTT Profile Lookup (Mock-only): Match numeric ranges or prefixes deterministically based on seed hashes to return active mock app profiles containing `app` (e.g. 'Telegram', 'Zalo'), `username`, `displayName`, and `avatarUrl`.
- [x] Document clearly in code comments that this is a simulated lab module (no real android emulator or remote E2E contact hacking is conducted).
- [x] Implement Facebook Discovery check: Check for presence in simulated posts and fanpages.
- [x] Write a test suite `tests/phone_social_sync.test.js` verifying proper profile object returns, profile url generations, and safety handlers.
