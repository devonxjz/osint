'use strict';

const { validatePhone } = require('../api/phone/validator');

describe('Phone Validator Module', () => {
  // Behavior 1: Sanitizes input by removing spaces, dashes, brackets
  test('sanitizes spaces, dashes, and parentheses', () => {
    const result = validatePhone('(098) 765-4321');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('+84987654321');
  });

  // Behavior 2: Converts leading local 0 to standard country code
  test('converts leading zero to global country code for VN', () => {
    const result = validatePhone('0987654321', 'VN');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('+84987654321');
    expect(result.countryCode).toBe('VN');
  });

  // Behavior 3: Corrects double-prefix errors (e.g. +840... -> +84...)
  test('auto-corrects double-prefix typo with +840 at the start', () => {
    const result = validatePhone('+840987654321');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('+84987654321');
  });

  test('auto-corrects double-prefix typo with 840 at the start (no +)', () => {
    const result = validatePhone('840987654321');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('+84987654321');
  });

  // Behavior 4: Identifies VN carriers by prefix
  test('identifies Viettel carriers from prefix', () => {
    const result = validatePhone('0981234567');
    expect(result.carrier).toBe('Viettel');
  });

  test('identifies Mobifone carriers from prefix', () => {
    const result = validatePhone('0901234567');
    expect(result.carrier).toBe('Mobifone');
  });

  test('identifies Vinaphone carriers from prefix', () => {
    const result = validatePhone('0911234567');
    expect(result.carrier).toBe('Vinaphone');
  });

  test('identifies Gmobile carrier', () => {
    const result = validatePhone('0991234567');
    expect(result.carrier).toBe('Gmobile');
  });

  test('identifies Vietnamobile carrier', () => {
    const result = validatePhone('0921234567');
    expect(result.carrier).toBe('Vietnamobile');
  });

  // Behavior 5: Validates boundaries (rejects invalid)
  test('rejects numbers that are too short', () => {
    const result = validatePhone('098');
    expect(result.valid).toBe(false);
    expect(result.formatted).toBe('');
  });

  test('rejects numbers that are too long', () => {
    const result = validatePhone('09876543210987654321');
    expect(result.valid).toBe(false);
  });

  test('rejects non-numeric inputs', () => {
    const result = validatePhone('0987abc321');
    expect(result.valid).toBe(false);
  });
});
