import test from 'node:test';
import assert from 'node:assert/strict';
import { toUTCFromLondon } from '@/lib/time';

test('converts summer time to UTC correctly', () => {
  const result = toUTCFromLondon('2024-06-01', '09:30');
  assert.equal(result.toISOString(), '2024-06-01T08:30:00.000Z');
});

test('converts winter time to UTC correctly', () => {
  const result = toUTCFromLondon('2024-12-01', '09:30');
  assert.equal(result.toISOString(), '2024-12-01T09:30:00.000Z');
});
