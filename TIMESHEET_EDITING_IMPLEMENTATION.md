# Timesheet Entry Editing & Audit System

## Overview
Comprehensive timesheet editing system allowing managers and admins to edit individual time entries at approval stage and post-approval, with full audit trail tracking all changes.

---

## ✨ Key Features

### 1. **Individual Entry Editing**
- ✅ Edit individual time entries during approval review
- ✅ Edit entries on approved timesheets
- ✅ Edit entries from dashboard action items (redirects to hub)
- ✅ Clear visual distinction between entry types:
  - 🔵 **CLOCK** - Blue badge for clock-in/clock-out entries
  - ⚪ **MANUAL** - Gray badge for manually entered entries
  - 🟠 **ADJUSTED** - Orange badge for manager-modified entries

### 2. **Comprehensive Audit Trail**
- ✅ Full history of all changes to timesheet entries
- ✅ Tracks what changed: date, start time, end time, break duration, hours, notes
- ✅ Records old and new values for every change
- ✅ Captures who made the change with employee details
- ✅ **Mandatory change reason** for compliance and finance queries
- ✅ Timeline view showing complete change history

### 3. **Permissions & Security**
- ✅ **Admins**: Can edit any timesheet entry in the company
- ✅ **Managers**: Can edit entries from their department or direct reports
- ✅ **Employees**: Cannot edit entries (only admins/managers)
- ✅ Company-level scoping enforced at API level
- ✅ All changes logged to GlobalAuditLog

### 4. **Smart Recalculations**
- ✅ Automatically recalculates hours when time changes
- ✅ Updates timesheet totals (regular hours, overtime hours)
- ✅ Respects company overtime threshold settings
- ✅ Real-time hour calculation preview in edit dialog

---

## 🎨 UI/UX Enhancements

### Entry Type Badges
Every time entry displays its type with color-coded badges:
- **Clock Entry**: Blue badge with clock icon - entries from clock-in/out system
- **Manual Entry**: Gray badge - entries manually added by employee
- **Manager Adjusted**: Orange badge with info icon - entries edited by manager/admin

### Edit Button Placement
- Small edit icon button next to each entry in the preview sheet
- Available in both pending (approval stage) and approved timesheets
- Tooltip shows "Edit entry" on hover

### Audit Trail Access
- "View Audit Trail" button at top of entries list
- Opens side sheet with complete change history
- Timeline view with visual indicators
- Color-coded change reasons in orange highlight boxes

### Modern Dialog Design
- Clean, intuitive edit form with proper field grouping
- Real-time hour calculation display
- Original entry values shown for reference
- Prominent change reason field with compliance messaging
- Responsive layout for mobile and desktop

---

## 🗄️ Database Schema

### New Model: `TimesheetEntryAudit`
```prisma
model TimesheetEntryAudit {
  id              String   @id @default(cuid())
  entryId         String
  timesheetId     String
  employeeId      String
  changedById     String   // Manager/Admin who made the change
  changeReason    String?  // Reason for the change
  field           String   // Field that was changed
  oldValue        String?  // JSON stringified old value
  newValue        String?  // JSON stringified new value
  changeType      String   // CREATED, UPDATED, DELETED
  changedAt       DateTime @default(now())
  companyId       String
  
  Entry           TimesheetEntry @relation(fields: [entryId])
  Employee        Employee       @relation("TimesheetEntryAuditEmployee")
  ChangedBy       Employee       @relation("TimesheetEntryAuditChangedBy")
  
  @@index([entryId, changedAt])
  @@index([timesheetId, changedAt])
  @@index([employeeId])
  @@index([changedById])
}
```

### Enhanced: `TimesheetEntry`
Added `entryType` enum field:
- `CLOCK` - Generated from clock entry
- `MANUAL` - Manually entered by employee
- `ADJUSTED` - Adjusted by manager/admin

---

## 🔌 API Endpoints

### PATCH `/api/timesheets/entries/[id]`
**Edit a single timesheet entry**

**Request Body:**
```json
{
  "date": "2024-01-15T00:00:00.000Z",
  "startTime": "2024-01-15T09:00:00.000Z",
  "endTime": "2024-01-15T17:00:00.000Z",
  "breakMinutes": 30,
  "notes": "Updated start time",
  "changeReason": "Employee forgot to clock out, correcting based on shift schedule"
}
```

**Features:**
- Validates manager/admin permissions
- Checks department/direct report scoping for managers
- Tracks all field changes in audit logs
- Recalculates hours automatically
- Updates timesheet totals
- Marks entry as `ADJUSTED`
- Creates global audit log entry

**Response:**
```json
{
  "success": true,
  "message": "Entry updated successfully",
  "changesCount": 3
}
```

### GET `/api/timesheets/entries/[id]/audit`
**Get audit trail for a specific entry**

**Response:**
```json
{
  "auditLogs": [
    {
      "id": "audit_123",
      "field": "startTime",
      "oldValue": "2024-01-15T08:00:00.000Z",
      "newValue": "2024-01-15T09:00:00.000Z",
      "changeReason": "Employee forgot to clock out...",
      "changedAt": "2024-01-15T18:30:00.000Z",
      "ChangedBy": {
        "User": {
          "name": "Jane Manager",
          "email": "jane@company.com"
        }
      }
    }
  ]
}
```

### GET `/api/timesheets/[id]/audit`
**Get audit trail for all entries in a timesheet**

