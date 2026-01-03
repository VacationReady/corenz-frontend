/**
 * Property-based tests for Screen Ordering
 * Feature: permission-profile-ux-clarity
 * Property 5: System Screens Ordered Before Employee Profile Screens
 * Validates: Requirements 3.3
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  SCREEN_METADATA, 
  ScreenMetadata
} from "../app/lib/permissions";

/**
 * Property 5: System Screens Ordered Before Employee Profile Screens
 * For any rendering of the permission grid, all screens with category === 'system'
 * should appear before all screens with category === 'employee-profile'.
 * 
 * Feature: permission-profile-ux-clarity, Property 5: System Screens Ordered Before Employee Profile Screens
 * Validates: Requirements 3.3
 */
test("Property 5: System Screens Ordered Before Employee Profile Screens", async (t) => {
  // Get system and employee-profile screens
  const systemScreens = SCREEN_METADATA.filter(s => s.category === 'system');
  const employeeProfileScreens = SCREEN_METADATA.filter(s => s.category === 'employee-profile');

  await t.test("Both system and employee-profile screens exist", () => {
    // Sanity check: we should have both types of screens
    assert.ok(
      systemScreens.length > 0,
      "Expected at least one system screen in SCREEN_METADATA"
    );
    assert.ok(
      employeeProfileScreens.length > 0,
      "Expected at least one employee-profile screen in SCREEN_METADATA"
    );
  });

  await t.test("All system screens appear before all employee-profile screens in SCREEN_METADATA", () => {
    // Find the index of the last system screen
    let lastSystemIndex = -1;
    for (let i = 0; i < SCREEN_METADATA.length; i++) {
      if (SCREEN_METADATA[i].category === 'system') {
        lastSystemIndex = i;
      }
    }

    // Find the index of the first employee-profile screen
    let firstEmployeeProfileIndex = SCREEN_METADATA.length;
    for (let i = 0; i < SCREEN_METADATA.length; i++) {
      if (SCREEN_METADATA[i].category === 'employee-profile') {
        firstEmployeeProfileIndex = i;
        break;
      }
    }

    // Property: lastSystemIndex < firstEmployeeProfileIndex
    assert.ok(
      lastSystemIndex < firstEmployeeProfileIndex,
      `System screens should appear before employee-profile screens. ` +
      `Last system screen at index ${lastSystemIndex}, first employee-profile screen at index ${firstEmployeeProfileIndex}`
    );
  });

  await t.test("No employee-profile screen appears before any system screen", () => {
    // Property: For all pairs (system, employee-profile), system index < employee-profile index
    for (let i = 0; i < SCREEN_METADATA.length; i++) {
      for (let j = 0; j < SCREEN_METADATA.length; j++) {
        if (SCREEN_METADATA[i].category === 'employee-profile' && 
            SCREEN_METADATA[j].category === 'system') {
          assert.ok(
            j < i,
            `Employee-profile screen "${SCREEN_METADATA[i].key}" at index ${i} ` +
            `appears before system screen "${SCREEN_METADATA[j].key}" at index ${j}`
          );
        }
      }
    }
  });

  await t.test("Property-based: For any system screen and any employee-profile screen, system comes first", () => {
    // Property-based test using fast-check
    // For any pair of (system screen, employee-profile screen), the system screen index < employee-profile screen index
    
    if (systemScreens.length === 0 || employeeProfileScreens.length === 0) {
      // Skip if either category is empty (shouldn't happen, but be safe)
      return;
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...systemScreens),
        fc.constantFrom(...employeeProfileScreens),
        (systemScreen: ScreenMetadata, employeeProfileScreen: ScreenMetadata) => {
          const systemIndex = SCREEN_METADATA.findIndex(s => s.key === systemScreen.key);
          const employeeProfileIndex = SCREEN_METADATA.findIndex(s => s.key === employeeProfileScreen.key);
          
          return systemIndex < employeeProfileIndex;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("System screens form a contiguous block at the start", () => {
    // Property: All system screens should be in a contiguous block at the beginning
    let foundEmployeeProfile = false;
    for (const screen of SCREEN_METADATA) {
      if (screen.category === 'employee-profile') {
        foundEmployeeProfile = true;
      } else if (screen.category === 'system' && foundEmployeeProfile) {
        assert.fail(
          `System screen "${screen.key}" appears after employee-profile screens. ` +
          `System screens should form a contiguous block at the start.`
        );
      }
    }
  });

  await t.test("Employee-profile screens form a contiguous block at the end", () => {
    // Property: All employee-profile screens should be in a contiguous block at the end
    let foundSystem = false;
    // Iterate in reverse
    for (let i = SCREEN_METADATA.length - 1; i >= 0; i--) {
      const screen = SCREEN_METADATA[i];
      if (screen.category === 'system') {
        foundSystem = true;
      } else if (screen.category === 'employee-profile' && foundSystem) {
        assert.fail(
          `Employee-profile screen "${screen.key}" appears before system screens when iterating from end. ` +
          `Employee-profile screens should form a contiguous block at the end.`
        );
      }
    }
  });

  await t.test("Total screens equals system + employee-profile screens", () => {
    // Property: All screens should be categorized as either system or employee-profile
    const totalCategorized = systemScreens.length + employeeProfileScreens.length;
    assert.equal(
      totalCategorized,
      SCREEN_METADATA.length,
      `Total categorized screens (${totalCategorized}) should equal total screens (${SCREEN_METADATA.length})`
    );
  });
});
