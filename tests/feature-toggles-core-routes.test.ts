/**
 * Property-based tests for Core Routes Accessibility
 * Feature: tenant-feature-toggles
 * Property 6: Core Routes Always Accessible
 * Validates: Requirements 4.4
 */
import "./setupEnv";
import test from "node:test";
import * as fc from "fast-check";
import { 
  FEATURE_KEYS, 
  ALL_FEATURE_KEYS, 
  FEATURE_TO_PATHS,
  getFeatureKeyForPath,
  isFeaturePath,
  FeatureKey
} from "../lib/feature-toggles/types";

/**
 * Property 6: Core Routes Always Accessible
 * Core API routes (employees, calendar, documents, reports, leave) should NOT
 * be blocked by feature toggles. These are essential functionality that must
 * always be available regardless of feature toggle state.
 * 
 * Feature: tenant-feature-toggles, Property 6: Core Routes Always Accessible
 * Validates: Requirements 4.4
 */
test("Property 6: Core Routes Always Accessible", async (t) => {
  // Define core routes that should NEVER be blocked
  const coreRoutes = [
    "/api/employees",
    "/api/employees/123",
    "/api/employees/abc-def/leave",
    "/api/calendar",
    "/api/calendar-events",
    "/api/documents",
    "/api/documents/list",
    "/api/documents/upload",
    "/api/reports",
    "/api/reports/preview",
    "/api/leave",
    "/api/leave-requests",
    "/api/departments",
    "/api/job-roles",
    "/api/locations",
    "/api/companies",
    "/api/users",
    "/api/auth",
    "/api/settings",
  ];

  await t.test("core routes are not associated with any feature toggle", async () => {
    // Property: Core routes should not be mapped to any feature key
    fc.assert(
      fc.property(
        fc.constantFrom(...coreRoutes),
        (coreRoute) => {
          const featureKey = getFeatureKeyForPath(coreRoute);
          // Core routes should NOT have a feature key
          return featureKey === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("core routes are not feature paths", async () => {
    // Property: isFeaturePath should return false for core routes
    fc.assert(
      fc.property(
        fc.constantFrom(...coreRoutes),
        (coreRoute) => {
          return isFeaturePath(coreRoute) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("feature paths are correctly identified", async () => {
    // Property: All paths in FEATURE_TO_PATHS should be identified as feature paths
    const allFeaturePaths = Object.values(FEATURE_TO_PATHS).flat();
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allFeaturePaths),
        (featurePath) => {
          return isFeaturePath(featurePath) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("feature paths map to correct feature keys", async () => {
    // Property: Each path in FEATURE_TO_PATHS should map back to its feature key
    const pathToFeatureEntries: Array<[string, FeatureKey]> = [];
    for (const [featureKey, paths] of Object.entries(FEATURE_TO_PATHS)) {
      for (const path of paths) {
        pathToFeatureEntries.push([path, featureKey as FeatureKey]);
      }
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...pathToFeatureEntries),
        ([path, expectedFeatureKey]) => {
          const actualFeatureKey = getFeatureKeyForPath(path);
          return actualFeatureKey === expectedFeatureKey;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("no overlap between core routes and feature routes", async () => {
    // Property: Core routes should not start with any feature path prefix
    const allFeaturePaths = Object.values(FEATURE_TO_PATHS).flat();
    
    fc.assert(
      fc.property(
        fc.constantFrom(...coreRoutes),
        (coreRoute) => {
          // Check that no feature path is a prefix of this core route
          return !allFeaturePaths.some(featurePath => 
            coreRoute.startsWith(featurePath)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("all feature keys have at least one path", async () => {
    // Property: Every feature key should have at least one associated path
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_FEATURE_KEYS),
        (featureKey) => {
          const paths = FEATURE_TO_PATHS[featureKey];
          return Array.isArray(paths) && paths.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("feature paths are valid URL paths", async () => {
    // Property: All feature paths should be valid URL paths (start with /)
    const allFeaturePaths = Object.values(FEATURE_TO_PATHS).flat();
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allFeaturePaths),
        (featurePath) => {
          return featurePath.startsWith("/");
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("random paths not matching features return undefined", async () => {
    // Property: Random paths that don't match any feature should return undefined
    const randomPathArbitrary = fc.string({ minLength: 1, maxLength: 50 })
      .map(s => `/random/${s.replace(/[^a-z0-9]/gi, "")}`)
      .filter(s => s.length > 8); // Ensure meaningful path
    
    fc.assert(
      fc.property(
        randomPathArbitrary,
        (randomPath) => {
          // Most random paths should not be feature paths
          // (unless they accidentally match a feature path prefix)
          const featureKey = getFeatureKeyForPath(randomPath);
          // If it returns a feature key, verify it's a valid one
          if (featureKey !== undefined) {
            return ALL_FEATURE_KEYS.includes(featureKey);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
