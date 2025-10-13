# Time Tracking Integration - Implementation Guide

**Priority Level:** CRITICAL  
**Estimated Time:** 2-3 weeks  
**Developer:** Follow step-by-step

---

## 🔴 PHASE 1: CRITICAL FIXES (Week 1)

### **Fix 1: Leave Conflict Detection** ⚠️ CRITICAL BUG

**Problem:** Employees can be scheduled during approved leave

**Files to Modify:**
1. `lib/conflict-detector.ts`
2. `app/api/shifts/conflicts/route.ts`

**Step 1:** Update conflict detector function signature

```typescript
// lib/conflict-detector.ts - Line 37
export function detectScheduleConflicts(
  shifts: Shift[],
  availabilityPatterns: Map<string, AvailabilityPattern[]>,
  availabilityExceptions: Map<string, AvailabilityException[]>,
  employeeSkills: Map<string, string[]>,
  leaveRequests: Map<string, LeaveRequest[]>, // ADD THIS PARAMETER
  settings: {
    minimumRestHours: number;
    maxHoursPerWeek: number;
  }
): Conflict[] {
```

**Step 2:** Add leave conflict type

```typescript
// lib/conflict-detector.ts - Line 26
export interface Conflict {
  type: 'DOUBLE_BOOKING' | 'REST_PERIOD' | 'OVERTIME' | 'UNAVAILABLE' | 'SKILL_MISMATCH' | 'LEAVE_CONFLICT'; // ADD LEAVE_CONFLICT
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  shift1Id?: string;
  shift2Id?: string;
  employeeId: string;
  leaveRequestId?: string; // ADD THIS
}
```

**Step 3:** Add leave conflict detection logic

```typescript
// lib/conflict-detector.ts - After line 166, add:

  // Check leave request conflicts
  for (const [employeeId, employeeShifts] of shiftsByEmployee) {
    const employeeLeave = leaveRequests.get(employeeId) || [];
    
    for (const shift of employeeShifts) {
      for (const leave of employeeLeave) {
        // Only check approved leave
        if (leave.approvalStatus !== 'APPROVED') continue;
        
        // Check if shift falls within leave period
        const shiftDate = new Date(shift.startTime);
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        
        if (shiftDate >= leaveStart && shiftDate <= leaveEnd) {
          conflicts.push({
            type: 'LEAVE_CONFLICT',
            severity: 'CRITICAL',
            description: `Employee has approved ${leave.eventCategoryName || 'leave'} from ${format(leaveStart, 'MMM d')} to ${format(leaveEnd, 'MMM d')}`,
            shift1Id: shift.id,
            employeeId,
            leaveRequestId: leave.id,
          });
        }
      }
    }
  }

  return conflicts;
}
```

**Step 4:** Update API endpoint to fetch leave requests

```typescript
// app/api/shifts/conflicts/route.ts - After line 152, add:

    // Fetch approved leave requests for the date range
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        approvalStatus: 'APPROVED',
        startDate: { lte: parseISO(endDate) },
        endDate: { gte: parseISO(startDate) },
      },
      include: {
        EventCategory: {
          select: {
            name: true,
          },
        },
      },
    });

    const leaveByEmployee = new Map<string, any[]>();
    for (const leave of leaveRequests) {
      if (!leaveByEmployee.has(leave.employeeId)) {
        leaveByEmployee.set(leave.employeeId, []);
      }
      leaveByEmployee.get(leave.employeeId)!.push({
        ...leave,
        eventCategoryName: leave.EventCategory?.name,
      });
    }
```

**Step 5:** Pass leave data to conflict detector

```typescript
// app/api/shifts/conflicts/route.ts - Line 167, update call:

    const conflicts = detectScheduleConflicts(
      shifts as any,
      availabilityPatterns,
      availabilityExceptions,
      employeeSkills,
      leaveByEmployee, // ADD THIS
      conflictSettings
    );
```

**Testing:**
1. Approve leave request for employee (e.g., Dec 25-27)
2. Try to assign shift on Dec 26
3. Verify conflict appears with type `LEAVE_CONFLICT` and severity `CRITICAL`

---

### **Fix 2: Calendar Integration**

**Problem:** Shifts don't appear on company calendar

**File to Modify:** `app/api/calendar-events/route.ts`

**Step 1:** Fetch shifts alongside leave requests

```typescript
// app/api/calendar-events/route.ts - After line 60, add:

    // Fetch published shifts in date range
    const shifts = await prisma.shift.findMany({
      where: {
        companyId: session.user.companyId,
        isPublished: true,
        employeeId: { not: null }, // Only assigned shifts
        startTime: {
          gte: hasValidFrom ? fromDate : undefined,
          lte: hasValidTo ? toDate : undefined,
        },
        ...(department ? {
          employee: {
            Department: { is: { name: department } }
          }
        } : {}),
        ...(departmentId ? {
          departmentId
        } : {}),
      },
      include: {
        employee: {
          include: {
            User: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
            Department: {
              select: {
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
```

