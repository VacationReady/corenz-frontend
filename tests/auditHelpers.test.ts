import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeDiffs, serialize } from '@/lib/audit-helpers';

describe('Audit Helpers', () => {
  describe('serialize function', () => {
    it('should serialize null values', () => {
      assert.strictEqual(serialize({ field: null }, 'field'), null);
      assert.strictEqual(serialize({ field: undefined }, 'field'), null);
    });

    it('should serialize dates', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      assert.strictEqual(serialize({ field: date }, 'field'), date.toISOString());
    });

    it('should serialize objects', () => {
      const obj = { nested: 'value' };
      assert.strictEqual(serialize({ field: obj }, 'field'), JSON.stringify(obj));
    });

    it('should serialize primitives', () => {
      assert.strictEqual(serialize({ field: 'string' }, 'field'), 'string');
      assert.strictEqual(serialize({ field: 123 }, 'field'), '123');
      assert.strictEqual(serialize({ field: true }, 'field'), 'true');
    });
  });

  describe('computeDiffs function', () => {
    it('should detect field changes', () => {
      const before = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const after = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' };
      const allowed = ['firstName', 'lastName', 'email'] as const;

      const diffs = computeDiffs(before, after, allowed);

      assert.strictEqual(diffs.length, 2);
      assert.deepStrictEqual(diffs[0], {
        field: 'firstName',
        oldValue: 'John',
        newValue: 'Jane',
      });
      assert.deepStrictEqual(diffs[1], {
        field: 'email',
        oldValue: 'john@example.com',
        newValue: 'jane@example.com',
      });
    });

    it('should ignore unchanged fields', () => {
      const before = { firstName: 'John', lastName: 'Doe' };
      const after = { firstName: 'John', lastName: 'Doe' };
      const allowed = ['firstName', 'lastName'] as const;

      const diffs = computeDiffs(before, after, allowed);

      assert.strictEqual(diffs.length, 0);
    });

    it('should handle null/undefined values', () => {
      const before = { firstName: null, lastName: undefined };
      const after = { firstName: 'John', lastName: 'Doe' };
      const allowed = ['firstName', 'lastName'] as const;

      const diffs = computeDiffs(before, after, allowed);

      assert.strictEqual(diffs.length, 2);
      assert.deepStrictEqual(diffs[0], {
        field: 'firstName',
        oldValue: null,
        newValue: 'John',
      });
      assert.deepStrictEqual(diffs[1], {
        field: 'lastName',
        oldValue: null,
        newValue: 'Doe',
      });
    });
  });
});
