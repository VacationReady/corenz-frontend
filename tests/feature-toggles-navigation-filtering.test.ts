/**
 * Property-based tests for Navigation Filtering Consistency
 * Feature: tenant-feature-toggles
 * Property 3: Navigation Filtering Consistency
 * Validates: Requirements 3.1, 3.2, 3.3
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
  getFeatureKeyForPath,
} from "../lib/feature-toggles/types";

/**
 * Simulated filterNavItems function that mirrors the hook implementation
 * This allows us to test the filtering logic without React dependencies
 */
function filterNavItems<T extends { href: string }>(
  items: T[],
  enabledFeatures: FeatureToggleState
): T[] {
  return items.filter((item) => {
    // Check if this item's href maps to a feature
    for (const [featureKey, paths] of Object.entries(FEATURE_TO_PATHS)) {
      // Check if the item's href starts with any of the feature's paths
      const matchesFeature = paths.some((path) => {
        // Exact match or starts with path (for nested routes)
        return item.href === path || item.href.startsWith(path + "/");
      });

      if (matchesFeature) {
        // This item is associated with a feature, check if it's enabled
        return enabledFeatures[featureKey] ?? true;
      }
    }

    // Item is not associated with any feature, always show it
    return true;
  });
}

/**
 * Property 3: Navigation Filtering Consistency
 * For any sidebar type (admin, manager, employee) and any disabled feature,
 * navigation items mapped to that feature should not appear in the rendered navigation.
 * 
 * Feature: tenant-feature-toggles, Property 3: Navigation Filtering Consistency
 * Validates: Requirements 3.1, 3.2, 3.3
 */