**Step 2:** Transform shifts to calendar events

```typescript
// app/api/calendar-events/route.ts - After shift fetch, add:

    const shiftEvents = await Promise.all(
      shifts.map(async (shift: any) => {
        const user = shift.employee?.User;
        const displayName = user?.name || 
          `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 
          'Unknown';

        let profileImageUrl: string | null = null;
        if (user?.profileImageUrl) {
          try {
            const { data: signed } = await supabase.storage
              .from('documents')
              .createSignedUrl(user.profileImageUrl, 60 * 5);
            profileImageUrl = signed?.signedUrl ?? null;
          } catch (_err) {
            profileImageUrl = null;
          }
        }

        const duration = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);

        return {
          id: shift.id,
          title: `🕒 ${displayName} - ${shift.role || 'Shift'}`,
          start: shift.startTime,
          end: shift.endTime,
          allDay: false,
          type: 'shift',
          shiftId: shift.id,
          locationName: shift.location?.name ?? null,
          locationId: shift.location?.id ?? null,
          duration: duration.toFixed(1),
          notes: shift.notes,
          employee: {
            id: shift.employee?.id,
            name: displayName,
            department: shift.employee?.Department?.name ?? null,
            profileImageUrl,
          },
          // Use different color for shifts
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          textColor: '#FFFFFF',
        };
      })
    );
```

**Step 3:** Combine and return both event types

```typescript
// app/api/calendar-events/route.ts - Replace final return:

    return NextResponse.json([...events, ...shiftEvents]);
```

**Step 4:** Update calendar UI to handle shift events

```typescript
// app/(withSidebar)/calendar/page.tsx - Update eventContent renderer (around line 250):

  const renderEventContent = (eventInfo: EventContentArg) => {
    const event = eventInfo.event;
    const isShift = event.extendedProps.type === 'shift';
    const isLeave = !isShift;

    return (
      <div className="fc-event-main-frame">
        <div className="fc-event-time">{eventInfo.timeText}</div>
        <div className="fc-event-title-container">
          <div className="fc-event-title fc-sticky">
            {isShift && '🕒 '}
            {isLeave && '🏖️ '}
            {eventInfo.event.title}
          </div>
        </div>
      </div>
    );
  };
```

**Testing:**
1. Publish shifts for employees
2. Navigate to calendar page
3. Verify shifts appear in blue with 🕒 icon
4. Verify leave still appears normally
5. Test filtering by department

---

### **Fix 3: Email Notifications**

**Problem:** All email notifications are TODOs

**Files to Create:**
1. `lib/email/shift-notifications.ts`

**Files to Modify:**
1. `app/api/shifts/[id]/publish/route.ts`
2. `app/api/timesheets/[id]/submit/route.ts`

**Step 1:** Create shift email helper

```typescript
// lib/email/shift-notifications.ts - NEW FILE

import { resend } from '@/lib/resend';
import { renderPeopleCoreEmail, getAppBaseUrl } from '@/lib/email/template';
import { format, differenceInHours } from 'date-fns';

interface ShiftEmailData {
  id: string;
  startTime: Date;
  endTime: Date;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  requiresConfirmation: boolean;
  location?: {
    name: string;
    address?: string | null;
  } | null;
}

interface EmployeeEmailData {
  name: string;
  email: string;
}