Returns complete change history for all entries in the timesheet with full details.

---

## 📱 Components

### `EditTimesheetEntryDialog.tsx`
**Modern entry editing dialog**

**Features:**
- Entry type badge display
- Original entry values for reference
- Date, time, and break minute inputs
- Real-time hour calculation
- Notes field for additional context
- **Mandatory change reason** field with compliance messaging
- Form validation with Zod
- Clean, intuitive UX

**Props:**
```typescript
interface EditTimesheetEntryDialogProps {
  entry: TimesheetEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

### `TimesheetAuditTrail.tsx`
**Timeline view of all changes**

**Features:**
- Side sheet display
- Timeline with visual indicators
- Grouped by change event
- Shows old vs new values
- Change reason highlighting
- Date/time stamps with changed by info
- Empty state for no changes

**Props:**
```typescript
interface TimesheetAuditTrailProps {
  timesheetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

---

## 🎯 User Flows

### Manager Approving Timesheet
1. Navigate to `/admin/timesheets/hub`
2. Select pending timesheet
3. Review individual entries with type badges
4. Click edit icon on any entry
5. Make necessary changes
6. Provide change reason (mandatory)
7. Save - entry marked as ADJUSTED
8. Click "View Audit Trail" to see all changes
9. Approve timesheet

### Editing Approved Timesheet
1. Navigate to `/admin/timesheets/hub`
2. Switch to "Approved" tab
3. Click edit button next to approved timesheet
4. Review entries and click edit icon
5. Make changes with mandatory reason
6. Save - audit trail updated
7. View complete history via audit trail button

### From Dashboard Action Item
1. Dashboard shows timesheet approval action item
2. Click "Review Timesheet"
3. Redirects to hub with preview parameter
4. Full editing capabilities available
5. Complete and approve

---

## 🔒 Security & Compliance

### Permission Checks
- ✅ API-level authentication required
- ✅ Employee record validation
- ✅ Role-based access control (ADMIN, MANAGER)
- ✅ Department scoping for managers
- ✅ Direct report validation for managers
- ✅ Company-level data isolation

### Audit Requirements
- ✅ Every change creates audit record
- ✅ Old and new values captured
- ✅ Change reason mandatory (finance compliance)
- ✅ Timestamp and actor tracked
- ✅ Immutable audit trail (no deletion)
- ✅ Global audit log integration

### Data Integrity
- ✅ Transaction-based updates
- ✅ Automatic hour recalculation
- ✅ Timesheet total updates
- ✅ Overtime calculation respects thresholds
- ✅ Entry type automatically set to ADJUSTED

---

## 📊 Benefits

### For Managers
- ✅ Fix employee mistakes during approval
- ✅ Clear visibility of clock vs manual entries
- ✅ Edit approved timesheets when needed
- ✅ Complete audit trail for finance queries
- ✅ One-click access from dashboard

### For Finance/HR
- ✅ Full audit trail for compliance
- ✅ Change reasons documented
- ✅ Who, what, when, why all tracked
- ✅ Queryable history in database
- ✅ Immutable change log

### For Employees
- ✅ Visual distinction of entry types
- ✅ Transparency of manager changes
- ✅ Clear reason for adjustments
- ✅ No confusion about clock vs manual entries

### For System
- ✅ Enterprise-grade audit compliance
- ✅ Scalable architecture
- ✅ Proper data isolation
- ✅ Transaction safety
- ✅ Performance optimized with indexes

---

## 🚀 Technical Highlights

### Modern Stack
- ✅ Next.js 15 App Router
- ✅ React 19 with TypeScript
- ✅ Prisma ORM with PostgreSQL
- ✅ Server Actions & API Routes
- ✅ Shadcn/ui components
- ✅ TailwindCSS styling
- ✅ Date-fns for date handling

### Best Practices
- ✅ Type-safe throughout
- ✅ Zod schema validation
- ✅ Error handling at all levels
- ✅ Loading states and feedback
- ✅ Responsive design
- ✅ Accessibility considered
- ✅ Clean component separation

### Performance
- ✅ Database indexes on audit queries
- ✅ Efficient API endpoints
- ✅ Optimistic UI updates where possible
- ✅ SWR for data fetching where applicable
- ✅ Transaction-based consistency

---

## 🎓 Example Change Reason Messages

**Good change reasons (for audit/finance):**
- "Employee forgot to clock out, correcting based on shift schedule"
- "Break duration entered incorrectly - employee confirmed 30 min break"
- "Start time adjusted to match security gate entry log"
- "Clock-out time corrected due to system malfunction at 5pm"
- "Adjusted hours to match approved overtime request"

**Bad change reasons (too vague):**
- "Fixed it"
- "Wrong"
- "Update"
- "Manager adjustment"

The system **requires** change reasons, ensuring finance and compliance can always understand why entries were modified.

---

## 📝 Summary

This implementation provides a **world-class timesheet editing experience** with:

✅ Intuitive UI with clear visual distinctions
✅ Full manager/admin editing capabilities
✅ Comprehensive audit trail for compliance
✅ Smart permission handling
✅ Automatic calculations
✅ Mobile-responsive design
✅ Enterprise-grade security
✅ Finance-ready audit logs

The system ensures that managers can efficiently correct timesheet errors while maintaining complete transparency and compliance with audit requirements.
