# Time Tracking System - Phase 3 Implementation Handoff

## 🎯 Mission
Implement Phase 3 (Shift Swaps & Availability) for the enterprise-grade time tracking & scheduling system in Corenz (Next.js 15 + React 19 + Prisma HR platform). Phase 1 (Timesheet Approval) and Phase 2 (Rota/Shift Management) are **COMPLETE**.

---

## ✅ COMPLETED PHASES

### Phase 1: Timesheet Approval System ✅
- ✅ 4 API routes: timesheet CRUD, submit, approve, reject
- ✅ 4 UI components: TimesheetCard, TimesheetTable, ApprovalTimeline, TimesheetDetailView
- ✅ Multi-stage approval workflows (SEQUENTIAL, UNANIMOUS, FIRST_RESPONDER)
- ✅ Email notifications and audit logging
- ✅ Employee timesheet hub page

### Phase 2: Rota/Shift Management ✅
- ✅ 4 API routes:
  - `app/api/shifts/[id]/route.ts` - GET, PUT, DELETE single shifts
  - `app/api/shifts/[id]/publish/route.ts` - Publish shifts to employees
  - `app/api/shifts/bulk-create/route.ts` - Create multiple shifts from templates
  - `app/api/shifts/conflicts/route.ts` - Detect scheduling conflicts
- ✅ 3 UI components:
  - `components/rota/ShiftCard.tsx` - Shift display with actions
  - `components/rota/RotaCalendar.tsx` - Week/month calendar view
  - `components/rota/LaborCostSummary.tsx` - Cost breakdown by department
- ✅ Main page: `app/(withSidebar)/rota/page.tsx` - Manager shift management interface

**Key Features Working:**
- Shift creation, editing, deletion (managers only)
- Bulk shift creation from templates with date range filters
- Conflict detection (double-booking, rest periods, overtime, availability, skills)
- Labor cost calculation and breakdown
- Glassmorphism UI with mobile responsiveness
- Company scoping and permission checks

---

## 🚧 YOUR TASK: Phase 3 - Shift Swaps & Availability

### Overview
Enable employees to:
1. Request shift swaps with other employees (with optional manager approval)
2. Set recurring availability patterns (e.g., "Available Mon-Fri 9am-5pm")
3. Add one-time availability exceptions (e.g., "Unavailable Dec 25")
4. View their upcoming shifts and swap requests

Managers get:
- Team availability grid for better scheduling
- Approval workflow for shift swaps
- Visibility into team availability patterns

---

## 📋 IMPLEMENTATION CHECKLIST

### API Routes to Build (9 routes)

#### Shift Swap Routes (5 routes)

**1. `app/api/shift-swaps/route.ts` (GET, POST)**

GET: List swap requests
```typescript
Query params:
  - status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MANAGER_PENDING' | 'APPROVED' | 'COMPLETED'
  - requesterId: string (optional)
  - targetEmployeeId: string (optional)

Response:
  - swapRequests: Array of ShiftSwapRequest with shift and employee details
  - Include: Shift details, requester info, target info
```

POST: Create swap request
```typescript
Body:
  - shiftId: string (required)
  - targetEmployeeId: string (optional - null means "anyone can take it")
  - requestMessage: string (optional)

Logic:
  1. Verify requester owns the shift
  2. Verify shift is published and not in the past
  3. If targetEmployeeId provided, check they exist and are not the requester
  4. Create ShiftSwapRequest with status PENDING
  5. Send notification to target employee (or broadcast if no target)
  6. Create audit log
```

**2. `app/api/shift-swaps/[id]/accept/route.ts` (POST)**

POST: Employee accepts swap request
```typescript
Body:
  - offerShiftId: string (optional - shift they're offering in exchange)

Logic:
  1. Verify requesting employee is the target or target is null
  2. Verify swap is still PENDING
  3. Check if managerApprovalRequired (from TimeTrackingSettings)
  4. If manager approval needed:
     - Update status to MANAGER_PENDING
     - Send notification to manager
  5. If no manager approval needed:
     - Swap the shift assignments immediately
     - Update status to APPROVED/COMPLETED
     - Send confirmation notifications
  6. Create audit log
```

