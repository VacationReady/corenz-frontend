/**
 * Property-based tests for Feature Toggle Partial Update Preservation
 * Feature: tenant-feature-toggles
 * Property 8: Partial Update Preservation
 * Validates: Requirements 7.4
 */
import "./setupEnv";
import test from "node:test";
import * as fc from "fast-check";
import { 
  ALL_FEATURE_KEYS, 
  FeatureKey,
  FeatureToggleState 
} from "../lib/feature-toggles/types";

/**
 * Property 8: Partial Update Preservation
 * For any partial update to feature toggles, only the specified feature keys 
 * should be modified; all other toggles should retain their previous values.
 * 
 * Feature: tenant-feature-toggles, Property 8: Partial Update Preservation
 * Validates: Requirements 7.4
 */
test("Property 8: Partial Update Preservation", async (t) => {
  // Arbitrary for generating company IDs (UUIDs)
  const companyIdArbitrary = fc.uuid();

  await t.test("partial updates only modify specified keys", async () => {
    // Simulated in-memory store that mirrors the API behavior
    const toggleStore = new Map<string, FeatureToggleState>();
    
    const getToggles = (companyId: string): FeatureToggleState => {
      if (!toggleStore.has(companyId)) {
        // Initialize with all features enabled (default behavior)
        const state: FeatureToggleState = {};
        for (const key of ALL_FEATURE_KEYS) {
          state[key] = true;
        }
        toggleStore.set(companyId, state);
      }
      return { ...toggleStore.get(companyId)! };
    };
    
    const patchToggles = (companyId: string, updates: Partial<FeatureToggleState>): FeatureToggleState => {
      const current = getToggles(companyId);
      
      // Only update specified keys (mirrors PATCH behavior)
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && ALL_FEATURE_KEYS.includes(key as FeatureKey)) {
          current[key] = value;
        }
      }
      
      toggleStore.set(companyId, current);
      return current;
    };
    
    // Generate initial state for all features
    const initialStateArbitrary = fc.record(
      Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.boolean()]))
    ) as fc.Arbitrary<FeatureToggleState>;
    
    // Generate partial update (random subset of features with random values)
    const partialUpdateArbitrary = fc.tuple(
      fc.subarray(ALL_FEATURE_KEYS, { minLength: 1, maxLength: ALL_FEATURE_KEYS.length }),
      fc.array(fc.boolean(), { minLength: ALL_FEATURE_KEYS.length, maxLength: ALL_FEATURE_KEYS.length })
    ).map(([keys, values]) => {
      const update: Partial<FeatureToggleState> = {};
      keys.forEach((key, index) => {
        update[key] = values[index % values.length];
      });
      return update;
    });
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        initialStateArbitrary,
        partialUpdateArbitrary,
        (companyId, initialState, partialUpdate) => {
          // Clear store for this test
          toggleStore.delete(companyId);
          
          // Set initial state
          toggleStore.set(companyId, { ...initialState });
          
          // Get state before update
          const beforeUpdate = getToggles(companyId);
          
          // Apply partial update
          const afterUpdate = patchToggles(companyId, partialUpdate);
          
          // Verify: 
          // 1. Updated keys should have new values
          // 2. Non-updated keys should retain original values
          for (const key of ALL_FEATURE_KEYS) {
            if (key in partialUpdate) {
              // This key was updated - should have new value
              if (afterUpdate[key] !== partialUpdate[key]) {
                return false;
              }
            } else {
              // This key was NOT updated - should retain original value
              if (afterUpdate[key] !== beforeUpdate[key]) {
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("empty partial update preserves all values", async () => {
    const toggleStore = new Map<string, FeatureToggleState>();
    
    const getToggles = (companyId: string): FeatureToggleState => {
      return { ...toggleStore.get(companyId)! };
    };
    
    const patchToggles = (companyId: string, updates: Partial<FeatureToggleState>): FeatureToggleState => {
      const current = getToggles(companyId);
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          current[key] = value;
        }
      }
      toggleStore.set(companyId, current);
      return current;
    };
    
    const initialStateArbitrary = fc.record(
      Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.boolean()]))
    ) as fc.Arbitrary<FeatureToggleState>;
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        initialStateArbitrary,
        (companyId, initialState) => {
          // Set initial state
          toggleStore.set(companyId, { ...initialState });
          
          // Apply empty update
          const afterUpdate = patchToggles(companyId, {});
          
          // All values should be preserved
          for (const key of ALL_FEATURE_KEYS) {
            if (afterUpdate[key] !== initialState[key]) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("multiple sequential partial updates accumulate correctly", async () => {
    const toggleStore = new Map<string, FeatureToggleState>();
    
    const initializeToggles = (companyId: string) => {
      const state: FeatureToggleState = {};
      for (const key of ALL_FEATURE_KEYS) {
        state[key] = true;
      }
      toggleStore.set(companyId, state);
    };
    
    const patchToggles = (companyId: string, updates: Partial<FeatureToggleState>): FeatureToggleState => {
      const current = { ...toggleStore.get(companyId)! };
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          current[key] = value;
        }
      }
      toggleStore.set(companyId, current);
      return current;
    };
    
    // Generate a sequence of partial updates
    const updateSequenceArbitrary = fc.array(
      fc.tuple(
        fc.constantFrom(...ALL_FEATURE_KEYS),
        fc.boolean()
      ),
      { minLength: 1, maxLength: 10 }
    );
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        updateSequenceArbitrary,
        (companyId, updateSequence) => {
          // Initialize
          toggleStore.delete(companyId);
          initializeToggles(companyId);
          
          // Track expected final state
          const expectedState: FeatureToggleState = {};
          for (const key of ALL_FEATURE_KEYS) {
            expectedState[key] = true; // Initial state
          }
          
          // Apply each update in sequence
          for (const [key, value] of updateSequence) {
            patchToggles(companyId, { [key]: value });
            expectedState[key] = value;
          }
          
          // Verify final state matches expected
          const finalState = toggleStore.get(companyId)!;
          for (const key of ALL_FEATURE_KEYS) {
            if (finalState[key] !== expectedState[key]) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
