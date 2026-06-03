## ADDED Requirements

### Requirement: Raw Scanner Output Extraction
The system SHALL extract and output raw scanner results directly when the target type is prefixed with `scanner:`. The prefix extraction MUST be case-insensitive and recursive. The system MUST NOT trigger client-side Svelte/JS page rendering.

#### Scenario: Raw scanner output request
- **WHEN** user sends request with target prefix `scanner:` or `Scanner:` (possibly nested like `scanner:Scanner:`)
- **THEN** system performs the scan and returns the raw JSON results of the scanner with standard browser-like JSON response headers.

### Requirement: Robust Scanner Input Parsing
The system SHALL parse input case-insensitively and strip nested `scanner:` prefixes completely to extract the core target.

#### Scenario: Nested case-insensitive scanner prefix
- **WHEN** input is `Scanner:scanner:johndoe`
- **THEN** system successfully sanitizes the input to `johndoe` and sets target type to `SCANNER`.