**3. `app/api/shift-swaps/[id]/reject/route.ts` (POST)**

POST: Employee rejects swap request
```typescript
Body:
  - reason: string (optional)

Logic:
  1. Verify requesting employee is the target
  2. Update status to REJECTED
  3. Update responseMessage with reason
  4. Send notification to requester
  5. Create audit log
```

**4. `app/api/shift-swaps/[id]/approve/route.ts` (POST)**

POST: Manager approves swap
```typescript
Body:
  - comments: string (optional)

Logic:
  1. Verify requester is MANAGER/ADMIN
  2. Verify swap is MANAGER_PENDING
  3. Swap the shift assignments
  4. Update status to APPROVED/COMPLETED
  5. Update managerApprovedBy and managerApprovedAt
  6. Send notifications to both employees
  7. Create audit log
```

**5. `app/api/shift-swaps/[id]/route.ts` (GET, DELETE)**

GET: Fetch single swap request with full details

DELETE: Cancel swap request (only by requester, only if PENDING)

#### Availability Routes (4 routes)

**1. `app/api/availability/[employeeId]/route.ts` (GET, PUT)**

GET: Fetch availability patterns and exceptions
```typescript
Response:
  - patterns: Array of AvailabilityPattern (recurring weekly)
  - exceptions: Array of AvailabilityException (one-time)
  - upcomingExceptions: Filter exceptions to future dates
```

PUT: Update recurring availability patterns
```typescript
Body:
  - patterns: Array of {
      dayOfWeek: 0-6 (0=Sunday)
      startTime: "HH:MM"
      endTime: "HH:MM"
      isAvailable: boolean
    }

Logic:
  1. Verify requester is updating their own availability or is MANAGER/ADMIN
  2. Delete existing patterns for the employee
  3. Create new patterns
  4. Run conflict detection for existing shifts
  5. Return updated patterns with any new conflicts
```

**2. `app/api/availability/exceptions/route.ts` (POST, DELETE)**

POST: Create one-time availability exception
```typescript
Body:
  - employeeId: string
  - date: Date
  - startTime: "HH:MM" (optional - null for all day)
  - endTime: "HH:MM" (optional - null for all day)
  - isAvailable: boolean
  - reason: string (optional)

Logic:
  1. Verify permission (own availability or MANAGER/ADMIN)
  2. Check for conflicting shifts if isAvailable is false
  3. Create exception
  4. Return conflicts if any
```

DELETE: Remove exception (pass exception ID in query)

**3. `app/api/availability/team/route.ts` (GET)**

GET: Get team availability for scheduling (MANAGER/ADMIN only)
```typescript
Query params:
  - date: Date (required)
  - departmentId: string (optional)

Response:
  - Grid of employees and their availability for the week starting from date
  - Include: employee details, availability patterns, exceptions, existing shifts
  - Format: { employeeId, name, department, availability: { [dayOfWeek]: boolean } }
```

---

### UI Components to Build (2 components)

**1. `components/rota/ShiftSwapModal.tsx`**

Modal for requesting shift swaps. Should include:
- Shift details display (date, time, location)
- Target employee selector (dropdown with "Anyone can take it" option)
- Message/reason textarea
- Submit button
- Loading and error states
- Success confirmation

Props:
```typescript
interface ShiftSwapModalProps {
  shift: Shift;
  employees: Employee[]; // Potential swap targets
  onClose: () => void;
  onSuccess: () => void;
}
```

**2. `components/rota/AvailabilityGrid.tsx`**

Interactive week grid for setting availability. Should include:
- 7 columns (days of week)
- Time slots (hourly or half-hourly)
- Click to toggle available/unavailable
- Visual styling: green for available, red for unavailable, gray for default
- Save button
- Display recurring patterns vs one-time exceptions
- Add exception button (opens date picker modal)

