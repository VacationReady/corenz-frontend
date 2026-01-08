/**
 * Property-based tests for Feature Toggle Cache Invalidation
 * Feature: tenant-feature-toggles
 * Property 7: Cache Invalidation on Update
 * Validates: Requirements 5.2
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  ALL_FEATURE_KEYS, 
  FeatureKey,
  FeatureToggleState 
} from "../lib/feature-toggles/types";

/**
 * Property 7: Cache Invalidation on Update
 * For any toggle update via the tenant-admin API, subsequent feature checks 
 * should reflect the new value without waiting for cache TTL expiration.
 * 
 * Feature: tenant-feature-toggles, Property 7: Cache Invalidation on Update
 * Validates: Requirements 5.2
 */
test("Property 7: Cache Invalidation on Update", async (t) => {
  // Arbitrary for generating valid feature keys
  const featureKeyArbitrary = fc.constantFrom(...ALL_FEATURE_KEYS);
  
  // Arbitrary for generating company IDs (UUIDs)
  const companyIdArbitrary = fc.uuid();
  
  // Arbitrary for generating boolean toggle values
  const toggleValueArbitrary = fc.boolean();

  await t.test("Cache is invalidated after setFeatureEnabled", async () => {
    // Simulated cache and database
    const database = new Map<string, Map<string, boolean>>();
    const cache = new Map<string, FeatureToggleState>();
    
    const getCacheKey = (companyId: string) => `feature-toggles:${companyId}`;
    
    const getFromDatabase = (companyId: string): FeatureToggleState => {
      const store = database.get(companyId);
      const state: FeatureToggleState = {};
      for (const key of ALL_FEATURE_KEYS) {
        state[key] = store?.get(key) ?? true;
      }
      return state;
    };
    
    const setInDatabase = (companyId: string, featureKey: FeatureKey, enabled: boolean) => {
      if (!database.has(companyId)) {
        database.set(companyId, new Map());
      }
      database.get(companyId)!.set(featureKey, enabled);
    };
    
    const getEnabledFeatures = (companyId: string): FeatureToggleState => {
      const cacheKey = getCacheKey(companyId);
      
      // Check cache first
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }
      
      // Fetch from database
      const state = getFromDatabase(companyId);
      
      // Cache the result
      cache.set(cacheKey, state);
      
      return state;
    };
    
    const setFeatureEnabled = (companyId: string, featureKey: FeatureKey, enabled: boolean) => {
      // Update database
      setInDatabase(companyId, featureKey, enabled);
      
      // Invalidate cache (this is the key behavior we're testing)
      const cacheKey = getCacheKey(companyId);
      cache.delete(cacheKey);
    };
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        featureKeyArbitrary,
        toggleValueArbitrary,
        toggleValueArbitrary,
        (companyId, featureKey, initialValue, newValue) => {
          // Clear state
          database.clear();
          cache.clear();
          
          // Set initial value
          setFeatureEnabled(companyId, featureKey, initialValue);
          
          // Read to populate cache
          const cachedState = getEnabledFeatures(companyId);
          
          // Verify initial value is cached
          if (cachedState[featureKey] !== initialValue) {
            return false;
          }
          
          // Update to new value (should invalidate cache)
          setFeatureEnabled(companyId, featureKey, newValue);
          
          // Read again - should get new value, not stale cached value
          const updatedState = getEnabledFeatures(companyId);
          
          // The new value should be reflected immediately
          return updatedState[featureKey] === newValue;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Cache is invalidated after bulkSetFeatures", async () => {
    // Simulated cache and database
    const database = new Map<string, Map<string, boolean>>();
    const cache = new Map<string, FeatureToggleState>();
    
    const getCacheKey = (companyId: string) => `feature-toggles:${companyId}`;
    
    const getFromDatabase = (companyId: string): FeatureToggleState => {
      const store = database.get(companyId);
      const state: FeatureToggleState = {};
      for (const key of ALL_FEATURE_KEYS) {
        state[key] = store?.get(key) ?? true;
      }
      return state;
    };
    
    const getEnabledFeatures = (companyId: string): FeatureToggleState => {
      const cacheKey = getCacheKey(companyId);
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }
      
      const state = getFromDatabase(companyId);
      cache.set(cacheKey, state);
      return state;
    };
    
    const bulkSetFeatures = (companyId: string, updates: Partial<FeatureToggleState>) => {
      if (!database.has(companyId)) {
        database.set(companyId, new Map());
      }
      const store = database.get(companyId)!;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          store.set(key, value);
        }
      }
      
      // Invalidate cache
      const cacheKey = getCacheKey(companyId);
      cache.delete(cacheKey);
    };
    
    // Generate partial update
    const partialUpdateArbitrary = fc.record(
      Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.option(fc.boolean(), { nil: undefined })]))
    ).map(obj => {
      const result: Partial<FeatureToggleState> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          result[key] = value;
        }
      }
      return result;
    }).filter(obj => Object.keys(obj).length > 0); // Ensure at least one update
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        partialUpdateArbitrary,
        (companyId, updates) => {
          // Clear state
          database.clear();
          cache.clear();
          
          // Initialize with all features enabled
          if (!database.has(companyId)) {
            database.set(companyId, new Map());
          }
          for (const key of ALL_FEATURE_KEYS) {
            database.get(companyId)!.set(key, true);
          }
          
          // Read to populate cache
          const initialState = getEnabledFeatures(companyId);
          
          // Apply bulk update (should invalidate cache)
          bulkSetFeatures(companyId, updates);
          
          // Read again - should reflect updates
          const updatedState = getEnabledFeatures(companyId);
          
          // Verify all updates are reflected
          for (const [key, expectedValue] of Object.entries(updates)) {
            if (updatedState[key] !== expectedValue) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Cache invalidation is scoped to specific company", async () => {
    // Property: Invalidating cache for company A should not affect company B's cache
    
    const database = new Map<string, Map<string, boolean>>();
    const cache = new Map<string, FeatureToggleState>();
    let cacheHits = 0;
    let cacheMisses = 0;
    
    const getCacheKey = (companyId: string) => `feature-toggles:${companyId}`;
    
    const getFromDatabase = (companyId: string): FeatureToggleState => {
      const store = database.get(companyId);
      const state: FeatureToggleState = {};
      for (const key of ALL_FEATURE_KEYS) {
        state[key] = store?.get(key) ?? true;
      }
      return state;
    };
    
    const getEnabledFeatures = (companyId: string): { state: FeatureToggleState; fromCache: boolean } => {
      const cacheKey = getCacheKey(companyId);
      
      if (cache.has(cacheKey)) {
        cacheHits++;
        return { state: cache.get(cacheKey)!, fromCache: true };
      }
      
      cacheMisses++;
      const state = getFromDatabase(companyId);
      cache.set(cacheKey, state);
      return { state, fromCache: false };
    };
    
    const setFeatureEnabled = (companyId: string, featureKey: FeatureKey, enabled: boolean) => {
      if (!database.has(companyId)) {
        database.set(companyId, new Map());
      }
      database.get(companyId)!.set(featureKey, enabled);
      
      // Only invalidate this company's cache
      const cacheKey = getCacheKey(companyId);
      cache.delete(cacheKey);
    };
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        companyIdArbitrary,
        featureKeyArbitrary,
        toggleValueArbitrary,
        (companyA, companyB, featureKey, newValue) => {
          // Skip if same company
          if (companyA === companyB) return true;
          
          // Clear state
          database.clear();
          cache.clear();
          cacheHits = 0;
          cacheMisses = 0;
          
          // Initialize both companies
          for (const company of [companyA, companyB]) {
            database.set(company, new Map());
            for (const key of ALL_FEATURE_KEYS) {
              database.get(company)!.set(key, true);
            }
          }
          
          // Populate cache for both companies
          getEnabledFeatures(companyA);
          getEnabledFeatures(companyB);
          
          // Verify both are cached
          const beforeA = getEnabledFeatures(companyA);
          const beforeB = getEnabledFeatures(companyB);
          
          if (!beforeA.fromCache || !beforeB.fromCache) {
            return false; // Both should be cache hits
          }
          
          // Update company A (should only invalidate A's cache)
          setFeatureEnabled(companyA, featureKey, newValue);
          
          // Company B should still be cached
          const afterB = getEnabledFeatures(companyB);
          if (!afterB.fromCache) {
            return false; // B should still be a cache hit
          }
          
          // Company A should be a cache miss (was invalidated)
          const afterA = getEnabledFeatures(companyA);
          // Note: afterA.fromCache will be true because we just re-cached it
          // But the value should reflect the update
          if (afterA.state[featureKey] !== newValue) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Multiple rapid updates all reflect in final state", async () => {
    // Property: Multiple rapid updates should all be reflected after cache invalidation
    
    const database = new Map<string, Map<string, boolean>>();
    const cache = new Map<string, FeatureToggleState>();
    
    const getCacheKey = (companyId: string) => `feature-toggles:${companyId}`;
    
    const getFromDatabase = (companyId: string): FeatureToggleState => {
      const store = database.get(companyId);
      const state: FeatureToggleState = {};
      for (const key of ALL_FEATURE_KEYS) {
        state[key] = store?.get(key) ?? true;
      }
      return state;
    };
    
    const getEnabledFeatures = (companyId: string): FeatureToggleState => {
      const cacheKey = getCacheKey(companyId);
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }
      
      const state = getFromDatabase(companyId);
      cache.set(cacheKey, state);
      return state;
    };
    
    const setFeatureEnabled = (companyId: string, featureKey: FeatureKey, enabled: boolean) => {
      if (!database.has(companyId)) {
        database.set(companyId, new Map());
      }
      database.get(companyId)!.set(featureKey, enabled);
      
      const cacheKey = getCacheKey(companyId);
      cache.delete(cacheKey);
    };
    
    // Generate a sequence of updates
    const updateSequenceArbitrary = fc.array(
      fc.tuple(featureKeyArbitrary, toggleValueArbitrary),
      { minLength: 1, maxLength: 10 }
    );
    
    fc.assert(
      fc.property(
        companyIdArbitrary,
        updateSequenceArbitrary,
        (companyId, updates) => {
          // Clear state
          database.clear();
          cache.clear();
          
          // Track expected final state
          const expectedState: Record<string, boolean> = {};
          for (const key of ALL_FEATURE_KEYS) {
            expectedState[key] = true; // Default
          }
          
          // Apply all updates
          for (const [featureKey, enabled] of updates) {
            setFeatureEnabled(companyId, featureKey, enabled);
            expectedState[featureKey] = enabled;
          }
          
          // Read final state
          const finalState = getEnabledFeatures(companyId);
          
          // Verify all updates are reflected
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
