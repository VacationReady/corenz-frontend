# Leave Requests Authorization Implementation

## Summary

Implemented comprehensive authorization checks for the `GET /api/employees/[id]/leave-requests` endpoint following the architecture patterns documented in `docs/architecture-overview.md`.

## Key Principle: No Duplication

To maintain consistency and avoid "more of the same":

- **`app/lib/permissions.ts`**: Source of truth for generic RBAC + employee access
- **`app/lib/authz.ts`**: Leave-specific authorization that **delegates** to permissions.ts
- **API Routes**: Use both as needed

## Files Changed/Created

### 1. `app/lib/authz.ts` (NEW)

Leave-specific authorization helpers that build on top of `permissions.ts`:

```typescript
/**
 * Leave Request Authorization Helpers
 * 
 * Leave-specific authorization logic that builds on top of the generic
 * permissions layer (app/lib/permissions.ts).
 * 
 * Separation of concerns:
 * - permissions.ts: Generic RBAC + employee access (source of truth)
 * - authz.ts: Leave-specific policies (can create, approve, etc.)
 * - Routes: Use both as needed
 */

// Delegates to permissions.canAccessEmployee for consistency
export async function canAccessLeaveRequests(
  context: AuthContext,
  targetEmployeeId: string
): Promise<boolean>

// Leave-specific: Who can create leave requests
export async function canCreateLeaveRequest(
  context: AuthContext,
  targetEmployeeId: string
): Promise<boolean>

// Leave-specific: Who can approve/reject leave requests
export async function canApproveLeaveRequest(
  context: AuthContext,
  leaveRequestId: string
): Promise<boolean>

// Utility: Create AuthContext from NextAuth session
export function createAuthContext(session: any): AuthContext | null
```

**Key Design Decision**: `canAccessLeaveRequests` **delegates** to `permissions.canAccessEmployee` instead of reimplementing the logic. This ensures:
- Single source of truth for "who can access which employee"
- No drift between implementations
- Consistent behavior across all endpoints

### 2. `app/api/employees/[id]/leave-requests/route.ts` (UPDATED)

Added comprehensive authorization checks:

#### GET Handler

```typescript
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // 1. ✅ Authentication: Verify session exists
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 2. ✅ Create auth context for authorization checks
  const authContext = createAuthContext(session);
  if (!authContext) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // 3. ✅ Verify employee exists and belongs to same company (tenant isolation)
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

  // 4. ✅ Authorization: Check if user can access this employee's leave requests
  const hasAccess = await canAccessLeaveRequests(authContext, employeeId);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view these leave requests" },
      { status: 403 }
    );
  }

  // 5. ✅ Query leave requests with multi-tenant filtering
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      Employee: { companyId: session.user.companyId }, // ✅ Tenant isolation
      approvalStatus: "APPROVED",
    },
    // ... rest of query
  });

  return NextResponse.json(leaves);
}
```

#### POST Handler

```typescript
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // 1. ✅ Authentication
  const session = await getServerSession(authOptions);
  // ...

  // 2. ✅ Create auth context
  const authContext = createAuthContext(session);
  // ...

  // 3. ✅ Verify employee exists (tenant isolation)
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: session.user.companyId },
    // ...
  });

  // 4. ✅ Authorization: Check if user can create leave request for this employee
  const canCreate = await canCreateLeaveRequest(authContext, employeeId);
  if (!canCreate) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to create leave requests for this employee" },
      { status: 403 }
    );
  }

  // ... rest of creation logic
}
```

### 3. `tests/api/leave-requests.test.ts` (NEW)

Comprehensive test suite covering:

#### Authentication Tests
- ❌ 401 for unauthenticated requests
- ❌ 401 for session without `companyId`
- ❌ 401 for session without `userId`

#### Multi-Tenant Isolation Tests
- ❌ 404 for non-existent employee
- ❌ 403 for cross-tenant access attempts

#### ADMIN Access Tests
- ✅ ADMIN can access any employee's leave requests in their company
- ✅ SUPER_ADMIN can access any employee's leave requests in their company
- ✅ Query includes proper multi-tenant filtering (`Employee.companyId`)

#### MANAGER Access Tests
- ✅ MANAGER can access direct report's leave requests (`managerId` matches)
- ❌ MANAGER cannot access non-direct-report's leave requests

#### EMPLOYEE Access Tests
- ✅ EMPLOYEE can access their own leave requests (self-access)
- ❌ EMPLOYEE cannot access another employee's leave requests

#### Query Parameter Tests
- ✅ Respects `upcoming=true` parameter (adds date filters)
- ✅ Respects `limit` parameter (max 10, default 3)

#### Integration Tests
- ✅ Full flow with authorized access returns filtered results
- ✅ All expected filters present in Prisma query

## Authorization Matrix

