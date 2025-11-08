# Security Fix Example: Timesheet Tenant Isolation

This document shows how to fix the tenant isolation vulnerability in the `/api/timesheets/[id]` endpoint.

## Before: Vulnerable Code

```typescript
// app/api/timesheets/[id]/route.ts - VULNERABLE VERSION

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: { select: { role: true } },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // ❌ VULNERABILITY: Fetches by ID only, no companyId filter
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
      include: {
        ClockEntries: { orderBy: { clockInTime: 'asc' } },
        TimesheetEntries: { orderBy: { date: 'asc' } },
        ApprovalStages: {
          include: { Decisions: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // ❌ PROBLEM: Permission check happens AFTER fetch
    // ❌ PROBLEM: No validation that timesheet.companyId === requestingEmployee.companyId
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to view this timesheet' }, { status: 403 });
    }

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: timesheet.employeeId },
      include: {
        User: { select: { name: true, email: true, profileImageUrl: true } },
        Department: { select: { name: true } },
      },
    });

    return NextResponse.json({
      timesheet: {
        ...timesheet,
        employee,
      },
    });
  } catch (error) {
    console.error('Timesheet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet' }, { status: 500 });
  }
}
```

## After: Secure Code

```typescript
// app/api/timesheets/[id]/route.ts - SECURE VERSION

import { validateTimesheetTenant, getRequestingEmployee, TenantValidationError } from '@/lib/tenant-validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // ✅ FIX: Use helper to get employee with validation
    const requestingEmployee = await getRequestingEmployee(session.user.id);

    // ✅ FIX: Validate tenant BEFORE fetching full data
    // This ensures the timesheet belongs to the requesting user's company
    try {
      await validateTimesheetTenant(id, requestingEmployee.companyId);
    } catch (error) {
      if (error instanceof TenantValidationError) {
        // Return 404 instead of 403 to avoid leaking existence of resources
        return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
      }
      throw error;
    }

    // ✅ SAFE: Now we can fetch the full timesheet
    // We know it belongs to the requesting user's company
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: id },
      include: {
        ClockEntries: { orderBy: { clockInTime: 'asc' } },
        TimesheetEntries: { orderBy: { date: 'asc' } },
        ApprovalStages: {
          include: { Decisions: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    // This should never happen since we validated above, but keep for safety
    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // ✅ SECURE: Now check role-based permissions
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to view this timesheet' }, { status: 403 });
    }

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: timesheet.employeeId },
      include: {
        User: { select: { name: true, email: true, profileImageUrl: true } },
        Department: { select: { name: true } },
      },
    });

    return NextResponse.json({
      timesheet: {
        ...timesheet,
        employee,
      },
    });
  } catch (error) {
    console.error('Timesheet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet' }, { status: 500 });
  }
}
```

## Alternative: Inline Validation

If you prefer not to use the helper functions, you can validate inline:

```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: { select: { role: true } },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // ✅ FIX: Use findFirst with companyId filter instead of findUnique
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: id,
        companyId: requestingEmployee.companyId, // ✅ Tenant filter
      },
      include: {
        ClockEntries: { orderBy: { clockInTime: 'asc' } },
        TimesheetEntries: { orderBy: { date: 'asc' } },
        ApprovalStages: {
          include: { Decisions: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Continue with permission checks...
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized to view this timesheet' }, { status: 403 });
    }

    // Rest of the code...
  } catch (error) {
    console.error('Timesheet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet' }, { status: 500 });
  }
}
```

## Key Changes Summary

1. **✅ Tenant Validation First**: Always validate that the resource belongs to the requesting user's company BEFORE fetching full data
2. **✅ Use `findFirst` with `companyId`**: Instead of `findUnique({ where: { id } })`, use `findFirst({ where: { id, companyId } })`
3. **✅ Return 404 for Tenant Violations**: Don't reveal that a resource exists in another tenant (return 404, not 403)
4. **✅ Use Helper Functions**: Centralize validation logic in `lib/tenant-validation.ts` for consistency
5. **✅ Log Violations**: Consider logging suspicious cross-tenant access attempts for security monitoring

## Apply This Pattern To:

- ❌ `/api/timesheets/[id]` - GET, PUT, DELETE
- ❌ `/api/timesheets/[id]/approve` - POST
- ❌ `/api/timesheets/[id]/reject` - POST
- ❌ `/api/timesheets/[id]/submit` - POST
- ❌ `/api/timesheets/[id]/audit` - GET
- ❌ `/api/timesheets/entries/[id]/overtime` - GET, PATCH

## Testing the Fix

After applying the fix, run the security test:

```bash
npm test tests/security/timesheet-tenant-isolation.test.ts
```

The tests should now PASS (fail to access cross-tenant data), proving the vulnerability is fixed.
