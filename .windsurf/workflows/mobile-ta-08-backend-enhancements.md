---
description: Mobile T&A Phase 8 - Backend API Enhancements for Mobile Support
---

# Phase 8: Backend API Enhancements

## Objective

Create or enhance backend API endpoints needed for full mobile T&A functionality:
1. Timesheet entries endpoint
2. Entry notes update endpoint
3. Timesheet submission endpoint
4. Mobile-optimized shifts endpoint
5. Eligible swap targets endpoint

## Prerequisites

- Complete Phase 1-7 (mobile components)
- Review existing backend API patterns
- Understand Prisma schema for Timesheet, TimesheetEntry, Shift models

## Files to Create/Modify

### 1. `app/api/timesheets/[id]/entries/route.ts`

Create endpoint to get timesheet with all entries:

```typescript
// app/api/timesheets/[id]/entries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timesheetId = params.id;

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Fetch timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        TimesheetEntries: {
          orderBy: { date: 'asc' },
        },
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Verify access - must be own timesheet or admin/manager
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnTimesheet = timesheet.employeeId === requestingEmployee.id;

    if (!isOwnTimesheet && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify company match
    if (timesheet.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      timesheet: {
        id: timesheet.id,
        employeeId: timesheet.employeeId,
        companyId: timesheet.companyId,
        periodStart: timesheet.periodStart,
        periodEnd: timesheet.periodEnd,
        totalHours: timesheet.totalHours,
        regularHours: timesheet.regularHours,
        overtimeHours: timesheet.overtimeHours,
        approvalStatus: timesheet.approvalStatus,
        submittedAt: timesheet.submittedAt,
        approvedAt: timesheet.approvedAt,
        notes: timesheet.notes,
        employee: timesheet.Employee,
      },
      entries: timesheet.TimesheetEntries,
    });
  } catch (error) {
    console.error('Timesheet entries fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheet entries' }, { status: 500 });
  }
}
```

### 2. `app/api/timesheets/entries/[id]/notes/route.ts`

Create endpoint to update entry notes:

```typescript
// app/api/timesheets/entries/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateNotesSchema = z.object({
  notes: z.string().max(1000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entryId = params.id;
    const body = await req.json();
    const data = updateNotesSchema.parse(body);

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Fetch entry with timesheet
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: {
        Timesheet: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Verify access - must be own entry or admin/manager
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    const isOwnEntry = entry.Timesheet.employeeId === requestingEmployee.id;

    if (!isOwnEntry && !isAdminOrManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify company match
    if (entry.Timesheet.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if timesheet is already approved (can't edit approved timesheets)
    if (entry.Timesheet.approvalStatus === 'APPROVED' && !isAdminOrManager) {
      return NextResponse.json(
        { error: 'Cannot edit entries on approved timesheets' },
        { status: 400 }
      );
    }

    // Update notes
    const updatedEntry = await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: {
        notes: data.notes.trim() || null,
      },
    });

    // Log the update
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        companyId: requestingEmployee.companyId,
        actorId: session.user.id,
        action: 'UPDATED',
        entityType: 'TIMESHEET_ENTRY',
        entityId: entryId,
        metadata: {
          type: 'ENTRY_NOTES_UPDATED',
          timesheetId: entry.timesheetId,
          previousNotes: entry.notes,
          newNotes: data.notes.trim(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    });
  } catch (error) {
    console.error('Entry notes update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update entry notes' }, { status: 500 });
  }
}
```

### 3. `app/api/timesheets/[id]/submit/route.ts`

Create endpoint to submit timesheet for approval:

```typescript
// app/api/timesheets/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { createTimesheetApprovalActionItem } from '@/app/lib/action-items-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timesheetId = params.id;

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        managerId: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Fetch timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        TimesheetEntries: true,
      },
    });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Verify ownership
    if (timesheet.employeeId !== requestingEmployee.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify company match
    if (timesheet.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already submitted or approved
    if (['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'].includes(timesheet.approvalStatus)) {
      return NextResponse.json(
        { error: 'Timesheet has already been submitted' },
        { status: 400 }
      );
    }

    // Check if there are any entries
    if (timesheet.TimesheetEntries.length === 0) {
      return NextResponse.json(
        { error: 'Cannot submit timesheet with no entries' },
        { status: 400 }
      );
    }

    // Update timesheet status
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        approvalStatus: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Create approval action item for manager
    if (requestingEmployee.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: requestingEmployee.managerId },
        select: { userId: true },
      });

      if (manager?.userId) {
        try {
          await createTimesheetApprovalActionItem(
            requestingEmployee.companyId,
            manager.userId,
            timesheetId,
            requestingEmployee.id,
            `${requestingEmployee.User.firstName || ''} ${requestingEmployee.User.lastName || ''}`.trim() || requestingEmployee.User.email,
            timesheet.periodStart,
            timesheet.periodEnd,
            timesheet.totalHours || 0
          );
        } catch (actionItemError) {
          console.error('Failed to create approval action item:', actionItemError);
          // Don't fail the submission if action item creation fails
        }
      }
    }

    // Log the submission
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        companyId: requestingEmployee.companyId,
        actorId: session.user.id,
        action: 'UPDATED',
        entityType: 'TIMESHEET',
        entityId: timesheetId,
        metadata: {
          type: 'TIMESHEET_SUBMITTED',
          previousStatus: timesheet.approvalStatus,
          newStatus: 'SUBMITTED',
          totalHours: timesheet.totalHours,
          entryCount: timesheet.TimesheetEntries.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet,
      message: 'Timesheet submitted for approval',
    });
  } catch (error) {
    console.error('Timesheet submission error:', error);
    return NextResponse.json({ error: 'Failed to submit timesheet' }, { status: 500 });
  }
}
```

