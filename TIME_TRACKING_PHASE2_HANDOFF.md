# Time Tracking System - Phase 2 Implementation Handoff

## 🎯 Mission
Continue building enterprise-grade time tracking & scheduling system for Corenz (Next.js 15 + React 19 + Prisma HR platform). Phase 1 (timesheet approval) is **COMPLETE**. Your job: implement Phase 2 (Rota/Shift Management), Phase 3 (Shift Swaps & Availability), Phase 4 (Settings & Payroll), and Phase 5 (Mobile).

---

## ✅ COMPLETED - Phase 1 (Timesheet Approval System)

### API Routes (4 files) ✅
- `app/api/timesheets/[id]/route.ts` - GET (fetch single), PUT (update entries), DELETE (delete draft)
- `app/api/timesheets/[id]/submit/route.ts` - POST submit for approval with workflow integration
- `app/api/timesheets/[id]/approve/route.ts` - POST approve with stage progression
- `app/api/timesheets/[id]/reject/route.ts` - POST reject with reason

### UI Components (4 files) ✅
- `components/time-tracking/TimesheetCard.tsx` - Summary card with status badges
- `components/time-tracking/TimesheetTable.tsx` - Detailed entries table (desktop + mobile)
- `components/time-tracking/ApprovalTimeline.tsx` - Visual approval progress with stages
- `components/time-tracking/TimesheetDetailView.tsx` - Full view with approve/reject modals

### Pages (1 file) ✅
- `app/(withSidebar)/employee/timesheet/page.tsx` - Employee timesheet hub with ClockWidget

### Features Implemented ✅
- Multi-stage approval workflows (SEQUENTIAL, UNANIMOUS, FIRST_RESPONDER)
- Email notifications to approvers
- Audit logging via GlobalAuditLog
- Permission checks (own timesheet vs manager access)
- Edit/delete draft timesheets
- Glassmorphism UI styling
- Mobile-responsive design

---

## 🚧 REMAINING WORK (60%)

### Phase 2: Rota/Shift Management (HIGH PRIORITY - Week 2)

#### API Routes Needed (4 routes)
1. **`app/api/shifts/[id]/route.ts`** (GET, PUT, DELETE)
   - GET: Fetch single shift with employee, department, location details
   - PUT: Update shift (time, employee assignment, notes)
   - DELETE: Delete unpublished shifts only
   - Permission: MANAGER/ADMIN for edit, employees can view own shifts

2. **`app/api/shifts/[id]/publish/route.ts`** (POST)
   - Publish shift(s) to employees (makes visible + sends notifications)
   - Check: only unpublished shifts can be published
   - Send email/push notification to assigned employees
   - Log in audit trail

3. **`app/api/shifts/bulk-create/route.ts`** (POST)
   - Create multiple shifts from template
   - Accept: templateId, date range, employees array
   - Use `ShiftTemplate` model for pattern
   - Calculate cost for each shift
   - Return created shifts with conflict warnings

4. **`app/api/shifts/conflicts/route.ts`** (GET)
   - Detect conflicts for date range
   - Query params: startDate, endDate, employeeId (optional)
   - Use `lib/conflict-detector.ts` utility
   - Return conflicts with severity levels
   - Include: DOUBLE_BOOKING, REST_PERIOD, OVERTIME, UNAVAILABLE, SKILL_MISMATCH

#### UI Components Needed (3 components)
1. **`components/rota/RotaCalendar.tsx`**
   - Week/month calendar view using `react-big-calendar` or custom
   - Drag-and-drop shift assignment (optional, can be Phase 3)
   - Color-coded by department/status
   - Click shift to edit modal
   - Filter by department, employee, location
   - Show conflicts as warning badges

2. **`components/rota/ShiftCard.tsx`**
   - Display single shift (time, employee, location, status)
   - Status badge: SCHEDULED, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED
   - Action buttons: Edit, Delete, Publish, Confirm
   - Show cost if available
   - Mobile-optimized

3. **`components/rota/LaborCostSummary.tsx`**
   - Panel showing total labor cost for date range
   - Breakdown by department
   - Compare actual vs budgeted (if available)
   - Show overtime costs separately
   - Export button (connects to payroll export)

