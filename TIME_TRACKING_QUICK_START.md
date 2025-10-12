# Time Tracking & Scheduling - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Apply Database Migration
```bash
cd "c:\Users\macke\Downloads\corenz restart\clean-corenz-frontend"
npx prisma migrate dev --name add_time_tracking_system
npx prisma generate
```

### Step 2: Install Required Dependencies
```bash
npm install xlsx
```
*Note: `date-fns` and `papaparse` are already installed*

### Step 3: Test the Clock Widget

Create a test page: `app/(withSidebar)/test-clock/page.tsx`

```tsx
import ClockWidget from '@/components/time-tracking/ClockWidget';

export default function TestClockPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test Clock In/Out</h1>
      <ClockWidget 
        requireGPS={false}
        requirePhoto="NO"
      />
    </div>
  );
}
```

Navigate to `/test-clock` to test clock in/out functionality.

### Step 4: Initialize Settings for Your Company

Create: `scripts/initialize-time-tracking-settings.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeSettings() {
  const companies = await prisma.company.findMany();

  for (const company of companies) {
    const existingSettings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: company.id },
    });

    if (!existingSettings) {
      await prisma.timeTrackingSettings.create({
        data: {
          companyId: company.id,
          // Default settings - customize as needed
          requireGPS: false,
          requirePhoto: 'NO',
          allowMobileClock: true,
          roundClockTimes: 'NONE',
          timesheetPeriod: 'WEEKLY',
          periodStartDay: 'MONDAY',
          autoSubmit: false,
          allowEditAfterSubmit: false,
          autoSchedulingEnabled: false,
          publishDaysAdvance: 7,
          requireShiftConfirm: false,
          allowShiftSwaps: true,
          managerApprovalSwaps: true,
          minimumRestHours: 11,
          includeOvertimeExport: true,
          overtimeThreshold: 40.00,
          overtimeMultiplier: 1.50,
          exportFormat: 'CSV',
        },
      });
      console.log(`✓ Initialized settings for ${company.name}`);
    }
  }

  console.log('✓ All companies initialized');
  await prisma.$disconnect();
}

initializeSettings();
```

Run it:
```bash
npx tsx scripts/initialize-time-tracking-settings.ts
```

## 📋 API Testing with curl/Postman

### Clock In
```bash
curl -X POST http://localhost:3000/api/time-tracking/clock-in \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{}'
```

### Check Status
```bash
curl http://localhost:3000/api/time-tracking/status \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Clock Out
```bash
curl -X POST http://localhost:3000/api/time-tracking/clock-out \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{}'
```

### Generate Timesheet
```bash
curl -X POST http://localhost:3000/api/timesheets/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{}'
```

### Create Shift
```bash
curl -X POST http://localhost:3000/api/shifts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "startTime": "2025-01-20T09:00:00Z",
    "endTime": "2025-01-20T17:00:00Z",
    "breakDuration": 30,
    "role": "Sales Associate"
  }'
```

## 🎨 Add to Sidebar Navigation

### Employee Sidebar
Edit `components/Sidebar/EmployeeSidebar.tsx` (or equivalent):

```tsx
import { Clock, Calendar } from 'lucide-react';

// Add these items to your navigation array
{
  name: 'My Timesheet',
  href: '/employee/timesheet',
  icon: Clock,
},
{
  name: 'My Schedule',
  href: '/employee/schedule',
  icon: Calendar,
}
```

### Admin Sidebar
Edit `components/Sidebar/AdminSidebar.tsx`:

```tsx
import { Users, Clock } from 'lucide-react';

{
  name: 'Rota',
  href: '/rota',
  icon: Users,
},
{
  name: 'Timesheet Hub',
  href: '/timesheet-hub',
  icon: Clock,
}
```

## 🔍 Verify Database Tables

Check that all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%lock%' 
   OR table_name LIKE '%imesheet%' 
   OR table_name LIKE '%hift%';
```

Expected tables:
- ClockEntry
- Timesheet
- TimesheetEntry
- TimesheetApprovalStage
- TimesheetApprovalDecision
- Shift
- ShiftTemplate
- ShiftSwapRequest
- AvailabilityPattern
- AvailabilityException
- ScheduleConflict
- PayrollExport
- BreakRecord
- ComplianceViolation
- TimeTrackingSettings

## 🧪 Test Scenarios

### Scenario 1: Basic Clock In/Out
1. Navigate to test clock page
2. Click "Clock In" → Should succeed
3. Wait 10 seconds
4. Click "Clock Out" → Should succeed
5. Check `/api/time-tracking/history` → Should see completed entry