### 4. `app/api/mobile/my-shifts/route.ts`

Create mobile-optimized shifts endpoint:

```typescript
// app/api/mobile/my-shifts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isToday, isTomorrow } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'week'; // 'today', 'week', 'custom'

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Determine date range
    let queryStartDate: Date;
    let queryEndDate: Date;

    if (view === 'today') {
      queryStartDate = startOfDay(new Date());
      queryEndDate = endOfDay(new Date());
    } else if (startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryEndDate = new Date(endDate);
    } else {
      // Default to current week
      queryStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      queryEndDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    // Fetch shifts
    const shifts = await prisma.shift.findMany({
      where: {
        employeeId: employee.id,
        companyId: employee.companyId,
        startTime: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      include: {
        Template: {
          select: {
            name: true,
            color: true,
          },
        },
        Location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Get department info
    const employeeWithDept = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Format shifts for mobile
    const formattedShifts = shifts.map((shift) => ({
      id: shift.id,
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      breakDuration: shift.breakDuration,
      notes: shift.notes,
      role: shift.role,
      attendanceStatus: shift.attendanceStatus,
      isPublished: shift.isPublished,
      isToday: isToday(shift.startTime),
      isTomorrow: isTomorrow(shift.startTime),
      department: employeeWithDept?.Department || null,
      location: shift.Location,
      template: shift.Template,
    }));

    // Calculate summary
    const totalShifts = formattedShifts.length;
    const todayShift = formattedShifts.find((s) => s.isToday);
    const tomorrowShift = formattedShifts.find((s) => s.isTomorrow);
    const totalHours = shifts.reduce((acc, shift) => {
      const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      return acc + hours - (shift.breakDuration || 0) / 60;
    }, 0);

    return NextResponse.json({
      shifts: formattedShifts,
      summary: {
        totalShifts,
        totalHours: Math.round(totalHours * 10) / 10,
        hasToday: !!todayShift,
        hasTomorrow: !!tomorrowShift,
      },
      todayShift,
      tomorrowShift,
    });
  } catch (error) {
    console.error('Mobile shifts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}
```

### 5. `app/api/shift-swaps/eligible/route.ts`

Create endpoint to get eligible swap targets:

```typescript
// app/api/shift-swaps/eligible/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get('shiftId');

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 });
    }

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get the shift
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        employeeId: true,
        companyId: true,
        departmentId: true,
        startTime: true,
        endTime: true,
        requiredSkills: true,
      },
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify ownership
    if (shift.employeeId !== requestingEmployee.id) {
      return NextResponse.json({ error: 'You can only swap your own shifts' }, { status: 403 });
    }

    // Verify company match
    if (shift.companyId !== requestingEmployee.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find eligible employees
    // Criteria:
    // 1. Same company
    // 2. Same department (if shift has department)
    // 3. Not the requesting employee
    // 4. Active employee
    // 5. No conflicting shift at the same time

    const whereClause: any = {
      companyId: requestingEmployee.companyId,
      id: { not: requestingEmployee.id },
      status: 'ACTIVE',
    };

    // Optionally filter by department
    if (shift.departmentId) {
      whereClause.departmentId = shift.departmentId;
    }

    const potentialEmployees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Filter out employees with conflicting shifts
    const eligibleEmployees = [];

    for (const emp of potentialEmployees) {
      const conflictingShift = await prisma.shift.findFirst({
        where: {
          employeeId: emp.id,
          OR: [
            {
              // Shift starts during the target shift
              startTime: {
                gte: shift.startTime,
                lt: shift.endTime,
              },
            },
            {
              // Shift ends during the target shift
              endTime: {
                gt: shift.startTime,
                lte: shift.endTime,
              },
            },
            {
              // Shift completely contains the target shift
              AND: [
                { startTime: { lte: shift.startTime } },
                { endTime: { gte: shift.endTime } },
              ],
            },
          ],
        },
      });

      if (!conflictingShift) {
        eligibleEmployees.push({
          id: emp.id,
          firstName: emp.User.firstName,
          lastName: emp.User.lastName,
          email: emp.User.email,
          profileImageUrl: emp.User.profileImageUrl,
          department: emp.Department?.name || null,
        });
      }
    }

    return NextResponse.json({
      employees: eligibleEmployees,
      total: eligibleEmployees.length,
    });
  } catch (error) {
    console.error('Eligible swap targets fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch eligible employees' }, { status: 500 });
  }
}
```

