# Design Document: Permission Profile UX Clarity & Enforcement

## Overview

This design addresses two critical issues with the Permission Profile system:

1. **UX Clarity**: The permission grid UI is misleading - users don't understand that permissions control access to OTHER employees' data, not their own
2. **Permission Enforcement**: Custom permission profiles are not being honoured in the employees list and profile pages

The solution involves:
- Adding explanatory UI elements (tooltips, banners, section headers)
- Renaming screen labels to clarify "others" access
- Fixing the employees API and page to check permission profiles
- Ensuring consistent permission checking across the codebase

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission System                             │
├─────────────────────────────────────────────────────────────────┤
│  app/lib/permissions.ts                                          │
│  ├── hasPermission(user, screen, action)                        │
│  ├── canAccessEmployee(requestor, targetEmployeeId)             │
│  ├── resolvePermissions(user)                                   │
│  └── EMPLOYEE_PROFILE_SCREENS[]                                 │
├─────────────────────────────────────────────────────────────────┤
│  Database: PermissionProfile                                     │
│  ├── id, companyId, name, description                           │
│  ├── permissions (JSON: { screen: [actions] })                  │
│  └── builtIn, constraints, scope                                │
├─────────────────────────────────────────────────────────────────┤
│  UI Components                                                   │
│  ├── PermissionProfileManagement.tsx                            │
│  ├── PermissionEditor.tsx (tick box grid)                       │
│  └── PermissionDiff.tsx                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Problem Areas

1. **Employees Page (`app/(withSidebar)/employees/page.tsx`)**: Uses hardcoded role checks, ignores permission profiles
2. **Employees API (`app/api/employees/route.ts`)**: Uses hardcoded role checks, ignores permission profiles
3. **PermissionEditor.tsx**: No explanation that permissions control "others" access
4. **Screen Labels**: "Employee Documents" is ambiguous - could mean self or others

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission System (Enhanced)                  │
├─────────────────────────────────────────────────────────────────┤
│  app/lib/permissions.ts (SINGLE SOURCE OF TRUTH)                │
│  ├── hasPermission(user, screen, action)                        │
│  ├── canAccessEmployee(requestor, targetEmployeeId) ← ENHANCED  │
│  ├── canAccessEmployeeList(user) ← NEW                          │
│  ├── getAccessibleEmployeeScreens(user)                         │
│  ├── SCREEN_METADATA[] ← NEW (labels, descriptions, categories) │
│  └── EMPLOYEE_PROFILE_SCREENS[]                                 │
├─────────────────────────────────────────────────────────────────┤
│  Employees Page & API                                            │
│  ├── Check canAccessEmployeeList() before filtering             │
│  ├── Use canAccessEmployee() for individual access              │
│  └── Remove hardcoded role checks                               │
├─────────────────────────────────────────────────────────────────┤
│  UI Components (Enhanced)                                        │
│  ├── PermissionEditor.tsx                                       │
│  │   ├── Explanatory banner at top                              │
│  │   ├── Section headers (System / Employee Profile)            │
│  │   ├── Renamed labels ("Other Employees' Documents")          │
│  │   └── Hover tooltips per screen                              │
│  └── PermissionProfileManagement.tsx                            │
│      └── Info tooltip explaining self vs others access          │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Permission Metadata (`app/lib/permissions.ts`)