Props:
```typescript
interface AvailabilityGridProps {
  employeeId: string;
  patterns: AvailabilityPattern[];
  exceptions: AvailabilityException[];
  onUpdate: (patterns: AvailabilityPattern[]) => void;
  readOnly?: boolean;
}
```

---

### Page to Build

**`app/(withSidebar)/employee/schedule/page.tsx`**

Employee-facing schedule page. Should include:

**Sections:**
1. **My Upcoming Shifts**
   - Calendar view using RotaCalendar component
   - Filter: published shifts for current employee only
   - Show shift details on click
   - "Request Swap" button on each shift

2. **Shift Swap Requests**
   - Tabs: "Incoming" (swaps I can accept), "Outgoing" (swaps I requested)
   - List of swap requests with status badges
   - Accept/Reject buttons for incoming
   - Cancel button for outgoing (if PENDING)

3. **My Availability**
   - AvailabilityGrid component
   - "Set Availability" toggle to edit mode
   - Save changes button
   - List of upcoming exceptions below grid

**State Management:**
- Fetch shifts on mount and when date range changes
- Fetch swap requests on mount
- Fetch availability patterns on mount
- Real-time updates when actions are performed

---

## 📐 TECHNICAL SPECIFICATIONS

### Database Schema (Already Exists in Prisma)

```prisma
model ShiftSwapRequest {
  id                      String            @id @default(cuid())
  shiftId                 String
  requesterId             String
  targetEmployeeId        String?
  status                  ShiftSwapStatus   @default(PENDING)
  requestMessage          String?
  responseMessage         String?
  managerApprovalRequired Boolean           @default(true)
  managerApprovedBy       String?
  managerApprovedAt       DateTime?
  acceptedAt              DateTime?
  rejectedAt              DateTime?
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt
  
  Shift                   Shift             @relation(fields: [shiftId], references: [id])
}

enum ShiftSwapStatus {
  PENDING           // Waiting for target employee
  ACCEPTED          // Target accepted (if no manager approval needed)
  REJECTED          // Target rejected
  MANAGER_PENDING   // Waiting for manager approval
  APPROVED          // Manager approved
  COMPLETED         // Swap executed
  CANCELLED         // Requester cancelled
}

model AvailabilityPattern {
  id          String   @id @default(cuid())
  employeeId  String
  companyId   String
  dayOfWeek   Int      // 0=Sunday, 6=Saturday
  startTime   String   // HH:MM format
  endTime     String   // HH:MM format
  isAvailable Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AvailabilityException {
  id          String   @id @default(cuid())
  employeeId  String
  companyId   String
  date        DateTime
  startTime   String?  // HH:MM format (null = all day)
  endTime     String?  // HH:MM format (null = all day)
  isAvailable Boolean  @default(false)
  reason      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### API Route Pattern (Use This for All Routes)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Define Zod schema
const createSwapSchema = z.object({
  shiftId: z.string(),
  targetEmployeeId: z.string().optional().nullable(),
  requestMessage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const data = createSwapSchema.parse(body);

    // 3. Get requesting employee with role check
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

    // 4. Business logic here
    // ...

    // 5. Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: requestingEmployee.companyId,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: requestingEmployee.id,
        metadata: {
          type: 'SHIFT_SWAP_REQUESTED',
          // ... details
        },
      },
    });

    // 6. Return success response
    return NextResponse.json({
      success: true,
      // ... data
    });
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
```

### Email Notifications (Resend Integration)

**Email Configuration:**
- Service: **Resend**
- From Address: **noreply@corenz.com**

Check existing codebase for email sending pattern. If not found, implement:

```typescript
// lib/email.ts (create if doesn't exist)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await resend.emails.send({
      from: 'noreply@corenz.com',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw - email failures shouldn't break the request
  }
}
```

**Email Templates to Create:**