export async function sendShiftPublishedEmail(
  employee: EmployeeEmailData,
  shift: ShiftEmailData,
  companyId: string
) {
  const duration = differenceInHours(shift.endTime, shift.startTime);
  const netHours = duration - (shift.breakDuration / 60);

  const html = renderPeopleCoreEmail({
    companyId,
    title: 'New Shift Assignment',
    content: `
      <h2>Hi ${employee.name},</h2>
      <p>You have been assigned a new shift:</p>
      
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Date:</td>
            <td style="padding: 8px 0; font-weight: 600;">${format(shift.startTime, 'EEEE, MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Time:</td>
            <td style="padding: 8px 0; font-weight: 600;">${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Duration:</td>
            <td style="padding: 8px 0; font-weight: 600;">${netHours.toFixed(1)} hours (${shift.breakDuration} min break)</td>
          </tr>
          ${shift.role ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Role:</td>
            <td style="padding: 8px 0; font-weight: 600;">${shift.role}</td>
          </tr>
          ` : ''}
          ${shift.location ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Location:</td>
            <td style="padding: 8px 0; font-weight: 600;">${shift.location.name}</td>
          </tr>
          ${shift.location.address ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Address:</td>
            <td style="padding: 8px 0;">${shift.location.address}</td>
          </tr>
          ` : ''}
          ` : ''}
          ${shift.notes ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Notes:</td>
            <td style="padding: 8px 0;">${shift.notes}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${shift.requiresConfirmation ? `
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400E;">
            <strong>⚠️ Confirmation Required</strong><br/>
            Please confirm your availability for this shift as soon as possible.
          </p>
        </div>
      ` : ''}

      <div style="margin: 30px 0;">
        <a href="${getAppBaseUrl()}/employee/schedule" 
           style="display: inline-block; background: #3B82F6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          View My Schedule
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
        You will receive a reminder 1 hour before your shift starts.
      </p>
    `,
  });

  await resend.emails.send({
    from: 'PeopleCore <notifications@peoplecore.app>',
    to: employee.email,
    subject: '📅 New Shift Assignment',
    html,
  });
}

export async function sendShiftReminderEmail(
  employee: EmployeeEmailData,
  shift: ShiftEmailData,
  companyId: string
) {
  const html = renderPeopleCoreEmail({
    companyId,
    title: 'Shift Reminder',
    content: `
      <h2>Hi ${employee.name},</h2>
      <p style="font-size: 18px;">⏰ Your shift starts in <strong>1 hour</strong>!</p>
      
      <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
          ${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}
        </p>
        ${shift.location ? `
          <p style="margin: 0; color: #1E40AF;">
            📍 ${shift.location.name}
          </p>
        ` : ''}
      </div>

      <div style="margin: 30px 0;">
        <a href="${getAppBaseUrl()}/employee/clock" 
           style="display: inline-block; background: #10B981; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Clock In Now
        </a>
      </div>
    `,
  });

  await resend.emails.send({
    from: 'PeopleCore <notifications@peoplecore.app>',
    to: employee.email,
    subject: '⏰ Shift Reminder - Starting Soon!',
    html,
  });
}

export async function sendTimesheetSubmittedEmail(
  manager: EmployeeEmailData,
  employee: EmployeeEmailData,
  timesheet: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    totalHours: number;
  },
  companyId: string
) {
  const html = renderPeopleCoreEmail({
    companyId,
    title: 'Timesheet Awaiting Approval',
    content: `
      <h2>Hi ${manager.name},</h2>
      <p>${employee.name} has submitted a timesheet for your review.</p>
      
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Period:</strong> ${format(timesheet.periodStart, 'MMM d')} - ${format(timesheet.periodEnd, 'MMM d, yyyy')}</p>
        <p style="margin: 0;"><strong>Total Hours:</strong> ${timesheet.totalHours} hours</p>
      </div>

      <div style="margin: 30px 0;">
        <a href="${getAppBaseUrl()}/admin/timesheets/hub" 
           style="display: inline-block; background: #3B82F6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Review Timesheet
        </a>
      </div>
    `,
  });

  await resend.emails.send({
    from: 'PeopleCore <notifications@peoplecore.app>',
    to: manager.email,
    subject: '📋 Timesheet Submitted for Approval',
    html,
  });
}
```

**Step 2:** Activate emails in shift publish endpoint

```typescript
// app/api/shifts/[id]/publish/route.ts - Replace lines 143-167 with:

    if (data.notifyEmployees && assignedShifts.length > 0) {
      for (const shift of assignedShifts) {
        if (!shift.employeeId) continue;

        const employee = employeeMap.get(shift.employeeId);
        if (!employee) continue;

        try {
          await sendShiftPublishedEmail(
            { name: employee.User.name, email: employee.User.email },
            {
              id: shift.id,
              startTime: shift.startTime,
              endTime: shift.endTime,
              breakDuration: shift.breakDuration,
              notes: shift.notes,
              role: shift.role,
              requiresConfirmation: shift.requiresConfirmation,
              location: shift.location || null,
            },
            requestingEmployee.companyId
          );
          notificationResults.success++;
        } catch (error) {
          console.error(`Failed to send notification to ${employee.User.email}:`, error);
          notificationResults.failed++;
        }
      }
    }
```

**Step 3:** Add import at top of file

```typescript
// app/api/shifts/[id]/publish/route.ts - Line 7, replace with:
import { sendShiftPublishedEmail } from '@/lib/email/shift-notifications';
```

**Testing:**
1. Publish a shift with `notifyEmployees: true`
2. Check employee's email inbox
3. Verify email received with correct shift details
4. Click "View My Schedule" link to verify navigation

---

## 🟡 PHASE 2: DASHBOARD WIDGETS (Week 2)

### **Widget 1: Today's Shift - Employee Dashboard**

**File to Create:** `components/dashboard/TodaysShiftWidget.tsx`

```typescript
// components/dashboard/TodaysShiftWidget.tsx - NEW FILE

'use client';

import useSWR from 'swr';
import { DashboardWidget } from '@/components/ui/DashboardWidget';
import { Clock, MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { format, isToday, isFuture } from 'date-fns';
import { WidgetLoading, WidgetError } from '@/components/ui/WidgetStates';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TodaysShiftWidget({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  
  const { data, error, isLoading } = useSWR(
    employeeId ? `/api/shifts/today?employeeId=${employeeId}` : null,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );

  return (
    <DashboardWidget
      title="Today's Shift"
      icon={Clock}
      action={
        <button 
          onClick={() => router.push('/employee/schedule')}
          className="text-sm underline"
        >
          View all shifts
        </button>
      }
    >
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load shift" />
      ) : !data?.shift ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No shift scheduled today</p>
          <p className="text-xs text-muted-foreground mt-1">Enjoy your day off! 🌟</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {format(new Date(data.shift.startTime), 'h:mm a')}
              </span>
              <span className="text-gray-400">to</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {format(new Date(data.shift.endTime), 'h:mm a')}
              </span>
            </div>
            
            {data.shift.location && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4 mr-1" />
                {data.shift.location.name}
              </div>
            )}
            
            {data.shift.role && (
              <div className="text-sm mt-2">
                <span className="text-muted-foreground">Role:</span>{' '}
                <span className="font-medium">{data.shift.role}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/employee/clock')}
              variant="default"
              size="sm"
              className="flex-1"
            >
              Clock In
            </Button>
            <Button
              onClick={() => router.push('/employee/schedule')}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              View Details
            </Button>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
```

**API Endpoint to Create:** `app/api/shifts/today/route.ts`

```typescript
// app/api/shifts/today/route.ts - NEW FILE

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const shift = await prisma.shift.findFirst({
      where: {
        employeeId,
        isPublished: true,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json({
      shift: shift || null,
      date: today.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching today shift:', error);
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 });
  }
}
```

**Integration:** Add to employee dashboard

```typescript
// app/(withSidebar)/dashboard/employee/EmployeeDashboardClient.tsx
import { TodaysShiftWidget } from '@/components/dashboard/TodaysShiftWidget';

export default function EmployeeDashboardClient({ employeeId }: { employeeId?: string }) {
  return (
    <>
      {employeeId && <TodaysShiftWidget employeeId={employeeId} />}
      {employeeId && <UpcomingLeave employeeId={employeeId} />}
      {/* ... rest of widgets ... */}
    </>
  );
}
```

---

## ✅ TESTING CHECKLIST

After implementing Phase 1, verify:

### **Leave Conflict Detection**
- [ ] Approve leave for employee (e.g., Tomorrow)
- [ ] Try to create shift for same employee on that date
- [ ] Verify conflict appears with type "LEAVE_CONFLICT"
- [ ] Verify severity is "CRITICAL"
- [ ] Verify conflict description mentions the leave type

### **Calendar Integration**
- [ ] Publish 3-4 shifts for different employees
- [ ] Navigate to `/calendar`
- [ ] Verify shifts appear with 🕒 icon
- [ ] Verify shifts are blue colored
- [ ] Verify leave requests still show with 🏖️ icon
- [ ] Verify filtering by department works for both
- [ ] Click on shift event - verify details popup

### **Email Notifications**
- [ ] Publish shift with employee assigned
- [ ] Check employee email inbox
- [ ] Verify "New Shift Assignment" email received
- [ ] Verify all shift details are correct
- [ ] Click "View My Schedule" button - verify link works
- [ ] Verify confirmation warning shows if `requiresConfirmation: true`

### **Today's Shift Widget**
- [ ] Login as employee with shift today
- [ ] Navigate to dashboard
- [ ] Verify "Today's Shift" widget appears
- [ ] Verify correct time and location shown
- [ ] Click "Clock In" button - verify navigation
- [ ] Login as employee with NO shift today
- [ ] Verify "No shift scheduled today" message

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Run database migration for any schema changes
- [ ] Verify `RESEND_API_KEY` is set in environment
- [ ] Test email sending in staging environment
- [ ] Verify calendar loads without performance issues
- [ ] Run conflict detection on existing shifts (migration script if needed)
- [ ] Update API documentation
- [ ] Train support team on new features
- [ ] Prepare release notes

---

## 📞 SUPPORT & TROUBLESHOOTING

### **Leave conflicts not detecting?**
Check: Conflict detector receives leave data, Leave status is "APPROVED"

### **Shifts not showing on calendar?**
Check: Shifts are published (`isPublished: true`), Shifts have `employeeId` assigned

### **Emails not sending?**
Check: RESEND_API_KEY environment variable, Email service logs, Recipient email valid

### **Widget not loading?**
Check: API endpoint `/api/shifts/today` works, Employee ID is correct, Browser console for errors