#### Page Needed (1 page)
**`app/(withSidebar)/rota/page.tsx`**
- Calendar view of all shifts (use RotaCalendar)
- Filters: date range, department, employee, location
- "Create Shift" button → modal
- "Auto-Schedule" button → calls `/api/shifts/auto-schedule` (already exists)
- Labor cost summary panel (collapsible sidebar)
- Conflict warnings at top
- Publish selected shifts button

---

### Phase 3: Shift Swaps & Availability (MEDIUM PRIORITY - Week 3)

#### API Routes Needed (9 routes)

**Shift Swaps (5 routes)**
1. `app/api/shift-swaps/route.ts` (GET, POST)
   - GET: List swap requests (filter by status, requester, target)
   - POST: Create swap request (employee requests to swap their shift)

2. `app/api/shift-swaps/[id]/accept/route.ts` (POST)
   - Employee accepts swap request
   - Check: target employee is the one accepting
   - Update status to ACCEPTED or MANAGER_PENDING

3. `app/api/shift-swaps/[id]/reject/route.ts` (POST)
   - Employee rejects swap request
   - Update status to REJECTED

4. `app/api/shift-swaps/[id]/approve/route.ts` (POST)
   - Manager approves swap (if managerApprovalRequired)
   - Swap the shift assignments
   - Update status to APPROVED/COMPLETED
   - Send notifications

**Availability (4 routes)**
1. `app/api/availability/[employeeId]/route.ts` (GET, PUT)
   - GET: Fetch availability patterns + exceptions
   - PUT: Update recurring availability patterns

2. `app/api/availability/exceptions/route.ts` (POST)
   - Create one-time availability exception (e.g., "unavailable Dec 25")
   - Used for vacation days, appointments, etc.

3. `app/api/availability/team/route.ts` (GET)
   - Managers get team availability for scheduling
   - Query params: date, departmentId
   - Return grid of who's available when

#### UI Components Needed (2 components)
1. **`components/rota/ShiftSwapModal.tsx`**
   - Form to request shift swap
   - Select target employee (optional, can be "open to anyone")
   - Add message/reason
   - Show shift details being swapped

2. **`components/rota/AvailabilityGrid.tsx`**
   - Week grid (7 columns for days, rows for time slots)
   - Click to toggle available/unavailable
   - Show recurring patterns in green, unavailable in red
   - Add exception dates section below

#### Page Updates
- `app/(withSidebar)/employee/schedule/page.tsx`
  - My upcoming shifts calendar
  - Shift confirmation buttons
  - "Request Swap" button on each shift
  - "Set Availability" section with AvailabilityGrid

---

### Phase 4: Settings & Payroll Export (MEDIUM PRIORITY - Week 4)

#### API Routes Needed (3 routes)
1. **`app/api/payroll/export/route.ts`** (POST)
   - Generate payroll export (CSV/Excel/JSON)
   - Use `lib/payroll-export.ts` utility (already exists)
   - Request body: periodStart, periodEnd, format, employeeIds (optional)
   - Return download URL or file stream
   - Create `PayrollExport` record for audit

2. **`app/api/payroll/exports/route.ts`** (GET)
   - List previous payroll exports
   - Filter by date range
   - Return exports with metadata

3. **`app/api/payroll/exports/[id]/route.ts`** (GET)
   - Download previous export file
   - Check permissions (ADMIN only)

#### Pages Needed (2 pages)
1. **`app/(withSidebar)/settings/time-tracking/page.tsx`**
   - Configure all `TimeTrackingSettings` fields
   - Sections:
     - Clock Settings (GPS, photo, rounding, auto clock-out)
     - Timesheet Settings (period, workflow, auto-submit)
     - Rota Settings (auto-schedule, publish advance, shift swaps)
     - Payroll Settings (overtime threshold, multiplier, export format)
   - Geofence management (map interface with pins)
   - Approval workflow selector (dropdown of existing workflows)
   - Save button with validation

2. **`app/(withSidebar)/timesheet-hub/page.tsx`**
   - Admin view of ALL timesheets (company-wide)
   - Filters: status, employee, department, date range
   - Bulk approval actions (select multiple → approve/reject)
   - Export to payroll button
   - Compliance warnings section
   - Stats: pending count, total hours, overtime hours