### Scenario 2: Generate Timesheet
1. Clock in and out a few times over a week
2. Call `/api/timesheets/generate`
3. Call `/api/timesheets` → Should see generated timesheet
4. Check total hours calculation

### Scenario 3: Create and Schedule Shifts
1. Create a shift template (optional)
2. Create individual shifts for employees
3. Test auto-scheduling with requirements
4. Verify conflict detection

## 🚨 Common Issues & Solutions

### Issue: Migration fails with "enum already exists"
**Solution:** Drop the database and recreate, or use `--skip-generate`

### Issue: "Employee record not found"
**Solution:** Ensure logged-in user has an Employee record linked to their User

### Issue: GPS not working
**Solution:** Browser needs HTTPS or localhost. Check browser permissions.

### Issue: Photos not uploading
**Solution:** The current implementation uses data URLs. In production, upload to S3/CloudFlare R2 first.

### Issue: Timezone issues
**Solution:** All times stored in UTC. Convert to user's timezone in UI.

## 📖 Full Feature Pages (Examples)

### Employee Timesheet Page
```tsx
// app/(withSidebar)/employee/timesheet/page.tsx
import { Suspense } from 'react';
import ClockWidget from '@/components/time-tracking/ClockWidget';
import TimesheetHistory from '@/components/time-tracking/TimesheetHistory';

export default function MyTimesheetPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Timesheet</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ClockWidget />
        <CurrentPeriodCard />
      </div>

      <Suspense fallback={<Loading />}>
        <TimesheetHistory />
      </Suspense>
    </div>
  );
}
```

### Rota Hub (Admin)
```tsx
// app/(withSidebar)/rota/page.tsx
import RotaCalendar from '@/components/rota/RotaCalendar';
import LaborCostSummary from '@/components/rota/LaborCostSummary';

export default function RotaHubPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Rota Management</h1>
        <button className="btn-primary">Auto-Schedule</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <RotaCalendar />
        </div>
        <div>
          <LaborCostSummary />
        </div>
      </div>
    </div>
  );
}
```

## 🔐 Testing Permissions

### As Employee
- ✅ Can clock in/out
- ✅ Can view own timesheet
- ✅ Can view own schedule
- ❌ Cannot view others' timesheets
- ❌ Cannot create shifts
- ❌ Cannot approve timesheets

### As Manager
- ✅ Can clock in/out
- ✅ Can view team timesheets
- ✅ Can create shifts for team
- ✅ Can approve timesheets
- ✅ Can create manual entries
- ❌ Cannot access company-wide settings

### As Admin
- ✅ Full access to all features
- ✅ Can configure settings
- ✅ Can export payroll
- ✅ Can view all employees

## 📊 Monitoring & Debugging

### Check Active Clock Entries
```sql
SELECT e.id, u.name, ce.clockInTime, ce.status
FROM "ClockEntry" ce
JOIN "Employee" e ON e.id = ce."employeeId"
JOIN "User" u ON u.id = e."userId"
WHERE ce.status = 'ACTIVE'
ORDER BY ce."clockInTime" DESC;
```

### Check Recent Timesheets
```sql
SELECT t.id, u.name, t."periodStart", t."periodEnd", 
       t."totalHours", t."approvalStatus"
FROM "Timesheet" t
JOIN "Employee" e ON e.id = t."employeeId"
JOIN "User" u ON u.id = e."userId"
ORDER BY t."createdAt" DESC
LIMIT 10;
```

### Check Compliance Violations
```sql
SELECT cv."violationType", cv.description, cv."detectedAt",
       u.name as employee_name
FROM "ComplianceViolation" cv
JOIN "Employee" e ON e.id = cv."employeeId"
JOIN "User" u ON u.id = e."userId"
WHERE cv."acknowledgedAt" IS NULL
ORDER BY cv."detectedAt" DESC;
```

## 🎯 Next Steps

1. ✅ **Foundation Complete** - Database, utilities, core APIs
2. 🚧 **Phase 2** - Complete all API routes
3. 🚧 **Phase 3** - Build UI components
4. 🚧 **Phase 4** - Create main pages
5. 🚧 **Phase 5** - Mobile app integration
6. 🚧 **Phase 6** - Testing & refinement

---

**Ready to build!** The foundation is solid. Start with the UI components listed in `TIME_TRACKING_IMPLEMENTATION_SUMMARY.md`.