test("Property 3: Navigation Filtering Consistency", async (t) => {
  // Sample navigation items that mirror the actual sidebar configurations
  const adminNavItems = [
    { href: "/dashboard/admin", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/calendar", label: "Calendar" },
    { href: "/documents", label: "Documents" },
    { href: "/reports", label: "Reports" },
    { href: "/performance", label: "Performance" },
    { href: "/analytics", label: "Analytics" },
    { href: "/admin/timesheets/hub", label: "Timesheets" },
    { href: "/rota", label: "Rota/Shifts" },
    { href: "/admin/reconciliation", label: "Reconciliation" },
    { href: "/org-chart", label: "Org Chart" },
    { href: "/news", label: "News" },
    { href: "/surveys", label: "Surveys" },
    { href: "/bulk-actions", label: "Bulk Actions" },
    { href: "/settings/automation-rules", label: "App Library" },
  ];

  const managerNavItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/calendar", label: "Calendar" },
    { href: "/rota", label: "Team Schedule" },
    { href: "/admin/timesheets/hub", label: "Timesheets" },
    { href: "/admin/reconciliation", label: "Reconciliation" },
    { href: "/documents", label: "Documents" },
    { href: "/performance", label: "Performance" },
    { href: "/org-chart", label: "Org Chart" },
  ];

  const employeeNavItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/calendar", label: "Calendar" },
    { href: "/employee/timesheet", label: "My Timesheet" },
    { href: "/employee/schedule", label: "My Schedule" },
    { href: "/performance", label: "My Performance" },
    { href: "/documents", label: "Documents" },
  ];

  // Arbitrary for generating feature toggle states
  const featureToggleStateArbitrary = fc.record(
    Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.boolean()]))
  ) as fc.Arbitrary<FeatureToggleState>;

  await t.test("Disabled features should not appear in admin navigation", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const filteredItems = filterNavItems(adminNavItems, toggleState);
          
          // For each filtered item, verify it's either:
          // 1. Not associated with any feature (core route)
          // 2. Associated with an enabled feature
          for (const item of filteredItems) {
            const featureKey = getFeatureKeyForPath(item.href);
            if (featureKey) {
              // Item is associated with a feature, it should be enabled
              if (toggleState[featureKey] === false) {
                return false; // Disabled feature item should not appear
              }
            }
          }
          
          // Verify disabled feature items are NOT in the filtered list
          for (const item of adminNavItems) {
            const featureKey = getFeatureKeyForPath(item.href);
            if (featureKey && toggleState[featureKey] === false) {
              // This item should NOT be in filtered results
              const found = filteredItems.some(fi => fi.href === item.href);
              if (found) {
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

  await t.test("Disabled features should not appear in manager navigation", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const filteredItems = filterNavItems(managerNavItems, toggleState);
          
          // Verify disabled feature items are NOT in the filtered list
          for (const item of managerNavItems) {
            const featureKey = getFeatureKeyForPath(item.href);
            if (featureKey && toggleState[featureKey] === false) {
              const found = filteredItems.some(fi => fi.href === item.href);
              if (found) {
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

  await t.test("Disabled features should not appear in employee navigation", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const filteredItems = filterNavItems(employeeNavItems, toggleState);
          
          // Verify disabled feature items are NOT in the filtered list
          for (const item of employeeNavItems) {
            const featureKey = getFeatureKeyForPath(item.href);
            if (featureKey && toggleState[featureKey] === false) {
              const found = filteredItems.some(fi => fi.href === item.href);
              if (found) {
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

  await t.test("Core routes should always be visible regardless of toggle state", async () => {
    // Core routes that should never be filtered
    const coreRoutes = [
      "/dashboard",
      "/dashboard/admin",
      "/employees",
      "/calendar",
      "/documents",
      "/reports",
    ];

    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          // Test with admin nav items
          const filteredAdmin = filterNavItems(adminNavItems, toggleState);
          
          // Core routes should always be present
          for (const coreRoute of coreRoutes) {
            const originalItem = adminNavItems.find(item => item.href === coreRoute);
            if (originalItem) {
              const found = filteredAdmin.some(item => item.href === coreRoute);
              if (!found) {
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

  await t.test("Enabled features should always appear in navigation", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const filteredItems = filterNavItems(adminNavItems, toggleState);
          
          // For each enabled feature, its nav items should be present
          for (const item of adminNavItems) {
            const featureKey = getFeatureKeyForPath(item.href);
            if (featureKey && toggleState[featureKey] === true) {
              // This item should be in filtered results
              const found = filteredItems.some(fi => fi.href === item.href);
              if (!found) {
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

  await t.test("All features enabled should show all navigation items", async () => {
    const allEnabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      allEnabled[key] = true;
    }

    const filteredAdmin = filterNavItems(adminNavItems, allEnabled);
    const filteredManager = filterNavItems(managerNavItems, allEnabled);
    const filteredEmployee = filterNavItems(employeeNavItems, allEnabled);

    // All items should be present
    assert.equal(filteredAdmin.length, adminNavItems.length, "Admin nav should have all items");
    assert.equal(filteredManager.length, managerNavItems.length, "Manager nav should have all items");
    assert.equal(filteredEmployee.length, employeeNavItems.length, "Employee nav should have all items");
  });

  await t.test("All features disabled should only show core routes", async () => {
    const allDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      allDisabled[key] = false;
    }

    const filteredAdmin = filterNavItems(adminNavItems, allDisabled);
    
    // Only core routes (not associated with any feature) should remain
    for (const item of filteredAdmin) {
      const featureKey = getFeatureKeyForPath(item.href);
      // If item has a feature key, it should not be in the filtered list
      // (but we already filtered, so this checks the inverse)
      if (featureKey) {
        // This shouldn't happen - feature items should be filtered out
        assert.fail(`Feature item ${item.href} should not appear when all features disabled`);
      }
    }
  });

  await t.test("Filtering is idempotent", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const firstFilter = filterNavItems(adminNavItems, toggleState);
          const secondFilter = filterNavItems(firstFilter, toggleState);
          
          // Filtering twice should produce the same result
          if (firstFilter.length !== secondFilter.length) {
            return false;
          }
          
          for (let i = 0; i < firstFilter.length; i++) {
            if (firstFilter[i].href !== secondFilter[i].href) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Filtering preserves item order", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const filteredItems = filterNavItems(adminNavItems, toggleState);
          
          // Get indices of filtered items in original array
          const indices = filteredItems.map(item => 
            adminNavItems.findIndex(orig => orig.href === item.href)
          );
          
          // Indices should be in ascending order (preserving original order)
          for (let i = 1; i < indices.length; i++) {
            if (indices[i] <= indices[i - 1]) {
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
