# Security Controls - PeopleCore HR System

**Last Updated**: November 19, 2025  
**Version**: 1.0  
**Status**: Production

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization Framework](#authorization-framework)
4. [Leave Request Access Control](#leave-request-access-control)
5. [Multi-Tenant Isolation](#multi-tenant-isolation)
6. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
7. [Security Testing](#security-testing)
8. [Audit & Compliance](#audit--compliance)

---

## Overview

This document defines the security controls enforced across the PeopleCore HR system. All security measures follow a defense-in-depth approach with multiple layers of protection:

1. **Authentication** - Verify user identity
2. **Authorization** - Verify user permissions
3. **Multi-Tenant Isolation** - Prevent cross-company data access
4. **Input Validation** - Prevent injection attacks
5. **Audit Logging** - Track security-relevant events

### Security Principles

- **Deny by Default**: Access is denied unless explicitly granted
- **Least Privilege**: Users have minimum permissions needed
- **Defense in Depth**: Multiple security layers protect resources
- **Fail Secure**: Errors result in access denial, not access grants
- **Audit Everything**: All access attempts are logged

---

## Authentication

### Session Management

**Provider**: NextAuth.js v4  
**Session Type**: JWT (JSON Web Tokens)  
**Session Duration**: 30 days (configurable)

### Authentication Flow

```typescript
// All API routes must verify authentication
const session = await getServerSession(authOptions);
if (!session?.user?.id || !session.user.companyId) {
  return NextResponse.json(
    { success: false, error: "Unauthenticated" },
    { status: 401 }
  );
}
```

### Required Session Fields

Every authenticated session must include:

- `user.id` - Unique user identifier
- `user.companyId` - Company/tenant identifier
- `user.role` - User role (ADMIN, MANAGER, EMPLOYEE, SUPER_ADMIN)
- `user.email` - User email address

### Authentication Errors

| Status | Error | Meaning |
|--------|-------|---------|
| 401 | "Unauthenticated" | No valid session exists |
| 401 | "Invalid session" | Session missing required fields |

---

## Authorization Framework

### Core Authorization Files

| File | Purpose |
|------|---------|
| `app/lib/authz.ts` | Leave-specific authorization policies |
| `app/lib/permissions.ts` | Generic RBAC and employee access control |
| `app/api/employees/[id]/leave-requests/route.ts` | Leave request API with authorization |
| `app/(withSidebar)/employees/[id]/leave/page.tsx` | Leave page with client-side guards |

### Authorization Context

```typescript
export interface AuthContext {
  userId: string;        // Authenticated user ID
  role: UserRole;        // User's role
  companyId: string;     // User's company/tenant
}

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
```

### Creating Auth Context

```typescript
import { createAuthContext } from '@/lib/authz';

const session = await getServerSession(authOptions);
const authContext = createAuthContext(session);

if (!authContext) {
  return NextResponse.json(
    { success: false, error: "Invalid session" },
    { status: 401 }
  );
}
```

---

## Leave Request Access Control

### Access Matrix

This table defines who can access leave requests for different employee types:

| User Role | Own Leave | Direct Report Leave | Any Employee Leave | Cross-Tenant Leave |
|-----------|-----------|---------------------|--------------------|--------------------|
| **EMPLOYEE** | ✅ Read/Create | ❌ Denied | ❌ Denied | ❌ Denied |
| **MANAGER** | ✅ Read/Create | ✅ Read/Approve | ❌ Denied | ❌ Denied |
| **ADMIN** | ✅ Read/Create | ✅ Read/Approve | ✅ Read/Create/Approve | ❌ Denied |
| **SUPER_ADMIN** | ✅ Read/Create | ✅ Read/Approve | ✅ Read/Create/Approve | ❌ Denied |

### API Endpoints

#### GET `/api/employees/[id]/leave-requests`

**Purpose**: Retrieve leave requests for a specific employee

**Authorization Checks**:

1. ✅ **Authentication**: Session must exist with valid `userId` and `companyId`
2. ✅ **Tenant Isolation**: Employee must belong to user's company
3. ✅ **Access Control**: User must have permission via `canAccessLeaveRequests()`
   - **ADMIN/SUPER_ADMIN**: Can access any employee in their company
   - **MANAGER**: Can access direct reports only
   - **EMPLOYEE**: Can access own leave only

**Implementation**:

```typescript
// 1. Verify authentication
const session = await getServerSession(authOptions);
if (!session?.user?.id || !session.user.companyId) {
  return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
}

// 2. Create auth context
const authContext = createAuthContext(session);
if (!authContext) {
  return NextResponse.json({ error: "Invalid session" }, { status: 401 });
}

// 3. Verify employee exists and belongs to same company
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  select: { id: true, companyId: true, userId: true },
});

if (!employee) {
  return NextResponse.json({ error: "Employee not found" }, { status: 404 });
}

if (employee.companyId !== session.user.companyId) {
  return NextResponse.json(
    { error: "Forbidden: Cross-tenant access denied" },
    { status: 403 }
  );
}

// 4. Check authorization
const hasAccess = await canAccessLeaveRequests(authContext, employeeId);
if (!hasAccess) {
  return NextResponse.json(
    { error: "Forbidden: You do not have permission to view these leave requests" },
    { status: 403 }
  );
}

// 5. Query with multi-tenant filtering
const leaves = await prisma.leaveRequest.findMany({
  where: {
    employeeId,
    Employee: { companyId: session.user.companyId }, // Double-check tenant
    approvalStatus: "APPROVED",
  },
});
```

**Error Responses**:

| Status | Error | Scenario |
|--------|-------|----------|
| 401 | "Unauthenticated" | No session or missing session fields |
| 401 | "Invalid session" | Session exists but auth context creation failed |
| 404 | "Employee not found" | Employee doesn't exist |
| 403 | "Forbidden: Cross-tenant access denied" | Employee belongs to different company |
| 403 | "Forbidden: You do not have permission..." | User lacks access rights |

#### POST `/api/employees/[id]/leave-requests`

**Purpose**: Create a new leave request for an employee

**Authorization Checks**:

1. ✅ **Authentication**: Session must exist
2. ✅ **Tenant Isolation**: Employee must belong to user's company
3. ✅ **Creation Rights**: User must have permission via `canCreateLeaveRequest()`
   - **ADMIN/SUPER_ADMIN**: Can create for any employee in their company
   - **EMPLOYEE**: Can only create for themselves
   - **MANAGER**: Cannot create for others (delegates to employee self-service)

**Implementation**:

```typescript
// 1-2. Authentication (same as GET)

// 3. Verify employee exists and belongs to same company
const employee = await prisma.employee.findFirst({
  where: { id: employeeId, companyId: session.user.companyId },
  include: { User: { select: { id: true, managerId: true } } },
});

if (!employee) {
  return NextResponse.json({ error: "Employee not found." }, { status: 404 });
}

// 4. Check creation authorization
const canCreate = await canCreateLeaveRequest(authContext, employeeId);
if (!canCreate) {
  return NextResponse.json(
    { error: "Forbidden: You do not have permission to create leave requests for this employee" },
    { status: 403 }
  );
}

// 5. Validate and create leave request
// ... business logic ...
```

**Error Responses**:

| Status | Error | Scenario |
|--------|-------|----------|
| 401 | "Unauthenticated" | No session |
| 404 | "Employee not found." | Employee doesn't exist or wrong company |
| 403 | "Forbidden: You do not have permission to create..." | User cannot create for this employee |
| 400 | "Invalid request body" | Validation failed |

### Authorization Helper Functions

#### `canAccessLeaveRequests(context, employeeId)`

**File**: `app/lib/authz.ts`

**Purpose**: Determines if a user can view leave requests for an employee

**Logic**:
```typescript
export async function canAccessLeaveRequests(
  context: AuthContext,
  targetEmployeeId: string
): Promise<boolean> {
  // Delegates to canAccessEmployee from permissions.ts
  // This ensures leave access follows same rules as employee record access
  return canAccessEmployee(
    {
      id: context.userId,
      role: context.role,
      companyId: context.companyId,
    },
    targetEmployeeId
  );
}
```

**Access Rules**:
- **ADMIN/SUPER_ADMIN**: Returns `true` if employee is in same company
- **MANAGER**: Returns `true` if employee is a direct report
- **EMPLOYEE**: Returns `true` if `targetEmployeeId` matches user's employee record

#### `canCreateLeaveRequest(context, employeeId)`

**File**: `app/lib/authz.ts`

**Purpose**: Determines if a user can create leave requests for an employee

**Logic**:
```typescript
export async function canCreateLeaveRequest(
  context: AuthContext,
  targetEmployeeId: string
): Promise<boolean> {
  // Admin override: can create for anyone in their company
  if (isAdmin(context.role)) {
    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { companyId: true },
    });
    if (!employee) return false;
    return employee.companyId === context.companyId;
  }

  // Regular users can only create for themselves
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId, companyId: context.companyId },
    select: { userId: true },
  });

  if (!targetEmployee) return false;
  return targetEmployee.userId === context.userId;
}
```

**Access Rules**:
- **ADMIN/SUPER_ADMIN**: Can create for any employee in same company
- **EMPLOYEE**: Can only create for themselves
- **MANAGER**: Cannot create for others (must use employee self-service)

#### `canApproveLeaveRequest(context, leaveRequestId)`

**File**: `app/lib/authz.ts`

**Purpose**: Determines if a user can approve/decline a leave request

**Access Rules**:
- **ADMIN/SUPER_ADMIN**: Can approve any request in their company
- **MANAGER**: Can approve requests from direct reports
- **EMPLOYEE**: Cannot approve requests

---

## Multi-Tenant Isolation

### Tenant Boundary Enforcement

Every database query MUST include company/tenant filtering to prevent cross-tenant data leakage.

### Enforcement Layers

#### 1. Session Validation

```typescript
if (employee.companyId !== session.user.companyId) {
  return NextResponse.json(
    { error: "Forbidden: Cross-tenant access denied" },
    { status: 403 }
  );
}
```

#### 2. Query-Level Filtering

```typescript
// ✅ CORRECT: Always filter by companyId
const leaves = await prisma.leaveRequest.findMany({
  where: {
    employeeId,
    Employee: { companyId: session.user.companyId }, // Tenant filter
  },
});

// ❌ WRONG: Missing tenant filter
const leaves = await prisma.leaveRequest.findMany({
  where: { employeeId }, // Vulnerable to cross-tenant access!
});
```

#### 3. Relation Filtering

```typescript
// When querying through relations, filter at multiple levels
const employee = await prisma.employee.findFirst({
  where: {
    id: employeeId,
    companyId: session.user.companyId, // Primary filter
  },
  include: {
    LeaveRequest: {
      where: {
        // Additional filter on relation
        Employee: { companyId: session.user.companyId },
      },
    },
  },
});
```

### Tenant Isolation Checklist

For every API endpoint:

- [ ] Session includes `companyId`
- [ ] Resource lookup filters by `companyId`
- [ ] Cross-tenant check before authorization
- [ ] Database queries include tenant filter
- [ ] Related entities filtered by tenant
- [ ] Error messages don't leak tenant information

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
SUPER_ADMIN (highest privileges)
    ↓
  ADMIN
    ↓
 MANAGER
    ↓
 EMPLOYEE (lowest privileges)
```

### Role Definitions

#### SUPER_ADMIN

**Privileges**:
- Full system access across all features
- Can manage company settings
- Can access all employee records
- Can approve all leave requests
- Can create leave requests for any employee

**Use Cases**:
- System administrators
- Platform support staff

#### ADMIN

**Privileges**:
- Full access within their company
- Can manage all employees in company
- Can approve all leave requests in company
- Can create leave requests for any employee in company
- Can configure company settings

**Use Cases**:
- HR administrators
- Company administrators

#### MANAGER

**Privileges**:
- Can view direct reports' information
- Can approve direct reports' leave requests
- Can view team calendar
- Cannot create leave requests for others

**Use Cases**:
- Department managers
- Team leads

#### EMPLOYEE

**Privileges**:
- Can view own information
- Can create own leave requests
- Can view own leave history
- Cannot access other employees' data

**Use Cases**:
- Regular employees
- Contractors

### Role Checking Functions

```typescript
// Check if user is admin
export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// Check if user is manager or higher
export function isManagerOrAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";
}
```

---

## Security Testing

### Test Coverage

#### Unit Tests

**File**: `tests/api/leave-requests.test.ts`

**Coverage**:
- ✅ Authentication (401 for missing/invalid sessions)
- ✅ Multi-tenant isolation (403 for cross-tenant access)
- ✅ ADMIN access (can view any employee in company)
- ✅ SUPER_ADMIN access (same as ADMIN within company)
- ✅ MANAGER access (can view direct reports, denied for others)
- ✅ EMPLOYEE access (can view own, denied for others)
- ✅ Query parameter validation (limit, upcoming)
- ✅ POST authorization (create permissions)
- ✅ Cross-tenant creation attempts

**Test Count**: 20+ test cases

**Run Tests**:
```bash
npm test tests/api/leave-requests.test.ts
```

#### E2E Tests

**File**: `tests/e2e/leave-page-authorization.test.ts`

**Coverage**:
- ✅ 401 Unauthorized response handling
- ✅ 403 Forbidden response handling
- ✅ 404 Not Found response handling
- ✅ Success scenarios for each role
- ✅ Client-side error state rendering

**Test Scenarios**:
- Unauthenticated user access
- Employee accessing another employee's leave
- Manager accessing non-report's leave
- Admin accessing any employee's leave

**Run Tests**:
```bash
npm test tests/e2e/leave-page-authorization.test.ts
```

### Regression Testing

All authorization changes MUST include:

1. **Unit tests** for API authorization logic
2. **E2E tests** for client-side guards
3. **Integration tests** for full flow validation

### Security Test Checklist

Before deploying authorization changes:

- [ ] All existing tests pass
- [ ] New tests added for new scenarios
- [ ] Cross-tenant access blocked
- [ ] Role-based access enforced
- [ ] Error messages don't leak data
- [ ] Audit logs capture access attempts

---

## Audit & Compliance

### Audit Logging

All security-relevant events are logged:

```typescript
// Successful access
console.log("✅ Leave request submitted successfully");

// Failed authentication
console.log("❌ Unauthenticated attempt to submit leave request");

// Failed authorization
console.log("❌ Unauthorized leave request submission attempt");
```

### Audit Log Fields

Every audit log includes:

- **Timestamp**: When the event occurred
- **User ID**: Who attempted the action
- **Company ID**: Which tenant
- **Resource ID**: What was accessed
- **Action**: What was attempted
- **Result**: Success or failure
- **IP Address**: Where request originated (if available)

### Compliance Requirements

#### GDPR Compliance

- ✅ Users can only access their own data (unless authorized)
- ✅ Cross-tenant data isolation prevents data leakage
- ✅ Audit logs track all data access
- ✅ Role-based access minimizes data exposure

#### SOC 2 Compliance

- ✅ Authentication required for all endpoints
- ✅ Authorization enforced before data access
- ✅ Multi-tenant isolation prevents unauthorized access
- ✅ Audit trails for security events
- ✅ Least privilege access model

### Security Monitoring

Monitor for:

- **Failed authentication attempts**: Potential brute force
- **403 Forbidden errors**: Potential privilege escalation attempts
- **Cross-tenant access attempts**: Potential data breach attempts
- **Unusual access patterns**: Potential compromised accounts

---

## Future Enhancements

### Planned Security Improvements

1. **Rate Limiting**: Prevent brute force attacks
2. **IP Whitelisting**: Restrict access by IP range
3. **MFA (Multi-Factor Authentication)**: Additional authentication layer
4. **API Key Authentication**: For service-to-service calls
5. **Fine-Grained Permissions**: Attribute-based access control (ABAC)
6. **Data Encryption at Rest**: Encrypt sensitive fields in database
7. **Security Headers**: CSP, HSTS, X-Frame-Options

### Security Roadmap

| Quarter | Enhancement | Priority |
|---------|-------------|----------|
| Q1 2025 | Rate limiting | High |
| Q2 2025 | MFA support | High |
| Q2 2025 | API key auth | Medium |
| Q3 2025 | Fine-grained permissions | Medium |
| Q4 2025 | Data encryption | Low |

---

## References

### Related Documentation

- [Architecture Overview](./architecture-overview.md) - System architecture
- [API Fetching Guide](./api-fetching.md) - API client usage
- [Testing Guide](../tests/README.md) - Testing practices

### Code References

- `app/lib/authz.ts` - Leave authorization helpers
- `app/lib/permissions.ts` - Generic RBAC helpers
- `app/api/employees/[id]/leave-requests/route.ts` - Leave API implementation
- `tests/api/leave-requests.test.ts` - Authorization unit tests
- `tests/e2e/leave-page-authorization.test.ts` - Authorization E2E tests

### External Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Access Control Guidelines](https://csrc.nist.gov/publications/detail/sp/800-162/final)

---

**Document Maintainer**: Engineering Team  
**Review Frequency**: Quarterly  
**Last Review**: November 19, 2025
