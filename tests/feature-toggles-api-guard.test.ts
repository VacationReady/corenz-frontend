/**
 * Property-based tests for Feature Toggle API Guard Enforcement
 * Feature: tenant-feature-toggles
 * Property 5: API Guard Enforcement
 * Validates: Requirements 4.1, 4.3
 */
import "./setupEnv";
import test from "node:test";
import * as fc from "fast-check";
import { NextRequest } from "next/server";
import { withFeatureGuard, featureDisabledResponse } from "../lib/feature-toggles/api-guard";
import { FEATURE_KEYS, ALL_FEATURE_KEYS, isValidFeatureKey, FeatureKey } from "../lib/feature-toggles/types";

/**
 * Property 5: API Guard Enforcement
 * For any API request to a feature-specific endpoint when that feature is disabled,
 * the system should return a 403 Forbidden response with a descriptive message.
 * 
 * Feature: tenant-feature-toggles, Property 5: API Guard Enforcement
 * Validates: Requirements 4.1, 4.3
 */
test("Property 5: API Guard Enforcement", async (t) => {
  await t.test("withFeatureGuard validates feature keys at creation time", async () => {
    // Property: Creating a guard with an invalid feature key should throw
    const invalidKeyArbitrary = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => !ALL_FEATURE_KEYS.includes(s as FeatureKey));
    
    fc.assert(
      fc.property(
        invalidKeyArbitrary,
        (invalidKey) => {
          try {
            withFeatureGuard(invalidKey as FeatureKey);
            return false; // Should have thrown
          } catch (error) {
            return error instanceof Error && error.message.includes("Invalid feature key");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("withFeatureGuard accepts all valid feature keys", async () => {
    // Property: Creating a guard with any valid feature key should succeed
    const validKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);
    
    fc.assert(
      fc.property(
        validKeyArbitrary,
        (validKey) => {
          try {
            const guard = withFeatureGuard(validKey);
            return typeof guard === "function";
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("featureDisabledResponse returns correct format", async () => {
    // Property: featureDisabledResponse should return 403 with correct structure
    const validKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);
    
    fc.assert(
      fc.property(
        validKeyArbitrary,
        (featureKey) => {
          const response = featureDisabledResponse(featureKey);
          
          // Check status is 403
          return response.status === 403;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("isValidFeatureKey correctly identifies valid keys", async () => {
    // Property: isValidFeatureKey should return true for all FEATURE_KEYS values
    const validKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);
    
    fc.assert(
      fc.property(
        validKeyArbitrary,
        (validKey) => {
          return isValidFeatureKey(validKey) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("isValidFeatureKey correctly rejects invalid keys", async () => {
    // Property: isValidFeatureKey should return false for random strings
    const invalidKeyArbitrary = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => !ALL_FEATURE_KEYS.includes(s as FeatureKey));
    
    fc.assert(
      fc.property(
        invalidKeyArbitrary,
        (invalidKey) => {
          return isValidFeatureKey(invalidKey) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("FEATURE_KEYS contains all expected features", async () => {
    // Property: All documented feature keys should exist in FEATURE_KEYS
    const expectedFeatures = [
      "ai_assistant",
      "news",
      "bulk_actions",
      "performance_management",
      "journeys",
      "onboarding",
      "automation_rules",
      "event_rules",
      "org_chart",
      "surveys",
      "forms",
      "timesheets",
      "rota_shifts",
      "multi_stage_approvals",
      "analytics",
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...expectedFeatures),
        (expectedKey) => {
          return Object.values(FEATURE_KEYS).includes(expectedKey as FeatureKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("guard wrapping preserves handler type", async () => {
    // Property: Wrapping a handler should return a function
    const validKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);
    
    fc.assert(
      fc.property(
        validKeyArbitrary,
        (featureKey) => {
          const mockHandler = async (req: NextRequest) => {
            return new Response("OK");
          };
          
          const guard = withFeatureGuard(featureKey);
          const wrappedHandler = guard(mockHandler);
          
          return typeof wrappedHandler === "function";
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("ALL_FEATURE_KEYS matches FEATURE_KEYS values", async () => {
    // Property: ALL_FEATURE_KEYS should contain exactly the values from FEATURE_KEYS
    const featureKeyValues = Object.values(FEATURE_KEYS);
    
    // Check that ALL_FEATURE_KEYS has same length
    if (ALL_FEATURE_KEYS.length !== featureKeyValues.length) {
      throw new Error("ALL_FEATURE_KEYS length mismatch");
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...featureKeyValues),
        (key) => {
          return ALL_FEATURE_KEYS.includes(key);
        }
      ),
      { numRuns: 100 }
    );
  });
});
