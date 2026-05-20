# PRD: Module 4 - Email Scanner

## Problem Statement
Investigating an email target is fundamentally different from a username target. Finding where an email is registered requires expensive API access (HaveIBeenPwned keys), but users (like university students) need free tools to check breach contexts, leak databases, and reverse avatar linkages for academic research.

## Solution
Build a hybrid email intelligence engine.
1.  Generate an MD5 hash of the email and query Gravatar's public avatar directory to fetch personal profile photos.
2.  Aggregate HaveIBeenPwned (HIBP) API lookups (if an active API key is provided).
3.  If no key is configured, fallback to a local, high-fidelity mock breach matcher that acts as a realistic simulation tool for security classes.

## User Stories

1. As an investigator, I want to input an email address, so that the tool automatically hashes it and queries Gravatar for any public profile picture linked to it.
2. As a security student, I want to test simulated email breaches (like Adobe 2013, Canva 2019, Zing ID 2018), so that I can understand breach intelligence vectors without buying API keys.
3. As a developer, I want to insert my own HIBP API Key, so that the backend can perform real-time, live checks on real-world compromised data.

## Implementation Decisions

### Engine Interface
```typescript
async function scanEmail(email: string, apiKey?: string): Promise<EmailScanResult>

interface EmailScanResult {
  email: string;
  hasGravatar: boolean;
  avatarUrl: string | null;
  breachesCount: number;
  breaches: Breach[];
}

interface Breach {
  name: string;
  domain: string;
  breachDate: string;
  compromisedData: string[];
  description: string;
}
```

### HIBP Fallback Engine
*   When `apiKey` is absent, the engine parses the email and searches an in-memory dictionary of simulated breaches.
*   Simulate specific academic targets (e.g. `test@domain.com` -> compromises in Canva, LinkedIn, Zing ID).

## Testing Decisions
*   **MD5 Hashing Test**: Verify `Test.Email@Gmail.com` is lowercased and hashed accurately to `b7f0e6e737cc57b855581f185c7b3992`.
*   **Fallback Trigger Test**: Verify that sending a scan request without an API key invokes the mock lookup database and returns structured breaches instead of failing.

## Out of Scope
*   **Decrypted Password Decryption**: Cracking hashed password values leaked in the breaches.
*   **Search for Active Email Inbox (Ping)**: Triggering live SMTP server pings.

## Further Notes
*   This module combines third-party public HTTP APIs (Gravatar), optional paid HTTP REST endpoints (HIBP), and synchronous in-memory mapping operations.