```typescript
// Screen metadata for UI display and tooltips
export interface ScreenMetadata {
  key: string;
  label: string;
  displayLabel: string; // For UI (e.g., "Other Employees' Documents")
  description: string;  // Tooltip text
  category: 'system' | 'employee-profile';
  affectsOthers: boolean; // true for employee-* screens
}

export const SCREEN_METADATA: ScreenMetadata[] = [
  // System-wide screens
  {
    key: 'dashboard',
    label: 'Dashboard',
    displayLabel: 'Dashboard',
    description: 'Access to the main dashboard and overview',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'employees',
    label: 'Employees',
    displayLabel: 'Employee Directory',
    description: 'Access to view and manage the employee directory',
    category: 'system',
    affectsOthers: true,
  },
  // ... more system screens
  
  // Employee profile screens
  {
    key: 'employee-documents',
    label: 'Employee Documents',
    displayLabel: "Other Employees' Documents",
    description: 'View and manage documents for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-leave',
    label: 'Employee Leave',
    displayLabel: "Other Employees' Leave",
    description: 'View and manage leave requests for other employees',
    category: 'employee-profile',
    affectsOthers: true,
  },
  // ... more employee profile screens
];

// New function to check if user can access the employee list
export function canAccessEmployeeList(user: UserWithProfile): boolean {
  // ADMIN/SUPER_ADMIN always have access
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return true;
  }
  
  // MANAGER has access to their team
  if (user.role === 'MANAGER') {
    return true;
  }
  
  // Check if user has "employees" permission via profile
  if (hasPermission(user, 'employees', 'read')) {
    return true;
  }
  
  // Check if user has ANY employee-* screen permission
  for (const screen of EMPLOYEE_PROFILE_SCREENS) {
    if (hasPermission(user, screen, 'read')) {
      return true;
    }
  }
  
  return false;
}
```

### 2. Enhanced PermissionEditor Component

```typescript
// app/components/employees/PermissionEditor.tsx

interface PermissionEditorProps {
  screens: ScreenMetadata[];
  actions: { key: ActionKey; label: string }[];
  value: Record<string, ActionKey[]>;
  onChange: (next: Record<string, ActionKey[]>) => void;
}

export function PermissionEditor({ screens, actions, value, onChange }: PermissionEditorProps) {
  // Group screens by category
  const systemScreens = screens.filter(s => s.category === 'system');
  const employeeProfileScreens = screens.filter(s => s.category === 'employee-profile');
  
  return (
    <div className="space-y-6">
      {/* Explanatory Banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Note:</strong> This employee will always have access to their own profile, 
          documents, leave, and other personal screens. The permissions below control 
          additional access to <strong>other employees'</strong> information.
        </AlertDescription>
      </Alert>
      
      {/* System-wide Permissions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          System-wide Permissions
        </h3>
        <PermissionTable screens={systemScreens} actions={actions} value={value} onChange={onChange} />
      </div>
      
      {/* Employee Profile Permissions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          Access to Other Employees' Profiles
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                These permissions allow viewing and editing specific sections 
                of other employees' profiles in the organisation.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>
        <PermissionTable screens={employeeProfileScreens} actions={actions} value={value} onChange={onChange} />
      </div>
    </div>
  );
}
```

### 3. Updated Employees API Route

```typescript
// app/api/employees/route.ts - Key changes

export async function GET(req: NextRequest) {
  // ... existing auth checks ...
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { PermissionProfile: true },
  });
  
  const userWithProfile: UserWithProfile = {
    ...user,
    permissionProfile: user.PermissionProfile,
  };
  
  // Check if user can access employee list via permission profile
  const hasEmployeesPermission = hasPermission(userWithProfile, 'employees', 'read');
  const hasAnyEmployeeScreenPermission = EMPLOYEE_PROFILE_SCREENS.some(
    screen => hasPermission(userWithProfile, screen, 'read')
  );
  
  // Build where condition based on role AND permissions
  if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
    // Full access
  } else if (hasEmployeesPermission || hasAnyEmployeeScreenPermission) {
    // User has permission via profile - grant full employee list access
    // (Individual screen access will be checked on profile pages)
  } else if (session.user.role === 'MANAGER') {
    // Manager scope: department + direct reports
    // ... existing manager logic ...
  } else {
    // Employee scope: self + department colleagues
    // ... existing employee logic ...
  }
  
  // ... rest of query ...
}
```

### 4. Updated Employees Page Client

```typescript
// app/(withSidebar)/employees/EmployeesClient.tsx - Key changes

// In the columns definition, update the name cell:
cell: ({ row }) => {
  const emp = row.original as Employee;
  const targetUrl = `/employees/${emp.id}/overview`;
  
  // Check if current user can access this employee
  // This should be determined server-side and passed as a prop
  const canAccess = emp.canAccess ?? true; // Default to true for admins
  
  if (!canAccess) {
    // Show greyed out (view only)
    return (
      <div className="flex items-center gap-3 py-1 opacity-60">
        {/* ... */}
        <span className="text-xs text-muted-foreground">(View only)</span>
      </div>
    );
  }
  
  // Clickable link
  return (
    <Link href={targetUrl} className="group flex items-center gap-3 py-1">
      {/* ... */}
    </Link>
  );
}
```

