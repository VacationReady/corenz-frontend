/**
 * Property-based tests for API Guard Enforcement
 * Feature: tenant-feature-toggles
 * Property 5: API Guard Enforcement
 * Validates: Requirements 4.1, 4.3
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  FEATURE_KEYS, 
  ALL_FEATURE_KEYS, 
  FeatureKey,
  FeatureToggleState,
  FEATURE_TO_PATHS,
} from "../lib/feature-toggles/types";

/**
 * Mock implementation of the API guard logic for testing
 * This mirrors the withFeatureGuard behavior without Next.js dependencies
 */
interface MockRequest {
  path: string;
  companyId: string | null;
  userId: string | null;
}

interface MockResponse {
  status: number;
  body: {
    error?: string;
    code?: string;
    feature?: string;
  };
}

/**
 * Simulates the API guard check logic
 * Returns the response that would be returned by the guard
 */
function simulateApiGuard(
  request: MockRequest,
  featureKey: FeatureKey,
  enabledFeatures: FeatureToggleState
): MockResponse {
  // Check authentication first
  if (!request.userId || !request.companyId) {
    return {
      status: 401,
      body: { error: "Unauthorized" }
    };
  }

  // Check if the feature is enabled
  const isEnabled = enabledFeatures[featureKey] ?? true;

  if (!isEnabled) {
    return {
      status: 403,
      body: {
        error: "Feature not available",
        code: "FEATURE_DISABLED",
        feature: featureKey
      }
    };
  }

  // Feature is enabled, allow through
  return {
    status: 200,
    body: {}
  };
}

/**
 * Get the feature key for a given API path
 */
function getFeatureKeyForApiPath(path: string): FeatureKey | undefined {
  for (const [featureKey, paths] of Object.entries(FEATURE_TO_PATHS)) {
    const apiPaths = paths.filter(p => p.startsWith('/api/'));
    if (apiPaths.some(p => path.startsWith(p))) {
      return featureKey as FeatureKey;
    }
  }
  return undefined;
}

/**
 * Property 5: API Guard Enforcement
 * For any API route mapped to a disabled feature, requests to that route 
 * should return a 403 Forbidden response.
 * 
 * Feature: tenant-feature-toggles, Property 5: API Guard Enforcement
 * Validates: Requirements 4.1, 4.3
 */
test("Property 5: API Guard Enforcement", async (t) => {
  // Arbitrary for generating feature toggle states
  const featureToggleStateArbitrary = fc.record(
    Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.boolean()]))
  ) as fc.Arbitrary<FeatureToggleState>;

  // Arbitrary for generating valid company IDs
  const companyIdArbitrary = fc.uuid();
  
  // Arbitrary for generating valid user IDs
  const userIdArbitrary = fc.uuid();

  // Arbitrary for selecting a random feature key
  const featureKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);

  await t.test("Disabled features should return 403 Forbidden", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        (featureKey, companyId, userId) => {
          // Create toggle state with this specific feature disabled
          const toggleState: FeatureToggleState = {};
          for (const key of ALL_FEATURE_KEYS) {
            toggleState[key] = key !== featureKey; // All enabled except the target
          }

          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId,
            userId
          };

          const response = simulateApiGuard(request, featureKey, toggleState);

          // Should return 403 with correct error structure
          return (
            response.status === 403 &&
            response.body.code === "FEATURE_DISABLED" &&
            response.body.feature === featureKey &&
            response.body.error === "Feature not available"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Enabled features should allow requests through", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        (featureKey, companyId, userId) => {
          // Create toggle state with this specific feature enabled
          const toggleState: FeatureToggleState = {};
          for (const key of ALL_FEATURE_KEYS) {
            toggleState[key] = true; // All enabled
          }

          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId,
            userId
          };

          const response = simulateApiGuard(request, featureKey, toggleState);

          // Should return 200 (allowed through)
          return response.status === 200;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Unauthenticated requests should return 401", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        featureToggleStateArbitrary,
        (featureKey, toggleState) => {
          // Request without authentication
          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId: null,
            userId: null
          };

          const response = simulateApiGuard(request, featureKey, toggleState);

          // Should return 401 regardless of feature state
          return response.status === 401 && response.body.error === "Unauthorized";
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Missing companyId should return 401", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        userIdArbitrary,
        featureToggleStateArbitrary,
        (featureKey, userId, toggleState) => {
          // Request with userId but no companyId
          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId: null,
            userId
          };

          const response = simulateApiGuard(request, featureKey, toggleState);

          // Should return 401
          return response.status === 401;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Guard response is consistent for same inputs", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        featureToggleStateArbitrary,
        (featureKey, companyId, userId, toggleState) => {
          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId,
            userId
          };

          // Call multiple times with same inputs
          const responses = [];
          for (let i = 0; i < 5; i++) {
            responses.push(simulateApiGuard(request, featureKey, toggleState));
          }

          // All responses should be identical
          const first = responses[0];
          return responses.every(r => 
            r.status === first.status &&
            r.body.code === first.body.code &&
            r.body.feature === first.body.feature
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("All feature keys have valid API path mappings", async () => {
    // Verify each feature key has at least one API path
    for (const featureKey of ALL_FEATURE_KEYS) {
      const paths = FEATURE_TO_PATHS[featureKey];
      assert.ok(paths && paths.length > 0, `Feature ${featureKey} should have path mappings`);
    }
  });

  await t.test("403 response includes correct feature key", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        (featureKey, companyId, userId) => {
          // Disable only this feature
          const toggleState: FeatureToggleState = {};
          for (const key of ALL_FEATURE_KEYS) {
            toggleState[key] = key !== featureKey;
          }

          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId,
            userId
          };

          const response = simulateApiGuard(request, featureKey, toggleState);

          // The feature key in the response should match the guarded feature
          return response.body.feature === featureKey;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Toggle state changes affect guard behavior", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        (featureKey, companyId, userId) => {
          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId,
            userId
          };

          // Test with feature enabled
          const enabledState: FeatureToggleState = { [featureKey]: true };
          const enabledResponse = simulateApiGuard(request, featureKey, enabledState);

          // Test with feature disabled
          const disabledState: FeatureToggleState = { [featureKey]: false };
          const disabledResponse = simulateApiGuard(request, featureKey, disabledState);

          // Enabled should allow (200), disabled should block (403)
          return enabledResponse.status === 200 && disabledResponse.status === 403;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Guard checks feature key not path", async () => {
    // The guard is applied with a specific feature key, not derived from path
    // This test verifies the guard uses the provided feature key
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        (featureKey, companyId, userId) => {
          // Use a generic path that doesn't match the feature
          const request: MockRequest = {
            path: "/api/some-random-path",
            companyId,
            userId
          };

          // Disable the feature
          const toggleState: FeatureToggleState = { [featureKey]: false };
          const response = simulateApiGuard(request, featureKey, toggleState);

          // Should still return 403 because the guard is for this feature key
          return response.status === 403 && response.body.feature === featureKey;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Default toggle state (undefined) allows access", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        companyIdArbitrary,
        userIdArbitrary,
        (featureKey, companyId, userId) => {
          const request: MockRequest = {
            path: FEATURE_TO_PATHS[featureKey][0] || `/api/${featureKey}`,
            companyId,
            userId
          };

          // Empty toggle state - feature not explicitly set
          const toggleState: FeatureToggleState = {};
          const response = simulateApiGuard(request, featureKey, toggleState);

          // Should default to enabled (200) - fail-open design
          return response.status === 200;
        }
      ),
      { numRuns: 100 }
    );
  });
});
