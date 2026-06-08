import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { validate, format } from '../src/server.js';

test('validates a German IBAN', () => {
  const r = validate('DE89370400440532013000');
  assert.equal(r.valid, true);
  assert.equal(r.country, 'DE');
});

test('validates a UK IBAN', () => {
  const r = validate('GB82WEST12345698765432');
  assert.equal(r.valid, true);
  assert.equal(r.country, 'GB');
});

test('handles spaces in input', () => {
  const r = validate('DE89 3704 0044 0532 0130 00');
  assert.equal(r.valid, true);
});

test('rejects wrong checksum', () => {
  const r = validate('DE89370400440532013001');
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'checksum failed');
});

test('rejects wrong length', () => {
  const r = validate('DE8937040044053201300'); // one short
  assert.equal(r.valid, false);
  assert.match(r.reason ?? '', /expected 22/);
});

test('rejects unknown country', () => {
  const r = validate('ZZ89370400440532013000');
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'unknown country');
});

test('rejects too-short input', () => {
  const r = validate('DE8');
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'too short');
});

test('validates an IBAN with letters in the BBAN (mod-97 two-digit path)', () => {
  // FR IBAN whose BBAN contains the letter 'M' (maps to 22 in mod-97).
  const r = validate('FR1420041010050500013M02606');
  assert.equal(r.valid, true);
  assert.equal(r.country, 'FR');
});

test('rejects an illegal character at the correct length', () => {
  // 22 chars for DE, but the final char is a hyphen.
  const r = validate('DE8937040044053201300-');
  assert.equal(r.valid, false);
  assert.match(r.reason ?? '', /invalid IBAN character/);
});

test('format groups in 4s', () => {
  assert.equal(format('DE89370400440532013000'), 'DE89 3704 0044 0532 0130 00');
});

test('format normalizes case + whitespace', () => {
  assert.equal(format('  de89 370400440532013000  '), 'DE89 3704 0044 0532 0130 00');
});

test('format handles inputs shorter than one group', () => {
  assert.equal(format(''), '');
  assert.equal(format('AB'), 'AB');
  assert.equal(format('ABCD'), 'ABCD');
});

test('format leaves no trailing space on exact multiples of 4', () => {
  assert.equal(format('ABCDEFGH'), 'ABCD EFGH');
});
