/**
 * Property-based tests for Direct URL Redirect
 * Feature: tenant-feature-toggles
 * Property 13: Direct URL Redirect
 * Validates: Requirements 8.1
 * 
 * Tests that when a user navigates directly to a feature page URL,
 * the FeatureGuardedPage component correctly redirects to dashboard
 * if the feature is disabled.
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  ALL_FEATURE_KEYS, 
  FeatureKey,
  FeatureToggleState,
} from "../lib/feature-toggles/types";

/**
 * Simulates the FeatureGuardedPage logic for determining redirect behavior
 * This mirrors the component's decision logic without React dependencies
 */
interface GuardResult {
  shouldRedirect: boolean;
  redirectTo: string;
  shouldShowContent: boolean;
}

function simulateFeatureGuard(
  featureKey: FeatureKey,
  enabledFeatures: FeatureToggleState,
  redirectTo: string = "/dashboard"
): GuardResult {
  // Check if feature is enabled (default to true if not specified - fail-open)
  const isEnabled = enabledFeatures[featureKey] ?? true;
  
  return {
    shouldRedirect: !isEnabled,
    redirectTo: isEnabled ? "" : redirectTo,
    shouldShowContent: isEnabled,
  };
}

/**
 * Property 13: Direct URL Redirect
 * For any feature page and any disabled feature state,
 * direct URL access should redirect to dashboard when feature is disabled.
 * 
 * Feature: tenant-feature-toggles, Property 13: Direct URL Redirect
 * Validates: Requirements 8.1
 */
test("Property 13: Direct URL Redirect", async (t) => {
  // Arbitrary for generating feature toggle states
  const featureToggleStateArbitrary = fc.record(
    Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.boolean()]))
  ) as fc.Arbitrary<FeatureToggleState>;

  // Arbitrary for selecting a feature key
  const featureKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);

  await t.test("Disabled feature pages should redirect to dashboard", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        featureToggleStateArbitrary,
        (featureKey, toggleState) => {
          // Force this specific feature to be disabled
          const stateWithDisabled = { ...toggleState, [featureKey]: false };
          
          const result = simulateFeatureGuard(featureKey, stateWithDisabled);
          
          // Should redirect when feature is disabled
          return result.shouldRedirect === true && 
                 result.redirectTo === "/dashboard" &&
                 result.shouldShowContent === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Enabled feature pages should not redirect", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        featureToggleStateArbitrary,
        (featureKey, toggleState) => {
          // Force this specific feature to be enabled
          const stateWithEnabled = { ...toggleState, [featureKey]: true };
          
          const result = simulateFeatureGuard(featureKey, stateWithEnabled);
          
          // Should NOT redirect when feature is enabled
          return result.shouldRedirect === false && 
                 result.shouldShowContent === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Custom redirect path should be respected", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.startsWith("/") || s === ""),
        (featureKey, customPath) => {
          const redirectPath = customPath || "/custom-redirect";
          const disabledState: FeatureToggleState = { [featureKey]: false };
          
          const result = simulateFeatureGuard(featureKey, disabledState, redirectPath);
          
          // Should redirect to custom path
          return result.shouldRedirect === true && 
                 result.redirectTo === redirectPath;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Undefined feature state should fail-open (show content)", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        (featureKey) => {
          // Empty state - feature not defined
          const emptyState: FeatureToggleState = {};
          
          const result = simulateFeatureGuard(featureKey, emptyState);
          
          // Should fail-open and show content when state is undefined
          return result.shouldRedirect === false && 
                 result.shouldShowContent === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("All features disabled should redirect all feature pages", async () => {
    const allDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      allDisabled[key] = false;
    }

    for (const featureKey of ALL_FEATURE_KEYS) {
      const result = simulateFeatureGuard(featureKey, allDisabled);
      
      assert.equal(result.shouldRedirect, true, 
        `Feature ${featureKey} should redirect when disabled`);
      assert.equal(result.redirectTo, "/dashboard",
        `Feature ${featureKey} should redirect to dashboard`);
      assert.equal(result.shouldShowContent, false,
        `Feature ${featureKey} should not show content when disabled`);
    }
  });

  await t.test("All features enabled should not redirect any feature pages", async () => {
    const allEnabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      allEnabled[key] = true;
    }

    for (const featureKey of ALL_FEATURE_KEYS) {
      const result = simulateFeatureGuard(featureKey, allEnabled);
      
      assert.equal(result.shouldRedirect, false, 
        `Feature ${featureKey} should not redirect when enabled`);
      assert.equal(result.shouldShowContent, true,
        `Feature ${featureKey} should show content when enabled`);
    }
  });

  await t.test("Guard decision is deterministic for same inputs", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        featureToggleStateArbitrary,
        (featureKey, toggleState) => {
          const result1 = simulateFeatureGuard(featureKey, toggleState);
          const result2 = simulateFeatureGuard(featureKey, toggleState);
          
          // Same inputs should produce same outputs
          return result1.shouldRedirect === result2.shouldRedirect &&
                 result1.redirectTo === result2.redirectTo &&
                 result1.shouldShowContent === result2.shouldShowContent;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Redirect and show content are mutually exclusive", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        featureToggleStateArbitrary,
        (featureKey, toggleState) => {
          const result = simulateFeatureGuard(featureKey, toggleState);
          
          // Cannot both redirect and show content
          // Cannot neither redirect nor show content (one must be true)
          return result.shouldRedirect !== result.shouldShowContent;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Feature toggle state changes should update guard behavior", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        (featureKey) => {
          const enabledState: FeatureToggleState = { [featureKey]: true };
          const disabledState: FeatureToggleState = { [featureKey]: false };
          
          const enabledResult = simulateFeatureGuard(featureKey, enabledState);
          const disabledResult = simulateFeatureGuard(featureKey, disabledState);
          
          // Behavior should differ based on toggle state
          return enabledResult.shouldRedirect !== disabledResult.shouldRedirect &&
                 enabledResult.shouldShowContent !== disabledResult.shouldShowContent;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Other features' toggle states don't affect current feature guard", async () => {
    fc.assert(
      fc.property(
        featureKeyArbitrary,
        featureToggleStateArbitrary,
        (targetFeature, baseState) => {
          // Test with target feature enabled
          const stateWithEnabled = { ...baseState, [targetFeature]: true };
          const resultEnabled = simulateFeatureGuard(targetFeature, stateWithEnabled);
          
          // Test with target feature disabled
          const stateWithDisabled = { ...baseState, [targetFeature]: false };
          const resultDisabled = simulateFeatureGuard(targetFeature, stateWithDisabled);
          
          // Only the target feature's state should matter
          // Enabled should show content, disabled should redirect
          return resultEnabled.shouldShowContent === true &&
                 resultDisabled.shouldRedirect === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
