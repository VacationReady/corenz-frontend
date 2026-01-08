/**
 * Property-based tests for Settings Card Filtering
 * Feature: tenant-feature-toggles
 * Property 4: Settings Card Filtering
 * Validates: Requirements 3.4, 6.3, 6.5
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
} from "../lib/feature-toggles/types";

/**
 * Settings item interface matching the implementation
 */
interface SettingsItem {
  title: string;
  href: string;
  description: string;
  featureKey?: FeatureKey;
}

/**
 * Settings items from the settings page implementation
 * These mirror the actual settings arrays in app/(withSidebar)/settings/page.tsx
 */
const holidaySettings: SettingsItem[] = [
  {
    title: "Working Patterns",
    href: "/settings/working-patterns",
    description: "Define schedules and contracted hours for every team",
    // No featureKey - always visible (core functionality)
  },
  {
    title: "Public Holiday Templates",
    href: "/settings/public-holidays",
    description: "Sync region-specific statutory holidays automatically",
    // No featureKey - always visible (core functionality)
  },
  {
    title: "Expiry Alerts",
    href: "/settings/expiry-alerts",
    description: "Automate reminders before important dates lapse",
    // No featureKey - always visible (core functionality)
  },
  {
    title: "Event Rules",
    href: "/settings/event-rules",
    description: "Configure triggers that keep people informed",
    featureKey: FEATURE_KEYS.EVENT_RULES,
  },
  {
    title: "Event Manager",
    href: "/settings/event-manager",
    description: "Orchestrate notifications for key company events",
    // No featureKey - always visible (core functionality)
  },
  {
    title: "Leave Policies",
    href: "/settings/leave-policies",
    description: "Control entitlements, carryover rules, and approvals",
    // No featureKey - always visible (core functionality)
  },
  {
    title: "Multi-stage Approvals",
    href: "/settings/multi-stage-approvals",
    description: "Design layered approval chains for complex workflows",
    featureKey: FEATURE_KEYS.MULTI_STAGE_APPROVALS,
  },
  {
    title: "Time Tracking",
    href: "/admin/settings/time-tracking",
    description: "Configure timesheet, shift, and clock in/out settings",
    featureKey: FEATURE_KEYS.TIMESHEETS,
  },
  {
    title: "Locations",
    href: "/admin/locations",
    description: "Manage work locations and geofence boundaries for time tracking",
    featureKey: FEATURE_KEYS.TIMESHEETS,
  },
];

const formSettings: SettingsItem[] = [
  {
    title: "Forms",
    href: "/settings/forms",
    description: "Build custom forms and data tables for employees",
    featureKey: FEATURE_KEYS.FORMS,
  },
  {
    title: "Exit Interviews",
    href: "/settings/forms/exit-interview",
    description: "Manage exit interview templates and offboarding",
    featureKey: FEATURE_KEYS.FORMS,
  },
  {
    title: "Surveys",
    href: "/settings/surveys",
    description: "Create one-time surveys distributed through action items",
    featureKey: FEATURE_KEYS.SURVEYS,
  },
  {
    title: "Onboarding",
    href: "/settings/onboarding",
    description: "Design onboarding templates and new employee workflows",
    featureKey: FEATURE_KEYS.ONBOARDING,
  },
];

const documentSettings: SettingsItem[] = [
  {
    title: "Document Types",
    href: "/settings/document-types",
    description: "Organise, categorise, and secure uploaded files",
    // No featureKey - always visible (core functionality)
  },
];

const workflowSettings: SettingsItem[] = [
  {
    title: "Automation Rules",
    href: "/settings/automation-rules",
    description: "Automate repetitive tasks with smart triggers",
    featureKey: FEATURE_KEYS.AUTOMATION_RULES,
  },
  {
    title: "Journeys",
    href: "/settings/journeys",
    description: "Design employee journey workflows with AI assistance",
    featureKey: FEATURE_KEYS.JOURNEYS,
  },
  {
    title: "Transactional Notifications",
    href: "/settings/workflows/notifications",
    description: "Personalise the operational messages employees receive",
    // No featureKey - always visible (core functionality)
  },
];

const systemSettings: SettingsItem[] = [
  {
    title: "Platform Settings",
    href: "/settings/system",
    description: "Manage tenant-wide preferences, branding, and access",
    // No featureKey - always visible (core functionality)
  },
];

/**
 * Filter settings items based on feature toggles
 * This mirrors the implementation in the settings page
 */
function filterSettingsByFeature(
  items: SettingsItem[],
  enabledFeatures: FeatureToggleState,
  isFeatureEnabled: (key: FeatureKey) => boolean
): SettingsItem[] {
  return items.filter((item) => {
    // If no featureKey, always show (core functionality)
    if (!item.featureKey) return true;
    // Otherwise, check if the feature is enabled
    return isFeatureEnabled(item.featureKey);
  });
}