| Role         | Self Access | Direct Reports | All Employees (Same Company) | Cross-Tenant |
|--------------|-------------|----------------|------------------------------|--------------|
| EMPLOYEE     | ✅ Yes      | ❌ No          | ❌ No                         | ❌ No        |
| MANAGER      | ✅ Yes      | ✅ Yes         | ❌ No                         | ❌ No        |
| ADMIN        | ✅ Yes      | ✅ Yes         | ✅ Yes                        | ❌ No        |
| SUPER_ADMIN  | ✅ Yes      | ✅ Yes         | ✅ Yes                        | ❌ No        |

## Alignment with Architecture Documentation

### From `docs/architecture-overview.md`

#### Multi-Tenant Isolation (Section 7)
✅ Every query filters by `companyId`
✅ Cross-tenant access blocked with 403
✅ Employee existence verified before authorization check

#### Authorization Patterns (Section 8)

**Role-Based Access Control (RBAC)**:
```typescript
if (!isManagerOrAdmin(session.user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Resource-Based Access Control**:
```typescript
const employee = await prisma.employee.findUnique({
  where: { userId: session.user.id },
});

const canView =
  isManagerOrAdmin(session.user.role) ||
  (employee && employee.userId === session.user.id);
```

#### Session Propagation (Section 6)

**Server-Side**:
```typescript
const session = await getServerSession(authOptions);
// session.user.id, session.user.role, session.user.companyId available
```

**Authorization Helper**:
```typescript
const authContext = createAuthContext(session);
const hasAccess = await canAccessLeaveRequests(authContext, targetEmployeeId);
```

## Running Tests

```bash
# Run all API tests
npm test tests/api/leave-requests.test.ts

# Run with watch mode
npm test -- --watch tests/api/leave-requests.test.ts
```

Expected output:
```
✔ Leave Requests API - Authentication & Authorization
  ✔ GET: returns 401 for unauthenticated requests
  ✔ GET: returns 401 for session without companyId
  ✔ GET: returns 404 for non-existent employee
  ✔ GET: returns 403 for cross-tenant access attempt
  ✔ GET: ADMIN can access any employee's leave requests in their company
  ✔ GET: SUPER_ADMIN can access any employee's leave requests in their company
  ✔ GET: MANAGER can access direct report's leave requests
  ✔ GET: MANAGER cannot access non-direct-report's leave requests
  ✔ GET: EMPLOYEE can access their own leave requests
  ✔ GET: EMPLOYEE cannot access another employee's leave requests
  ✔ GET: respects 'upcoming' query parameter
  ✔ GET: respects 'limit' query parameter
  ✔ GET: limits 'limit' parameter to maximum of 10
  ✔ GET: full flow with authorized access returns filtered results
```

## Design Principles Followed

### 1. **No Duplication**
- `canAccessLeaveRequests` delegates to `permissions.canAccessEmployee`
- Single source of truth for employee access logic
- Avoids "more of the same" code proliferation

### 2. **Layered Authorization**
```
middleware.ts → Authentication + Tenant Detection
    ↓
permissions.ts → Generic RBAC + Employee Access (source of truth)
    ↓
authz.ts → Leave-Specific Policies (delegates to permissions.ts)
    ↓
API Routes → Use both as needed
```

### 3. **Clear Separation of Concerns**
- **Authentication**: "Is the user logged in?" (middleware, session)
- **Multi-Tenant Isolation**: "Does this resource belong to their company?"
- **Authorization**: "Can this user access this specific resource?" (permissions + authz)

### 4. **Test-Driven Validation**
- Tests verify behavior, not implementation
- Mock at the Prisma layer to test authorization logic in isolation
- Cover all roles, access patterns, and edge cases

## Next Steps

To apply this pattern to other endpoints:

1. **Reuse existing helpers** from `permissions.ts` when possible
2. **Create resource-specific helpers** in `authz.ts` only for new authorization logic
3. **Always delegate** to existing helpers to avoid duplication
4. **Write tests first** to document expected behavior
5. **Follow the architecture patterns** from `docs/architecture-overview.md`

### Example: Applying to Documents Endpoint

```typescript
// In authz.ts
export async function canAccessDocument(
  context: AuthContext,
  documentId: string
): Promise<boolean> {
  // First check if they can access the employee
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { employeeId: true },
  });
  
  if (!document?.employeeId) return false;
  
  // Delegate to the canonical employee access check
  return canAccessEmployee(
    {
      id: context.userId,
      role: context.role,
      companyId: context.companyId,
    },
    document.employeeId
  );
}
```

## Key Takeaways

1. ✅ **Authorization checks implemented** following architecture patterns
2. ✅ **No duplication** - delegates to existing `permissions.ts`
3. ✅ **Multi-tenant isolation** enforced at every layer
4. ✅ **Comprehensive tests** covering all roles and scenarios
5. ✅ **Documentation aligned** with `docs/architecture-overview.md`
6. ✅ **Reusable pattern** for other endpoints

This implementation serves as a template for adding authorization to other API routes while maintaining consistency and avoiding code duplication across the codebase.
