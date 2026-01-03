/**
 * Property-based tests for Permission Screen Metadata
 * Feature: permission-profile-ux-clarity
 * Property 4: Screen Metadata Uniqueness and Validity
 * Validates: Requirements 5.3, 5.4
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  SCREEN_METADATA, 
  getAvailableScreens, 
  getScreenMetadata,
  getAvailableScreensWithMetadata,
  ScreenMetadata
} from "../app/lib/permissions";

/**
 * Property 4: Screen Metadata Uniqueness and Validity
 * For all entries in SCREEN_METADATA:
 * - The `key` field should be unique (no duplicates)
 * - Each key should be a member of the canonical getAvailableScreens() list
 * 
 * Feature: permission-profile-ux-clarity, Property 4: Screen Metadata Uniqueness and Validity
 */
test("Property 4: Screen Metadata Uniqueness and Validity", async (t) => {
  await t.test("All screen keys are unique (no duplicates)", () => {
    const keys = SCREEN_METADATA.map(screen => screen.key);
    const uniqueKeys = new Set(keys);
    
    // Property: For all keys in SCREEN_METADATA, the count of unique keys equals total keys
    assert.equal(
      uniqueKeys.size, 
      keys.length, 
      `Found duplicate keys: ${keys.filter((key, index) => keys.indexOf(key) !== index)}`
    );
  });

  await t.test("All SCREEN_METADATA keys are in getAvailableScreens()", () => {
    const availableScreens = getAvailableScreens();
    
    // Property: For all screens in SCREEN_METADATA, the key exists in availableScreens
    for (const screen of SCREEN_METADATA) {
      assert.ok(
        availableScreens.includes(screen.key),
        `Screen key "${screen.key}" from SCREEN_METADATA is not in getAvailableScreens()`
      );
    }
  });

  await t.test("getAvailableScreens() returns all SCREEN_METADATA keys", () => {
    const availableScreens = getAvailableScreens();
    const metadataKeys = SCREEN_METADATA.map(s => s.key);
    
    // Property: For all keys in availableScreens, the key exists in SCREEN_METADATA
    for (const key of availableScreens) {
      assert.ok(
        metadataKeys.includes(key),
        `Screen key "${key}" from getAvailableScreens() is not in SCREEN_METADATA`
      );
    }
  });

  await t.test("Each screen has all required metadata fields", () => {
    // Property: For all screens in SCREEN_METADATA, all required fields are present and valid
    for (const screen of SCREEN_METADATA) {
      assert.ok(typeof screen.key === 'string' && screen.key.length > 0, 
        `Screen "${screen.key}" has invalid key`);
      assert.ok(typeof screen.label === 'string' && screen.label.length > 0, 
        `Screen "${screen.key}" has invalid label`);
      assert.ok(typeof screen.displayLabel === 'string' && screen.displayLabel.length > 0, 
        `Screen "${screen.key}" has invalid displayLabel`);
      assert.ok(typeof screen.description === 'string' && screen.description.length > 0, 
        `Screen "${screen.key}" has invalid description`);
      assert.ok(['system', 'employee-profile'].includes(screen.category), 
        `Screen "${screen.key}" has invalid category: ${screen.category}`);
      assert.ok(typeof screen.affectsOthers === 'boolean', 
        `Screen "${screen.key}" has invalid affectsOthers`);
    }
  });

  await t.test("getScreenMetadata returns correct metadata for any valid key", () => {
    // Property-based test: For any screen in SCREEN_METADATA, getScreenMetadata returns the same object
    fc.assert(
      fc.property(
        fc.constantFrom(...SCREEN_METADATA),
        (screen: ScreenMetadata) => {
          const retrieved = getScreenMetadata(screen.key);
          return retrieved !== undefined && 
                 retrieved.key === screen.key &&
                 retrieved.label === screen.label &&
                 retrieved.displayLabel === screen.displayLabel &&
                 retrieved.description === screen.description &&
                 retrieved.category === screen.category &&
                 retrieved.affectsOthers === screen.affectsOthers;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("getScreenMetadata returns undefined for invalid keys", () => {
    // Property-based test: For any string not in SCREEN_METADATA keys, getScreenMetadata returns undefined
    const validKeys = new Set(SCREEN_METADATA.map(s => s.key));
    
    fc.assert(
      fc.property(
        fc.string().filter(s => !validKeys.has(s)),
        (invalidKey: string) => {
          return getScreenMetadata(invalidKey) === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("getAvailableScreensWithMetadata returns same data as SCREEN_METADATA", () => {
    const result = getAvailableScreensWithMetadata();
    assert.deepEqual(result, SCREEN_METADATA);
  });
});
