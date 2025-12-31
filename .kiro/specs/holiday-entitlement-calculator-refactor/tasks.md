# Implementation Plan: Holiday Entitlement Calculator Refactor

## Overview

Refactor the existing Holiday Entitlement Calculator in AddEmployeeModal to use simple pro-rata calculation while keeping the existing UI. Fix the "discard changes" dialog issue that appears when using the calculator.

## Tasks

- [x] 1. Fix the "discard changes" dialog issue in Holiday Entitlement Calculator
  - Investigate why the calculator triggers the unsaved changes dialog
  - Prevent the calculator modal from being treated as form changes
  - Ensure calculator interactions don't affect the main form's dirty state
  - _Requirements: 6.5_

- [x] 2. Simplify the calculateEntitlement function
  - Remove anniversary date calculations and complex accrual logic
  - Implement simple pro-rata formula: (working days per week ÷ 5) × full-time entitlement
  - Keep existing UI elements and structure
  - Ensure working pattern integration works correctly
  - _Requirements: 1.3, 2.3, 5.1, 5.3_

- [x] 3. Improve calculation display and validation
  - Show clear calculation breakdown in the result area
  - Add proper validation for missing working pattern
  - Ensure rounding to nearest 0.5 days
  - Maintain existing error handling patterns
  - _Requirements: 3.2, 3.3, 7.1, 7.4_

- [x] 4. Test the refactored calculator
  - Verify pro-rata calculations for various working patterns
  - Test with full-time, part-time, and complex patterns
  - Ensure no regressions in existing functionality
  - Confirm the "discard changes" issue is resolved
  - _Requirements: 1.5, 2.5, 6.5_

## Notes

- Keep all existing UI components and styling
- Focus only on the calculation logic and the discard changes bug
- Maintain backward compatibility with existing form behavior
- No design changes needed - pure logic refactor