---

### Phase 5: Mobile App (LOW PRIORITY - Week 5)

#### Mobile Screens Needed (4 screens)
Location: `mobile/src/screens/`

1. **`ClockInScreen.tsx`**
   - Native GPS integration (Expo Location)
   - Camera for photo (Expo Camera)
   - Large clock in/out button
   - Show current status, timer if clocked in
   - Offline support with sync queue

2. **`TimesheetScreen.tsx`**
   - Mobile-optimized timesheet view
   - Current period summary
   - List of clock entries
   - Submit button

3. **`ScheduleScreen.tsx`**
   - My upcoming shifts in list/calendar view
   - Confirm shift button
   - Request swap option
   - Pull-to-refresh

4. **`ShiftSwapScreen.tsx`**
   - Browse available swaps
   - Request swap form
   - Accept/reject incoming requests

---

## 📐 TECHNICAL SPECIFICATIONS

### Database Schema (Already Migrated)
All models exist in `prisma/schema.prisma`:
- `Shift` - Scheduled shifts with employee assignment
- `ShiftTemplate` - Reusable shift patterns
- `ShiftSwapRequest` - Swap requests between employees
- `AvailabilityPattern` - Recurring weekly availability
- `AvailabilityException` - One-time availability changes
- `ScheduleConflict` - Auto-detected conflicts
- `PayrollExport` - Audit trail for exports
- `ComplianceViolation` - NZ law violations
- `TimeTrackingSettings` - Company configuration

### Existing Utility Libraries
Location: `lib/`
- ✅ `timesheet-calculations.ts` - Hours, overtime, pay, compliance checks
- ✅ `conflict-detector.ts` - Detect double-booking, rest periods, overtime
- ✅ `auto-scheduler.ts` - AI-powered shift assignment (32-point scoring)
- ✅ `payroll-export.ts` - CSV/Excel/JSON export with summary
- ✅ `gps-verification.ts` - Geofencing with Haversine formula

### API Route Patterns

#### Standard CRUD Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/resource/[id]/route.ts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestingEmployee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    include: { User: { select: { role: true } } },
  });

  if (!requestingEmployee) {
    return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
  }

  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);

  // Fetch resource with permission check
  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
    include: { /* related data */ },
  });

  if (!resource) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check ownership or manager access
  if (resource.employeeId !== requestingEmployee.id && !isAdminOrManager) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json({ resource });
}
```

#### Zod Validation Pattern
```typescript
const createShiftSchema = z.object({
  employeeId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  breakDuration: z.number().min(0).default(0),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
});