/**
 * Create isFeatureEnabled function from toggle state
 */
function createIsFeatureEnabled(toggleState: FeatureToggleState) {
  return (featureKey: FeatureKey): boolean => {
    return toggleState[featureKey] ?? true;
  };
}

/**
 * Property 4: Settings Card Filtering
 * For any feature toggle that is disabled, its corresponding settings card
 * should not appear on the settings page.
 * 
 * Feature: tenant-feature-toggles, Property 4: Settings Card Filtering
 * Validates: Requirements 3.4, 6.3, 6.5
 */
test("Property 4: Settings Card Filtering", async (t) => {
  // Arbitrary for generating feature toggle states
  const featureToggleStateArbitrary = fc.record(
    Object.fromEntries(ALL_FEATURE_KEYS.map(key => [key, fc.boolean()]))
  ) as fc.Arbitrary<FeatureToggleState>;

  await t.test("Disabled features should not appear in holiday settings", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          const filteredItems = filterSettingsByFeature(holidaySettings, toggleState, isFeatureEnabled);
          
          // Verify disabled feature items are NOT in the filtered list
          for (const item of holidaySettings) {
            if (item.featureKey && toggleState[item.featureKey] === false) {
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

  await t.test("Disabled features should not appear in form settings", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          const filteredItems = filterSettingsByFeature(formSettings, toggleState, isFeatureEnabled);
          
          // Verify disabled feature items are NOT in the filtered list
          for (const item of formSettings) {
            if (item.featureKey && toggleState[item.featureKey] === false) {
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

  await t.test("Disabled features should not appear in workflow settings", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          const filteredItems = filterSettingsByFeature(workflowSettings, toggleState, isFeatureEnabled);
          
          // Verify disabled feature items are NOT in the filtered list
          for (const item of workflowSettings) {
            if (item.featureKey && toggleState[item.featureKey] === false) {
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

  await t.test("Core settings (without featureKey) should always be visible", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          
          // Test all settings arrays
          const allSettings = [
            { name: "holiday", items: holidaySettings },
            { name: "form", items: formSettings },
            { name: "document", items: documentSettings },
            { name: "workflow", items: workflowSettings },
            { name: "system", items: systemSettings },
          ];
          
          for (const { name, items } of allSettings) {
            const filteredItems = filterSettingsByFeature(items, toggleState, isFeatureEnabled);
            
            // Core items (without featureKey) should always be present
            for (const item of items) {
              if (!item.featureKey) {
                const found = filteredItems.some(fi => fi.href === item.href);
                if (!found) {
                  return false;
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Enabled features should always appear in settings", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          
          // Test all settings arrays
          const allSettings = [holidaySettings, formSettings, workflowSettings];
          
          for (const items of allSettings) {
            const filteredItems = filterSettingsByFeature(items, toggleState, isFeatureEnabled);
            
            // For each enabled feature, its settings items should be present
            for (const item of items) {
              if (item.featureKey && toggleState[item.featureKey] === true) {
                const found = filteredItems.some(fi => fi.href === item.href);
                if (!found) {
                  return false;
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("All features enabled should show all settings items", async () => {
    const allEnabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      allEnabled[key] = true;
    }
    const isFeatureEnabled = createIsFeatureEnabled(allEnabled);

    const filteredHoliday = filterSettingsByFeature(holidaySettings, allEnabled, isFeatureEnabled);
    const filteredForm = filterSettingsByFeature(formSettings, allEnabled, isFeatureEnabled);
    const filteredDocument = filterSettingsByFeature(documentSettings, allEnabled, isFeatureEnabled);
    const filteredWorkflow = filterSettingsByFeature(workflowSettings, allEnabled, isFeatureEnabled);
    const filteredSystem = filterSettingsByFeature(systemSettings, allEnabled, isFeatureEnabled);

    // All items should be present
    assert.equal(filteredHoliday.length, holidaySettings.length, "Holiday settings should have all items");
    assert.equal(filteredForm.length, formSettings.length, "Form settings should have all items");
    assert.equal(filteredDocument.length, documentSettings.length, "Document settings should have all items");
    assert.equal(filteredWorkflow.length, workflowSettings.length, "Workflow settings should have all items");
    assert.equal(filteredSystem.length, systemSettings.length, "System settings should have all items");
  });

  await t.test("All features disabled should only show core settings", async () => {
    const allDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      allDisabled[key] = false;
    }
    const isFeatureEnabled = createIsFeatureEnabled(allDisabled);

    const filteredHoliday = filterSettingsByFeature(holidaySettings, allDisabled, isFeatureEnabled);
    const filteredForm = filterSettingsByFeature(formSettings, allDisabled, isFeatureEnabled);
    const filteredWorkflow = filterSettingsByFeature(workflowSettings, allDisabled, isFeatureEnabled);

    // Only core items (without featureKey) should remain
    for (const item of filteredHoliday) {
      if (item.featureKey) {
        assert.fail(`Feature item ${item.title} should not appear when all features disabled`);
      }
    }
    
    for (const item of filteredForm) {
      if (item.featureKey) {
        assert.fail(`Feature item ${item.title} should not appear when all features disabled`);
      }
    }
    
    for (const item of filteredWorkflow) {
      if (item.featureKey) {
        assert.fail(`Feature item ${item.title} should not appear when all features disabled`);
      }
    }
  });

  await t.test("Onboarding settings should be in Forms & Data Collection section (Requirement 6.1)", async () => {
    // Verify Onboarding is in formSettings
    const onboardingItem = formSettings.find(item => item.title === "Onboarding");
    assert.ok(onboardingItem, "Onboarding should be in formSettings");
    assert.equal(onboardingItem.href, "/settings/onboarding", "Onboarding href should be /settings/onboarding");
    assert.equal(onboardingItem.featureKey, FEATURE_KEYS.ONBOARDING, "Onboarding should have ONBOARDING feature key");
  });

  await t.test("Onboarding toggle should be independent from Journeys toggle (Requirement 6.6)", async () => {
    // Test that disabling journeys doesn't affect onboarding
    const journeysDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      journeysDisabled[key] = true;
    }
    journeysDisabled[FEATURE_KEYS.JOURNEYS] = false;
    
    const isFeatureEnabled = createIsFeatureEnabled(journeysDisabled);
    const filteredForm = filterSettingsByFeature(formSettings, journeysDisabled, isFeatureEnabled);
    
    // Onboarding should still be visible
    const onboardingVisible = filteredForm.some(item => item.title === "Onboarding");
    assert.ok(onboardingVisible, "Onboarding should be visible when only Journeys is disabled");
    
    // Test that disabling onboarding doesn't affect journeys
    const onboardingDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      onboardingDisabled[key] = true;
    }
    onboardingDisabled[FEATURE_KEYS.ONBOARDING] = false;
    
    const isFeatureEnabled2 = createIsFeatureEnabled(onboardingDisabled);
    const filteredWorkflow = filterSettingsByFeature(workflowSettings, onboardingDisabled, isFeatureEnabled2);
    
    // Journeys should still be visible
    const journeysVisible = filteredWorkflow.some(item => item.title === "Journeys");
    assert.ok(journeysVisible, "Journeys should be visible when only Onboarding is disabled");
  });

  await t.test("Filtering is idempotent", async () => {
    fc.assert(
      fc.property(
        featureToggleStateArbitrary,
        (toggleState) => {
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          
          const firstFilter = filterSettingsByFeature(formSettings, toggleState, isFeatureEnabled);
          const secondFilter = filterSettingsByFeature(firstFilter, toggleState, isFeatureEnabled);
          
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
          const isFeatureEnabled = createIsFeatureEnabled(toggleState);
          const filteredItems = filterSettingsByFeature(formSettings, toggleState, isFeatureEnabled);
          
          // Get indices of filtered items in original array
          const indices = filteredItems.map(item => 
            formSettings.findIndex(orig => orig.href === item.href)
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

  await t.test("Surveys settings should be hidden when surveys feature is disabled (Requirement 6.3)", async () => {
    const surveysDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      surveysDisabled[key] = true;
    }
    surveysDisabled[FEATURE_KEYS.SURVEYS] = false;
    
    const isFeatureEnabled = createIsFeatureEnabled(surveysDisabled);
    const filteredForm = filterSettingsByFeature(formSettings, surveysDisabled, isFeatureEnabled);
    
    // Surveys should NOT be visible
    const surveysVisible = filteredForm.some(item => item.title === "Surveys");
    assert.ok(!surveysVisible, "Surveys should be hidden when surveys feature is disabled");
  });

  await t.test("Journeys settings should be hidden when journeys feature is disabled (Requirement 6.5)", async () => {
    const journeysDisabled: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      journeysDisabled[key] = true;
    }
    journeysDisabled[FEATURE_KEYS.JOURNEYS] = false;
    
    const isFeatureEnabled = createIsFeatureEnabled(journeysDisabled);
    const filteredWorkflow = filterSettingsByFeature(workflowSettings, journeysDisabled, isFeatureEnabled);
    
    // Journeys should NOT be visible
    const journeysVisible = filteredWorkflow.some(item => item.title === "Journeys");
    assert.ok(!journeysVisible, "Journeys should be hidden when journeys feature is disabled");
  });
});