## Data Models

### PermissionProfile (Existing - No Changes)

```prisma
model PermissionProfile {
  id          String   @id
  companyId   String
  name        String
  description String?
  permissions Json     // { "screen-key": ["read", "edit", "delete"] }
  builtIn     Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime
  constraints Json?
  scope       PermissionScope?
  
  Company     Company  @relation(fields: [companyId], references: [id])
  User        User[]
  
  @@unique([companyId, name])
}
```

### Screen Permission Keys (Canonical List)

```typescript
// System-wide screens
'dashboard'
'approvals'
'employees'
'calendar'
'documents'
'reports'
'org-chart'
'news'
'bulk-actions'
'settings'
'onboarding'
'offboarding'
'forms'
'leave-requests'
'working-patterns'
'departments'
'job-roles'
'permissions'

// Employee profile screens (control access to OTHER employees)
'employee-overview'
'employee-personal-information'
'employee-documents'
'employee-driver-licenses'
'employee-employment-checks'
'employee-employment-details'
'employee-emergency-contacts'
'employee-bank-payroll'
'employee-forms'
'employee-leave'
'employee-offboarding'
'employee-onboarding'
'employee-performance'
'employee-settings'
'employee-training'
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Permission Profile Grants Employee List Access

*For any* user with "employees" read permission OR any "employee-*" screen read permission via their permission profile, the employees API should return all employees in the company (not filtered by role-based restrictions).

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 2: Screen Permission Grants Profile Page Access

*For any* employee-* screen (e.g., employee-documents, employee-leave) and *for any* user with that screen's read permission via their permission profile, the corresponding API endpoint should allow access to that data for any employee in the company.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 3: Employee Profile Screen Labels Indicate Others Access

*For all* screens in SCREEN_METADATA where `category === 'employee-profile'`, the `displayLabel` should contain a phrase indicating access to other employees (e.g., "Other Employees'" or "Others'"), and the `description` should mention "other employees".

**Validates: Requirements 2.1, 4.2, 4.3**

### Property 4: Screen Metadata Uniqueness and Validity

*For all* entries in SCREEN_METADATA, the `key` field should be unique (no duplicates), and each key should be a member of the canonical `getAvailableScreens()` list.

**Validates: Requirements 5.3, 5.4**

### Property 5: System Screens Ordered Before Employee Profile Screens

*For any* rendering of the permission grid, all screens with `category === 'system'` should appear before all screens with `category === 'employee-profile'`.

**Validates: Requirements 3.3**

### Property 6: Default Permissions Match Role Definitions

*For all* built-in roles (ADMIN, MANAGER, EMPLOYEE), the `DEFAULT_PERMISSIONS[role]` object should match the documented permission set for that role.

**Validates: Requirements 6.3**

### Property 7: canAccessEmployee Respects Permission Profiles

*For any* user with "employees" read permission OR any "employee-*" screen read permission via their permission profile, `canAccessEmployee(user, anyEmployeeId)` should return `true` for any employee in the same company.

**Validates: Requirements 8.1, 8.2, 10.2**

## Error Handling

### Permission Denied Errors

1. **401 Unauthorized**: User is not authenticated
   - Response: `{ error: "Unauthorized" }`
   - Action: Redirect to login page

2. **403 Forbidden**: User lacks required permission
   - Response: `{ error: "Insufficient permissions" }`
   - Action: Display permission denied message, suggest contacting administrator

### Data Validation Errors

1. **Invalid Screen Key**: Permission check with unknown screen key
   - Behavior: `hasPermission()` returns `false` for unknown screens
   - Logging: Log warning for debugging

2. **Invalid Permission Profile**: Malformed permissions JSON
   - Behavior: Fall back to role-based default permissions
   - Logging: Log error with profile ID

### UI Error States

1. **Permission Load Failure**: Cannot fetch user permissions
   - Display: Error message with retry button
   - Fallback: Show read-only view

2. **Profile Update Failure**: Cannot save permission changes
   - Display: Toast error with specific message
   - Action: Keep form state, allow retry

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Permission Metadata Tests**
   - Verify SCREEN_METADATA contains all expected screens
   - Verify each screen has required fields (key, label, displayLabel, description, category)
   - Verify employee-profile screens have appropriate displayLabel text

2. **Permission Function Tests**
   - Test `hasPermission()` with various user/screen/action combinations
   - Test `canAccessEmployee()` with different role and permission profile scenarios
   - Test `canAccessEmployeeList()` returns correct boolean

3. **UI Component Tests**
   - Test PermissionEditor renders explanatory banner
   - Test PermissionEditor groups screens by category
   - Test tooltips display on hover

### Property-Based Tests

Property-based tests verify universal properties across many generated inputs. Each test should run a minimum of 100 iterations.

**Testing Framework**: Use `fast-check` for TypeScript property-based testing.

1. **Property Test: Permission Profile Grants Access**
   - Generate random users with various permission profiles
   - Verify that users with "employees" or "employee-*" permissions can access employee list
   - Tag: **Feature: permission-profile-ux-clarity, Property 1: Permission Profile Grants Employee List Access**

2. **Property Test: Screen Metadata Validity**
   - Verify all SCREEN_METADATA keys are unique
   - Verify all keys are in canonical screen list
   - Tag: **Feature: permission-profile-ux-clarity, Property 4: Screen Metadata Uniqueness and Validity**

3. **Property Test: Employee Profile Labels**
   - For all employee-profile screens, verify displayLabel indicates "others" access
   - Tag: **Feature: permission-profile-ux-clarity, Property 3: Employee Profile Screen Labels Indicate Others Access**

4. **Property Test: canAccessEmployee Consistency**
   - Generate random users with permission profiles
   - Verify canAccessEmployee returns true when user has relevant permissions
   - Tag: **Feature: permission-profile-ux-clarity, Property 7: canAccessEmployee Respects Permission Profiles**

### Integration Tests

1. **API Integration Tests**
   - Test `/api/employees` returns all employees when user has permission via profile
   - Test `/api/employees/[id]/documents` allows access when user has employee-documents permission
   - Test permission changes are reflected immediately in API responses

2. **End-to-End Tests**
   - Test employee with custom permissions can navigate to other employees' profiles
   - Test permission grid displays correct labels and tooltips
   - Test explanatory banner is visible in permission editor

## Implementation Notes

### Files to Modify

1. **`app/lib/permissions.ts`**
   - Add `SCREEN_METADATA` constant with display labels and descriptions
   - Add `canAccessEmployeeList()` function
   - Update `canAccessEmployee()` to check permission profiles more thoroughly

2. **`app/api/employees/route.ts`**
   - Import and use `hasPermission()` and `canAccessEmployeeList()`
   - Remove hardcoded role checks, use permission-based checks
   - Fetch user's permission profile before building where clause

3. **`app/(withSidebar)/employees/page.tsx`**
   - Update server-side data fetching to use permission checks
   - Pass `canAccess` flag for each employee to client component

4. **`app/(withSidebar)/employees/EmployeesClient.tsx`**
   - Update column rendering to use `canAccess` flag
   - Remove hardcoded role checks for greying out employees

5. **`app/components/employees/PermissionEditor.tsx`**
   - Add explanatory banner at top
   - Group screens by category with section headers
   - Use `displayLabel` instead of `label` for screen names
   - Add tooltips with `description` text

6. **`app/components/employees/PermissionProfileManagement.tsx`**
   - Add info tooltip explaining self vs others access

7. **`app/api/permissions/screens/route.ts`**
   - Return full `SCREEN_METADATA` instead of just key/label pairs

### Migration Considerations

- No database migrations required
- Existing permission profiles will continue to work
- UI changes are additive (new labels, tooltips, banners)
- API changes are backward compatible (more permissive, not less)

### Performance Considerations

- Permission profile is already loaded with user session
- No additional database queries for permission checks
- Screen metadata is a static constant, no runtime cost