const body = await req.json();
const data = createShiftSchema.parse(body);
```

#### Error Handling Pattern
```typescript
try {
  // Logic
} catch (error) {
  console.error('Operation error:', error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error.errors },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

#### Audit Logging Pattern
```typescript
await prisma.globalAuditLog.create({
  data: {
    userId: session.user.id,
    companyId: requestingEmployee.companyId,
    action: 'CREATE', // CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
    resourceType: 'Shift',
    resourceId: shift.id,
    details: `Created shift for ${employee.User.name}`,
  },
});
```

### UI Component Patterns

#### Glassmorphism Styling (Use Everywhere)
```tsx
className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl"
```

#### Status Badge Colors
```tsx
// Green: Approved, Confirmed, Completed
className="bg-green-500/20 text-green-600 border border-green-500/30"

// Amber: Draft, Pending, Scheduled
className="bg-amber-500/20 text-amber-600 border border-amber-500/30"

// Red: Rejected, No-Show, Conflict
className="bg-red-500/20 text-red-600 border border-red-500/30"

// Blue: In Review, Published
className="bg-blue-500/20 text-blue-600 border border-blue-500/30"
```

#### Loading Skeleton Pattern
```tsx
if (isLoading) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
    </div>
  );
}
```

#### Empty State Pattern
```tsx
if (items.length === 0) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
      <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">No Items</h3>
      <p className="text-gray-400">Description of empty state</p>
    </div>
  );
}
```

### Permission Hierarchy
```typescript
// Roles from User.role enum
'EMPLOYEE' - Can view/edit own data only
'MANAGER' - Can view/edit team data (employees in their department)
'ADMIN' - Full access to company data
'SUPER_ADMIN' - Multi-tenant access (not used in time tracking)
```

### Email Notification Pattern
```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: employee.User.email,
  subject: 'Shift Assignment',
  html: `
    <h2>New Shift Assigned</h2>
    <p>Hi ${employee.User.name},</p>
    <p>You have been assigned a new shift:</p>
    <p><strong>Date:</strong> ${format(shift.startTime, 'MMM d, yyyy')}</p>
    <p><strong>Time:</strong> ${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}</p>
    <p>Please confirm your availability.</p>
  `,
});
```

---

## 🧪 TESTING STRATEGY

### Unit Tests
Create tests in `tests/` folder:
- `conflict-detector.test.ts` - Test conflict detection logic
- `auto-scheduler.test.ts` - Test scheduling algorithm

### Integration Tests
- Test API routes with mock authentication
- Test full workflows (create shift → publish → confirm)

### Manual Testing Checklist
**Phase 2 - Rota:**
- [ ] Create shift with employee assignment
- [ ] Publish shift → employee receives notification
- [ ] Edit published shift → updates reflected
- [ ] Delete unpublished shift
- [ ] Auto-schedule shifts → conflict detection works
- [ ] View calendar with filters
- [ ] Labor cost calculates correctly

**Phase 3 - Swaps:**
- [ ] Employee requests shift swap
- [ ] Target employee accepts swap
- [ ] Manager approves swap → shifts are swapped
- [ ] Employee rejects swap
- [ ] Set availability patterns
- [ ] Add availability exception

**Phase 4 - Settings & Payroll:**
- [ ] Update time tracking settings → affects behavior
- [ ] Add/edit geofences on map
- [ ] Export payroll CSV → correct data
- [ ] View export history
- [ ] Bulk approve timesheets in timesheet-hub

---

## 📦 DEPENDENCIES

Already installed:
```json
{
  "next": "15.x",
  "react": "19.x",
  "prisma": "latest",
  "next-auth": "latest",
  "zod": "latest",
  "date-fns": "latest",
  "xlsx": "latest",
  "lucide-react": "latest"
}
```

May need to install:
```bash
npm install react-big-calendar  # For calendar component
npm install react-hook-form     # For complex forms (optional)
npm install recharts             # For labor cost charts (optional)
npm install @react-google-maps/api  # For geofence map (optional, can use Mapbox)
```

---

## 🚀 IMPLEMENTATION ORDER

### Week 2: Phase 2 - Rota Management
1. Create shift CRUD APIs (`/api/shifts/[id]/*`)
2. Build `ShiftCard` component
3. Build `RotaCalendar` component
4. Build `LaborCostSummary` component
5. Create `app/(withSidebar)/rota/page.tsx`
6. Test full shift creation → publish → view flow

### Week 3: Phase 3 - Swaps & Availability
1. Create shift swap APIs (`/api/shift-swaps/*`)
2. Create availability APIs (`/api/availability/*`)
3. Build `ShiftSwapModal` component
4. Build `AvailabilityGrid` component
5. Create `app/(withSidebar)/employee/schedule/page.tsx`
6. Test swap workflow: request → accept → manager approve

### Week 4: Phase 4 - Settings & Payroll
1. Create payroll export APIs (`/api/payroll/*`)
2. Build settings page with map interface
3. Build timesheet-hub admin page
4. Test payroll export with real data
5. Test bulk approval actions

### Week 5: Phase 5 - Mobile (Optional)
1. Set up Expo dependencies
2. Build mobile screens
3. Test offline sync
4. Test GPS and camera integration

---

## 🎨 DESIGN SYSTEM

### Colors
- **Primary**: Blue (`bg-blue-600`)
- **Success**: Green (`bg-green-600`)
- **Warning**: Amber (`bg-amber-600`)
- **Error**: Red (`bg-red-600`)
- **Background**: Dark with glassmorphism (`bg-white/10 backdrop-blur-md`)

### Typography
- **Headings**: `font-bold text-white`
- **Body**: `text-gray-300`
- **Muted**: `text-gray-400`

### Spacing
- **Section Gap**: `space-y-6`
- **Card Padding**: `p-6`
- **Grid Gap**: `gap-6`

### Border Radius
- **Cards**: `rounded-xl`
- **Buttons**: `rounded-lg`
- **Badges**: `rounded-full`

---

## 📚 KEY FILES TO REVIEW

Before starting, review these files to understand patterns:
1. `prisma/schema.prisma` - All models (lines 2900-3425 are time tracking)
2. `lib/timesheet-calculations.ts` - Calculation utilities
3. `lib/conflict-detector.ts` - Conflict detection logic
4. `app/api/time-tracking/clock-in/route.ts` - API pattern example
5. `app/api/timesheets/[id]/approve/route.ts` - Approval flow pattern
6. `components/time-tracking/ClockWidget.tsx` - Component pattern example
7. `components/time-tracking/TimesheetCard.tsx` - Card component pattern
8. `TIME_TRACKING_IMPLEMENTATION_SUMMARY.md` - Full overview

---

## ✅ DEFINITION OF DONE

Each API route/component is done when:
- [ ] Matches Prisma schema exactly
- [ ] Has proper permission checks (employee/manager/admin)
- [ ] Includes Zod validation for request bodies
- [ ] Has comprehensive error handling
- [ ] Includes loading states in UI
- [ ] Is mobile-responsive (md: breakpoints)
- [ ] Has TypeScript types (no `any` except for Prisma results)
- [ ] Works with existing authentication (next-auth)
- [ ] Logged in audit trail where applicable
- [ ] Tested manually with real data
- [ ] Code comments for complex logic

---

## 🐛 KNOWN ISSUES / GOTCHAS

1. **Date Handling**: Always use `date-fns` for formatting, Prisma returns Date objects
2. **Decimal Fields**: Prisma Decimal needs `toString()` or parsing: `parseFloat(value.toString())`
3. **Company Scoping**: Always filter by `companyId` for multi-tenancy
4. **Session Check**: Every API route must check `getServerSession(authOptions)`
5. **Mobile Paths**: Use `%28withSidebar%29` for route groups in file system
6. **Approval Workflows**: Check if `defaultWorkflowId` exists before creating stages
7. **Email Sending**: Wrap in try-catch, don't fail request if email fails

---

## 💡 HELPFUL COMMANDS

```bash
# Run development server
npm run dev

# Check TypeScript errors
npx tsc --noEmit

# Format code
npx prettier --write .

# Run Prisma Studio (view database)
npx prisma studio

# Generate Prisma Client (after schema changes)
npx prisma generate

# Create migration (if schema changed)
npx prisma migrate dev --name add_feature_name
```

---

## 📞 QUESTIONS TO ASK USER

If you encounter unclear requirements:
1. "Should managers be able to swap shifts on behalf of employees?"
2. "What should happen when a published shift is edited - notify employee?"
3. "Should we enforce minimum shift duration (e.g., 2 hours)?"
4. "Can shifts span midnight (e.g., 11pm-3am)?"
5. "Should auto-scheduler prefer certain employees over others?"

---

## 🎯 SUCCESS CRITERIA

The system is complete when:
1. A manager can create, schedule, and publish shifts
2. Employees receive shift notifications and can confirm
3. Employees can request shift swaps (with manager approval)
4. Conflict detection prevents double-booking and compliance violations
5. Timesheets generate from clock entries and get approved
6. Payroll can be exported with accurate overtime calculations
7. All UI is mobile-responsive and follows design system
8. Full audit trail exists for all actions

---

## 🚀 START HERE

**Step 1**: Read this document fully  
**Step 2**: Review `TIME_TRACKING_IMPLEMENTATION_SUMMARY.md`  
**Step 3**: Review existing Phase 1 code to understand patterns  
**Step 4**: Start with `app/api/shifts/[id]/route.ts` (GET, PUT, DELETE)  
**Step 5**: Test each route with curl/Postman before building UI  
**Step 6**: Build UI components after APIs work  
**Step 7**: Create pages last (combine components)  

**Good luck! The foundation is solid - you're building on top of a complete Phase 1 implementation.**