1. **Shift Swap Request Notification**
```typescript
await sendEmail({
  to: targetEmployee.User.email,
  subject: 'New Shift Swap Request',
  html: `
    <h2>New Shift Swap Request</h2>
    <p>Hi ${targetEmployee.User.name},</p>
    <p>${requester.User.name} has requested to swap a shift with you:</p>
    <ul>
      <li><strong>Date:</strong> ${format(shift.startTime, 'MMMM d, yyyy')}</li>
      <li><strong>Time:</strong> ${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}</li>
      <li><strong>Location:</strong> ${shift.location?.name || 'N/A'}</li>
    </ul>
    ${requestMessage ? `<p><strong>Message:</strong> ${requestMessage}</p>` : ''}
    <p>Log in to accept or decline this request.</p>
  `,
});
```

2. **Swap Accepted Notification** (to requester)
3. **Swap Rejected Notification** (to requester)
4. **Manager Approval Needed** (to manager)
5. **Swap Approved by Manager** (to both employees)

---

## 🎨 UI DESIGN PATTERNS

### Glassmorphism Style (Use Everywhere)
```tsx
className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl"
```

### Status Badge Colors
```tsx
// Pending
className="bg-amber-500/20 text-amber-600 border border-amber-500/30"

// Approved/Accepted
className="bg-green-500/20 text-green-600 border border-green-500/30"

// Rejected/Cancelled
className="bg-red-500/20 text-red-600 border border-red-500/30"

// Manager Pending
className="bg-blue-500/20 text-blue-600 border border-blue-500/30"
```

### Empty State Pattern
```tsx
if (items.length === 0) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
      <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">No Items</h3>
      <p className="text-gray-400">Description</p>
    </div>
  );
}
```

---

## 🔧 EXISTING UTILITIES TO USE

**1. Conflict Detection**
```typescript
import { detectScheduleConflicts } from '@/lib/conflict-detector';

// Use this after availability changes to check for new conflicts
const conflicts = detectScheduleConflicts(
  shifts,
  availabilityPatterns,
  availabilityExceptions,
  employeeSkills,
  { minimumRestHours: 11, maxHoursPerWeek: 40 }
);
```

**2. Date Utilities**
```typescript
import { format, parseISO, isSameDay } from 'date-fns';
```

