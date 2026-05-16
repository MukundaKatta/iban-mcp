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

test('format groups in 4s', () => {
  assert.equal(format('DE89370400440532013000'), 'DE89 3704 0044 0532 0130 00');
});

test('format normalizes case + whitespace', () => {
  assert.equal(format('  de89 370400440532013000  '), 'DE89 3704 0044 0532 0130 00');
});
