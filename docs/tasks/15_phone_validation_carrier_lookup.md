# Task 15: Phone Input Validation & Carrier Lookup

- **Module**: Module 1 - Input Validation & Carrier Lookup
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: None
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-telephone-system-design.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-telephone-system-design.md)

## What to build
Build the phone number validation and normalization module. This module must accept local or international phone number strings, clean non-numeric characters, normalize to E.164 international format (with customizable fallback defaults, e.g. Vietnamese `+84` prefix if country code is missing), validate length/structure, and perform carrier identification.

## Acceptance criteria
- [x] Implement `api/phone/validator.js` with a robust validation function `validatePhone(rawPhone, fallbackCountryCode = 'VN')`.
- [x] Support normalization and auto-correction:
  - Trim whitespace, remove spaces, dashes, parentheses (e.g. `(098) 765-4321` -> `0987654321`).
  - Convert leading `0` to global country code if no `+` is present (e.g., `0987654321` with `VN` fallback -> `+84987654321`).
  - Handle manual user mistakes like double prefix prefixing: convert `+840987654321` or `840987654321` by stripping the redundant middle `0` (yielding `+84987654321`).
- [x] Support carrier resolution for VN prefixes (e.g., `098`, `086`, `097` -> Viettel; `090`, `093` -> Mobifone; `091`, `094` -> Vinaphone) and simple US carriers.
- [x] Write a comprehensive test suite `tests/phone_validator.test.js` validating all edge cases, standard VN/US numbers, invalid formats, and carrier lookups. Run and verify it passes.
