// backend/email/username_extractor.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUsernames = extractUsernames;
const MAX_VARIANTS = 5;
/**
 * Extracts a primary username and up to 5 variants from an email address.
 * Follows PRD Module 2 parsing rules:
 *   - Strip domain
 *   - Strip trailing numbers for variant
 *   - Swap `.` ↔ `_`
 *   - Remove dots for merged variant
 *   - Cap at MAX_VARIANTS
 *
 * @param email
 * @returns ExtractedUsernames
 */
function extractUsernames(email) {
    if (!email || typeof email !== 'string') {
        return { primary: '', variants: [] };
    }
    let cleaned = email.trim();
    // Strip leading @ if present (malformed input guard)
    if (cleaned.startsWith('@')) {
        cleaned = cleaned.substring(1);
    }
    // Extract local part (before first @)
    const atIndex = cleaned.indexOf('@');
    const localPart = atIndex > 0 ? cleaned.substring(0, atIndex) : cleaned;
    const primary = localPart;
    const variantSet = new Set();
    // 1. Strip trailing numbers
    const stripped = localPart.replace(/\d+$/, '');
    if (stripped && stripped !== localPart) {
        variantSet.add(stripped);
    }
    // 2. Swap dots ↔ underscores
    if (localPart.includes('.')) {
        variantSet.add(localPart.replace(/\./g, '_')); // mike.b55 → mike_b55
        variantSet.add(localPart.replace(/\./g, '')); // mike.b55 → mikeb55 / john.doe → johndoe
    }
    if (localPart.includes('_')) {
        variantSet.add(localPart.replace(/_/g, '.')); // mike_b55 → mike.b55
        variantSet.add(localPart.replace(/_/g, '')); // mike_b55 → mikeb55
    }
    // 3. Insert separators between alpha-numeric boundaries
    //    mikeb55 → mike_b55, mike.b55
    const boundary = localPart.replace(/([a-zA-Z])(\d)/, '$1_$2');
    if (boundary !== localPart) {
        variantSet.add(boundary);
        variantSet.add(boundary.replace(/_/g, '.'));
    }
    // Remove primary from variants
    variantSet.delete(primary);
    // Cap at MAX_VARIANTS
    const variants = [...variantSet].slice(0, MAX_VARIANTS);
    return { primary, variants };
}
