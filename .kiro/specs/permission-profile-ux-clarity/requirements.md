# Requirements Document

## Introduction

This feature addresses two critical issues with the Permission Profile system:

1. **UX Clarity Issue**: The permission tick box grid in the employee settings page (`/employees/[id]/settings`) is misleading. The labels (Employee Documents, Employee Leave, etc.) do not clearly communicate that these permissions control access to OTHER employees' data, not the employee's own data. All employees inherently have access to their own profile screens, documents, leave, etc.

2. **Permission Enforcement Bug**: When an employee is granted permissions via a custom permission profile (e.g., "employee-documents" with read/edit), the system does not honour these permissions. The employees list page and API routes only check the user's role (ADMIN, MANAGER, EMPLOYEE) and ignore custom permission profiles. This means employees with granted permissions still see other employees as "read only" and cannot access their profiles.

## Glossary

- **Permission_Profile**: A named set of screen-level permissions that can be assigned to users
- **Permission_Editor**: The tick box grid UI component that displays screens and actions (View, Edit, Delete)
- **Self_Access**: The inherent ability of any employee to view their own data (profile, documents, leave, etc.)
- **Others_Access**: Permission to view/edit data belonging to other employees in the organisation
- **Screen_Permission**: A permission entry that grants access to a specific area of the system
- **Employee_Profile_Screen**: A sub-screen within an employee's profile (e.g., employee-documents, employee-leave)

## Requirements

### Requirement 1: Explanatory Tooltip for Permission Grid

**User Story:** As an HR administrator, I want a clear explanation of what the permission grid controls, so that I understand these permissions grant access to OTHER employees' data, not the employee's own data.

#### Acceptance Criteria

1. WHEN the Permission Profile section is displayed, THE Permission_Editor SHALL include a prominent informational tooltip or banner explaining that employees always have access to their own screens by default
2. THE tooltip/banner SHALL clearly state that the permission grid below controls access to OTHER employees' information only
3. WHEN a user hovers over the information icon, THE System SHALL display the full explanation text
4. THE explanation text SHALL be concise and use plain language understandable by non-technical HR administrators

### Requirement 2: Screen Label Clarity for Employee Profile Screens

**User Story:** As an HR administrator, I want the permission screen labels to clearly indicate they control access to other employees' data, so that I don't confuse them with self-access permissions.

#### Acceptance Criteria

1. THE Permission_Editor SHALL display employee profile screens with labels that indicate "others" access (e.g., "Other Employees' Documents" instead of "Employee Documents")
2. WHEN displaying the screen list, THE System SHALL group employee profile screens separately from system-wide screens
3. THE System SHALL provide a section header for employee profile screens that clarifies these control access to other employees' profiles

### Requirement 3: Visual Distinction Between Screen Categories

**User Story:** As an HR administrator, I want to easily distinguish between system-wide permissions and employee profile permissions, so that I can quickly understand what each permission controls.

#### Acceptance Criteria

1. THE Permission_Editor SHALL visually separate system-wide screens (Dashboard, Calendar, Reports, etc.) from employee profile screens (Employee Documents, Employee Leave, etc.)
2. WHEN displaying the permission grid, THE System SHALL use section headers or visual dividers to group related screens
3. THE System SHALL display system-wide screens first, followed by employee profile screens

### Requirement 4: Contextual Help for Individual Screens

**User Story:** As an HR administrator, I want to understand what each permission screen controls, so that I can make informed decisions when configuring permissions.

#### Acceptance Criteria

1. WHEN a user hovers over a screen name in the Permission_Editor, THE System SHALL display a tooltip explaining what that permission controls
2. THE tooltip SHALL specify whether the permission affects self-access, others-access, or both
3. FOR employee profile screens, THE tooltip SHALL explicitly state "Allows viewing/editing this information for other employees"

### Requirement 5: Consistency Audit and Deduplication

**User Story:** As a system administrator, I want the permission system to be consistent across the codebase, so that there are no duplicate or conflicting permission definitions.

#### Acceptance Criteria

1. THE System SHALL use a single source of truth for screen permission definitions
2. THE System SHALL ensure all permission checks reference the same screen keys consistently
3. WHEN a permission is checked, THE System SHALL use the canonical permission key from the central definition
4. THE System SHALL not have duplicate screen entries in the permission grid

### Requirement 6: Default Profile Templates

**User Story:** As an HR administrator, I want pre-configured permission profiles for common roles (Employee, Manager, Admin), so that I can quickly assign appropriate permissions without manual configuration.

#### Acceptance Criteria

1. THE System SHALL provide built-in permission profiles for Employee, Manager, and Admin roles
2. WHEN displaying built-in profiles, THE System SHALL clearly indicate they are system defaults
3. THE built-in profiles SHALL reflect the documented default permissions for each role
4. THE System SHALL allow administrators to create custom profiles based on built-in templates

### Requirement 7: Permission Profile Description Enhancement

**User Story:** As an HR administrator, I want each permission profile to have a clear description, so that I understand what access level it provides.

#### Acceptance Criteria

1. WHEN displaying a permission profile, THE System SHALL show a description explaining the access level
2. THE description SHALL summarise what the profile allows (e.g., "Full access to all employee records" or "View-only access to team members")
3. FOR custom profiles, THE System SHALL allow administrators to add/edit descriptions

### Requirement 8: Permission Profile Enforcement in Employee List

**User Story:** As an employee with granted permissions, I want to access other employees' profiles when I have the appropriate permissions, so that I can perform my job duties.

#### Acceptance Criteria

1. WHEN an employee has "employees" read permission via their permission profile, THE System SHALL allow them to view all employees in the employees list
2. WHEN an employee has any "employee-*" screen permission (e.g., employee-documents, employee-leave), THE System SHALL allow them to access employee profiles and navigate to those specific screens
3. THE employees list page SHALL check the user's permission profile in addition to their role
4. THE employees API route SHALL check the user's permission profile in addition to their role
5. WHEN an employee has permission to view other employees, THE System SHALL NOT display them as "read only" or greyed out

### Requirement 9: Permission Profile Enforcement in Employee Profile Pages

**User Story:** As an employee with granted permissions, I want to view and edit specific sections of other employees' profiles when I have the appropriate permissions.

#### Acceptance Criteria

1. WHEN an employee has "employee-documents" read permission, THE System SHALL allow them to view the documents tab for any employee
2. WHEN an employee has "employee-documents" edit permission, THE System SHALL allow them to upload documents for any employee
3. WHEN an employee has "employee-leave" read permission, THE System SHALL allow them to view the leave tab for any employee
4. WHEN an employee has "employee-leave" edit permission, THE System SHALL allow them to book leave for any employee
5. THE System SHALL apply the same pattern for all employee profile screens (employee-personal-information, employee-employment-details, etc.)

### Requirement 10: Consistent Permission Checking Across Codebase

**User Story:** As a system administrator, I want permission checks to be consistent across all parts of the system, so that permissions work reliably.

#### Acceptance Criteria

1. THE System SHALL use the `hasPermission()` function from `app/lib/permissions.ts` as the single source of truth for permission checks
2. THE System SHALL use the `canAccessEmployee()` function for determining if a user can access another employee's record
3. ALL API routes that access employee data SHALL check permissions using these canonical functions
4. ALL client-side components that display employee data SHALL respect the same permission rules
5. THE System SHALL NOT have duplicate or conflicting permission logic in different parts of the codebase