**3. Permission Check Pattern**
```typescript
const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
const isOwnData = resourceEmployeeId === requestingEmployee.id;

if (!isOwnData && !isAdminOrManager) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

---

## 🧪 TESTING CHECKLIST

### Manual Testing
- [ ] Employee can request shift swap with specific person
- [ ] Employee can request shift swap with "anyone"
- [ ] Target employee receives notification
- [ ] Target employee can accept swap
- [ ] Target employee can reject swap with reason
- [ ] If manager approval required, swap goes to MANAGER_PENDING
- [ ] Manager can approve swap
- [ ] Shift assignments are swapped correctly
- [ ] Both employees receive confirmation
- [ ] Employee can set recurring availability patterns
- [ ] Employee can add one-time exception (vacation day)
- [ ] Conflicts are detected when availability conflicts with existing shifts
- [ ] Manager can view team availability grid
- [ ] Employee schedule page shows all shifts and swap requests
- [ ] Cancel swap request works (only PENDING status)

### Edge Cases to Handle
- Cannot swap shifts that are in the past
- Cannot swap unpublished shifts
- Cannot swap with yourself
- Cannot accept swap if you don't own a conflicting shift
- Availability exceptions override recurring patterns
- Delete availability pattern if employee no longer exists

---

## 📋 PHASE 4 & 5 PREVIEW (DO NOT IMPLEMENT YET)

### Phase 4: Settings & Payroll Export
- Time tracking settings management page
- Payroll export API (CSV/Excel/JSON)
- Timesheet hub for admins (bulk approval)
- Geofence management with map interface

### Phase 5: Mobile App
- React Native screens for:
  - Clock in/out with GPS and camera
  - View timesheets
  - View schedule
  - Request shift swaps

---

## 🚀 IMPLEMENTATION ORDER

**Week 3 Timeline:**

**Day 1-2: Shift Swap APIs**
1. Create `app/api/shift-swaps/route.ts` (GET, POST)
2. Create accept/reject/approve routes
3. Test with Postman/curl
4. Implement email notifications

**Day 3-4: Availability APIs**
1. Create `app/api/availability/[employeeId]/route.ts`
2. Create exceptions route
3. Create team availability route
4. Test availability conflict detection

**Day 5-6: UI Components**
1. Build ShiftSwapModal component
2. Build AvailabilityGrid component
3. Test components in isolation

**Day 7: Employee Schedule Page**
1. Create `app/(withSidebar)/employee/schedule/page.tsx`
2. Integrate all components
3. Test full workflow end-to-end
4. Polish UI and add loading states

---

## ✅ DEFINITION OF DONE

Each deliverable is complete when:
- [ ] Matches Prisma schema exactly
- [ ] Has proper permission checks
- [ ] Includes Zod validation
- [ ] Has error handling with try-catch
- [ ] Includes audit logging
- [ ] Sends email notifications where applicable
- [ ] Is mobile-responsive
- [ ] Uses glassmorphism design system
- [ ] Has loading and empty states
- [ ] Works with multi-tenancy (companyId scoping)
- [ ] Tested manually with real data
- [ ] No TypeScript errors (`npx tsc --noEmit`)

---

## 📞 KEY FILES TO REVIEW BEFORE STARTING

1. `TIME_TRACKING_PHASE2_HANDOFF.md` - Full context on what's been built
2. `prisma/schema.prisma` - Lines 3066-3117 for swap and availability models
3. `app/api/shifts/[id]/route.ts` - Reference API pattern
4. `components/rota/ShiftCard.tsx` - Reference component pattern
5. `app/(withSidebar)/rota/page.tsx` - Reference page pattern
6. `lib/conflict-detector.ts` - Understand conflict detection

---

## 🐛 GOTCHAS TO WATCH OUT FOR

1. **Shift Swap Edge Cases**: Verify shift is published, not in past, not already swapped
2. **Manager Approval Setting**: Check `TimeTrackingSettings.requireShiftSwapApproval`
3. **Availability Day of Week**: 0=Sunday, not Monday (JavaScript Date.getDay())
4. **Time Format**: Store as "HH:MM" string, not Date objects
5. **Company Scoping**: Always filter by companyId for multi-tenancy
6. **Email Failures**: Don't throw errors if email sending fails (wrap in try-catch)
7. **Audit Logs**: Use unique ID pattern: `audit-${Date.now()}-${Math.random()}`

---

## 💡 HELPFUL COMMANDS

```bash
# Run dev server
npm run dev

# Type check
npx tsc --noEmit

# Run Prisma Studio (view database)
npx prisma studio

# Generate Prisma Client (after schema changes)
npx prisma generate
```

---

## 🎯 SUCCESS CRITERIA

Phase 3 is complete when:
1. ✅ Employees can request shift swaps and see status
2. ✅ Target employees can accept/reject swap requests
3. ✅ Managers can approve swaps (if required by settings)
4. ✅ Employees can set weekly availability patterns
5. ✅ Employees can add one-time availability exceptions
6. ✅ Managers can view team availability for scheduling
7. ✅ Conflicts are detected when availability changes
8. ✅ Email notifications sent for all swap events
9. ✅ Employee schedule page shows shifts, swaps, and availability
10. ✅ All UI is mobile-responsive with glassmorphism design

---

## 📝 NOTES

- **Email Integration**: Use Resend with noreply@corenz.com (already configured)
- **Existing Patterns**: Follow the same patterns from Phase 2 for consistency
- **Component Reuse**: Use existing ShiftCard and RotaCalendar components where possible
- **Conflict Detection**: The utility already exists, just integrate it
- **Audit Trail**: Every action must be logged for compliance

**Good luck! The foundation from Phase 1 and 2 is solid. You're building essential employee empowerment features.**
