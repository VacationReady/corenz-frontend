# Implementation Plan: Permission Profile UX Clarity & Enforcement

## Overview

This implementation plan addresses two critical issues:
1. UX clarity - making the permission grid intuitive by explaining it controls "others" access
2. Permission enforcement - ensuring custom permission profiles are honoured in the employees list and API

## Tasks

- [x] 1. Enhance permission metadata and functions
  - [x] 1.1 Add SCREEN_METADATA constant to app/lib/permissions.ts
    - Define ScreenMetadata interface with key, label, displayLabel, description, category, affectsOthers
    - Create SCREEN_METADATA array with all screens, categorized as 'system' or 'employee-profile'
    - Employee profile screens should have displayLabel like "Other Employees' Documents"
    - _Requirements: 2.1, 4.2, 4.3, 5.1_

  - [x] 1.2 Add canAccessEmployeeList function to app/lib/permissions.ts
    - Check if user is ADMIN/SUPER_ADMIN (always true)
    - Check if user is MANAGER (always true for team)
    - Check if user has "employees" read permission via profile
    - Check if user has ANY employee-* screen read permission via profile
    - _Requirements: 8.1, 8.2_

  - [x] 1.3 Update getAvailableScreens to return SCREEN_METADATA
    - Modify function to return full metadata objects instead of just keys
    - Add getScreenMetadata(key) helper function
    - _Requirements: 5.1, 5.2_

  - [x] 1.4 Write property test for screen metadata validity
    - **Property 4: Screen Metadata Uniqueness and Validity**
    - **Validates: Requirements 5.3, 5.4**

- [x] 2. Fix permission enforcement in employees API
  - [x] 2.1 Update app/api/employees/route.ts to check permission profiles
    - Fetch user's permission profile at start of GET handler
    - Use hasPermission() to check "employees" read permission
    - Use EMPLOYEE_PROFILE_SCREENS to check any employee-* permission
    - If user has permission via profile, don't apply role-based filtering
    - _Requirements: 8.3, 8.4, 10.1, 10.3_

  - [x] 2.2 Write property test for permission profile grants access
    - **Property 1: Permission Profile Grants Employee List Access**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 3. Fix permission enforcement in employees page
  - [x] 3.1 Update app/(withSidebar)/employees/page.tsx server component
    - Fetch user's permission profile
    - Use canAccessEmployeeList() to determine access level
    - Pass canAccess flag for each employee to client component
    - _Requirements: 8.3, 8.5_

  - [x] 3.2 Update app/(withSidebar)/employees/EmployeesClient.tsx
    - Remove hardcoded role checks for greying out employees
    - Use canAccess prop to determine if employee link is clickable
    - Remove "(View only)" text for employees user has permission to access
    - _Requirements: 8.5_

  - [x] 3.3 Write property test for canAccessEmployee respects profiles
    - **Property 7: canAccessEmployee Respects Permission Profiles**
    - **Validates: Requirements 8.1, 8.2, 10.2**

- [x] 4. Checkpoint - Ensure permission enforcement works
  - Ensure all tests pass, ask the user if questions arise.
  - Test manually: assign employee-documents permission to an employee, verify they can access other employees
  - Fixed: API now includes canAccess flag in response so client-side data doesn't revert to read-only
  - Fixed: "Change Permissions" button now only shows for ADMIN/SUPER_ADMIN users

- [ ] 5. Update PermissionEditor UI for clarity
  - [ ] 5.1 Add explanatory banner to PermissionEditor
    - Add Alert component at top of PermissionEditor
    - Text: "This employee will always have access to their own profile, documents, leave, and other personal screens. The permissions below control additional access to other employees' information."
    - Use blue info styling
    - _Requirements: 1.1, 1.2_

  - [ ] 5.2 Group screens by category with section headers
    - Filter screens into systemScreens and employeeProfileScreens
    - Add "System-wide Permissions" header for system screens
    - Add "Access to Other Employees' Profiles" header for employee-profile screens
    - Add help icon with tooltip explaining employee profile permissions
    - _Requirements: 2.2, 2.3, 3.1, 3.2_

  - [ ] 5.3 Use displayLabel for screen names
    - Update table to use screen.displayLabel instead of screen.label
    - Ensure employee-profile screens show "Other Employees' Documents" etc.
    - _Requirements: 2.1_

  - [ ] 5.4 Add tooltips for each screen
    - Wrap screen name in TooltipProvider/Tooltip
    - Display screen.description on hover
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 5.5 Write property test for employee profile screen labels
    - **Property 3: Employee Profile Screen Labels Indicate Others Access**
    - **Validates: Requirements 2.1, 4.2, 4.3**

- [ ] 6. Update permissions/screens API
  - [ ] 6.1 Update app/api/permissions/screens/route.ts
    - Return full SCREEN_METADATA objects instead of just key/label
    - Include displayLabel, description, category, affectsOthers
    - _Requirements: 4.1, 5.1_

- [ ] 7. Add info tooltip to PermissionProfileManagement
  - [ ] 7.1 Add tooltip to PermissionProfileManagement component
    - Add info icon next to "Permission Profile" heading
    - Tooltip text: "Employees always have access to their own screens. These permissions control access to other employees' data."
    - _Requirements: 1.1, 1.3_

- [ ] 8. Checkpoint - Ensure UI clarity improvements work
  - Ensure all tests pass, ask the user if questions arise.
  - Test manually: verify banner, section headers, tooltips, and renamed labels appear correctly

- [ ] 9. Write remaining property tests
  - [ ] 9.1 Write property test for screen ordering
    - **Property 5: System Screens Ordered Before Employee Profile Screens**
    - **Validates: Requirements 3.3**

  - [ ] 9.2 Write property test for default permissions
    - **Property 6: Default Permissions Match Role Definitions**
    - **Validates: Requirements 6.3**

  - [ ] 9.3 Write property test for screen permission grants profile access
    - **Property 2: Screen Permission Grants Profile Page Access**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no regressions in existing permission functionality

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