### 6. Update `app/api/time-tracking/employee-manual-entry/route.ts`

Add mobile session support to existing endpoint:

```typescript
// At the top of the file, add:
import { getMobileSession } from '@/lib/mobile-session';

// Replace the session check with:
export async function POST(req: NextRequest) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // ... rest of the function remains the same
```

### 7. Update `app/api/shifts/route.ts`

Add mobile session support:

```typescript
// At the top of the file, add:
import { getMobileSession } from '@/lib/mobile-session';

// In the getHandler function, replace session check:
async function getHandler(req: NextRequest) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // ... rest of the function remains the same
```

## Helper Function for Action Items

Ensure this helper exists in `app/lib/action-items-helper.ts`:

```typescript
// Add to app/lib/action-items-helper.ts if not present

export async function createTimesheetApprovalActionItem(
  companyId: string,
  assignedToId: string,
  timesheetId: string,
  employeeId: string,
  employeeName: string,
  periodStart: Date,
  periodEnd: Date,
  totalHours: number
) {
  const { prisma } = await import('@/lib/prisma');
  const { format } = await import('date-fns');

  const periodLabel = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;

  return prisma.actionItem.create({
    data: {
      companyId,
      assignedToId,
      relatedEmployeeId: employeeId,
      type: 'TIMESHEET_APPROVAL',
      title: `Review Timesheet: ${employeeName}`,
      description: `Timesheet for ${periodLabel} requires your approval`,
      priority: 'MEDIUM',
      status: 'PENDING',
      metadata: {
        timesheetId,
        employeeId,
        employeeName,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        totalHours,
        label: periodLabel,
      },
    },
  });
}
```

## Verification Steps

1. **Timesheet Entries Endpoint**
   ```bash
   curl -X GET "http://localhost:3000/api/timesheets/{id}/entries" \
     -H "Authorization: Bearer {token}"
   ```
   - Returns timesheet with all entries
   - Respects ownership/permission checks

2. **Entry Notes Update**
   ```bash
   curl -X PATCH "http://localhost:3000/api/timesheets/entries/{id}/notes" \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"notes": "Test note"}'
   ```
   - Updates notes successfully
   - Creates audit log entry

3. **Timesheet Submit**
   ```bash
   curl -X POST "http://localhost:3000/api/timesheets/{id}/submit" \
     -H "Authorization: Bearer {token}"
   ```
   - Changes status to SUBMITTED
   - Creates action item for manager

4. **Mobile Shifts**
   ```bash
   curl -X GET "http://localhost:3000/api/mobile/my-shifts?view=week" \
     -H "Authorization: Bearer {token}"
   ```
   - Returns formatted shifts
   - Includes today/tomorrow flags
   - Includes summary stats

5. **Eligible Swap Targets**
   ```bash
   curl -X GET "http://localhost:3000/api/shift-swaps/eligible?shiftId={id}" \
     -H "Authorization: Bearer {token}"
   ```
   - Returns employees without conflicts
   - Filters by department if applicable

## Database Considerations

Ensure these indexes exist for performance:

```sql
-- Add if not present
CREATE INDEX IF NOT EXISTS "TimesheetEntry_timesheetId_idx" ON "TimesheetEntry"("timesheetId");
CREATE INDEX IF NOT EXISTS "TimesheetEntry_date_idx" ON "TimesheetEntry"("date");
CREATE INDEX IF NOT EXISTS "Shift_employeeId_startTime_idx" ON "Shift"("employeeId", "startTime");
CREATE INDEX IF NOT EXISTS "Timesheet_employeeId_periodStart_idx" ON "Timesheet"("employeeId", "periodStart");
```

## Security Checklist

- [ ] All endpoints verify session (web or mobile)
- [ ] All endpoints verify company match
- [ ] All endpoints verify ownership or admin/manager role
- [ ] Audit logs created for sensitive operations
- [ ] Input validation with Zod schemas
- [ ] Error messages don't leak sensitive info

## Completion

After implementing all backend enhancements:

1. Run type check: `npx tsc --noEmit`
2. Run tests: `npm test`
3. Test each endpoint manually
4. Verify mobile app can call all endpoints
5. Check audit logs are created correctly

## Summary

This completes the Mobile T&A implementation. The full system now includes:

- ✅ Dashboard tiles for shifts and clock-in
- ✅ Enhanced clock screen with manual entry
- ✅ Full shifts/schedule screen
- ✅ Shift swap functionality
- ✅ Timesheet review and submission
- ✅ Admin reconciliation
- ✅ All necessary backend APIs

The system is designed for:
- **Offline-first** operation for clock actions
- **Bidirectional sync** with conflict resolution
- **Role-based access** (employee vs admin/manager)
- **Audit logging** for compliance
- **Tenant isolation** for multi-company support
