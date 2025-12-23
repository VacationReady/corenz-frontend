# Admin/Manager Leave Rule Override System

## Overview
Admins and managers can now override leave booking rules (notice periods, booking length limits, blackout days, etc.) with a warning confirmation system. Regular employees still have these rules enforced as hard blocks.

## Problem Solved
Previously, admins and managers couldn't book retrospective leave or override system rules even when there was a legitimate business need (e.g., someone called in sick but the booking was logged later, emergency situations, etc.).

## Solution Architecture

### 1. Warning-Based Validation System
The `validateLeaveRequest` function now returns warnings instead of throwing errors for admins/managers:

```typescript
interface LeaveValidationWarning {
  code: string;
  message: string;
  severity: "warning" | "error";
  ruleType: "notice_period" | "max_booking_length" | "blackout_day" | "entitlement" | "overlap" | "sick_leave_eligibility" | "public_holiday" | "max_days_per_period";
}
```

### 2. Role-Based Behavior

#### Regular Employees (EMPLOYEE role)
- All rules are **hard blocks** (throw errors)
- Cannot book leave that violates:
  - Notice period requirements
  - Maximum booking length
  - Blackout days
  - Insufficient entitlement
  - Max days per period limits

#### Admins & Managers (ADMIN, SUPER_ADMIN, MANAGER roles)
- All rules become **soft warnings**
- Can override any rule with confirmation
- System shows: "This will break a [rule name] in the system. Continue with booking?"
- Must explicitly confirm to proceed

### 3. API Flow

#### First Request (without bypass)
```json
POST /api/employees/{id}/leave-requests
{
  "startDate": "2024-12-17",
  "endDate": "2024-12-18",
  "eventCategoryId": "...",
  "bypassWarnings": false
}
```

**Response with warnings:**
```json
{
  "success": false,
  "requiresConfirmation": true,
  "warnings": [
    {
      "code": "NOTICE_PERIOD_NOT_MET",
      "message": "This leave requires at least 7 days notice. Only 0 days notice given.",
      "severity": "warning",
      "ruleType": "notice_period"
    }
  ]
}
```

#### Second Request (with bypass confirmation)
```json
POST /api/employees/{id}/leave-requests
{
  "startDate": "2024-12-17",
  "endDate": "2024-12-18",
  "eventCategoryId": "...",
  "bypassWarnings": true  // User confirmed override
}
```

**Response:**
```json
{
  "success": true,
  "leaveRequestId": "..."
}
```

## Changes Made

### 1. **app/lib/validateLeaveRequest.ts**
- Changed return type from `void` to `Promise<LeaveValidationWarning[]>`
- Added `bypassWarnings` parameter
- Added `LeaveValidationWarning` interface
- Modified all validation checks to:
  - Throw errors for regular employees
  - Return warnings for admins/managers (unless `bypassWarnings=true`)

**Rules that now support admin override:**
- ✅ Notice period requirements
- ✅ Maximum booking length
- ✅ Blackout days
- ✅ Insufficient entitlement
- ✅ Max days per period limits

**Rules that remain hard blocks for everyone:**
- ❌ Leave overlap (can't have two leaves on same day)
- ❌ Sick leave eligibility (6-month requirement)
- ❌ Public holiday booking (unless employee has `canBookPublicHolidays=true`)

### 2. **app/api/employees/[id]/leave-requests/route.ts**
- Added `bypassWarnings` to request schema
- Updated validation call to include MANAGER role as admin
- Added warning response handling:
  - If warnings exist and not bypassed → return warnings for confirmation
  - If warnings bypassed → proceed with booking
- Returns `requiresConfirmation: true` with warnings array

### 3. **app/api/bulk-actions/leave/route.ts**
- Updated to pass `bypassWarnings: true` automatically
- Bulk actions by admins always bypass warnings (no confirmation needed)

## Frontend Integration (To Be Implemented)

### Confirmation Dialog Component
```typescript
interface ConfirmationDialogProps {
  warnings: LeaveValidationWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}
```

### Example UI Flow
1. User submits leave request
2. If `requiresConfirmation: true` received:
   - Show dialog: "⚠️ Rule Override Required"
   - List all warnings with clear messages
   - Show "Cancel" and "Continue Anyway" buttons
3. If user clicks "Continue Anyway":
   - Resubmit with `bypassWarnings: true`
4. If user clicks "Cancel":
   - Close dialog, allow editing

### Warning Message Examples
- **Notice Period:** "This leave requires at least 7 days notice. Only 0 days notice given."
- **Max Booking Length:** "You can only book up to 14 days at a time for this leave type. Requested 20 days."
- **Blackout Day:** "The date 2024-12-25 is blocked due to a company blackout."
- **Insufficient Entitlement:** "Insufficient entitlement: Requested 10 days, but only 5 days available (including carryover)."

## Testing

### Test as Admin (Retrospective Booking)
1. Login as ADMIN or MANAGER
2. Navigate to leave booking
3. Select a date from last week (e.g., 7 days ago)
4. Submit booking
5. ✅ Should see warning dialog
6. Click "Continue Anyway"
7. ✅ Booking should succeed

### Test as Employee (Should Block)
1. Login as EMPLOYEE
2. Try same retrospective booking
3. ✅ Should get hard error (no override option)

### Test Bulk Actions
1. Login as ADMIN
2. Use bulk leave booking
3. ✅ Should succeed without confirmation (auto-bypass)

## Benefits

1. **Flexibility for Admins/Managers**
   - Can handle emergency situations
   - Can correct past mistakes
   - Can book retrospective leave when needed

2. **Maintains Control**
   - Rules still enforced for regular employees
   - Admins must explicitly confirm overrides
   - Audit trail of rule violations

3. **Better UX**
   - Clear warning messages
   - Explicit confirmation required
   - No silent rule bypasses

4. **Backward Compatible**
   - Existing API calls work (default `bypassWarnings=false`)
   - No breaking changes to current functionality

## Future Enhancements

1. **Audit Logging**
   - Log when admins override rules
   - Track which rules were bypassed
   - Include reason for override

2. **Configurable Override Permissions**
   - Allow companies to configure which rules can be overridden
   - Role-based override permissions

3. **Warning Severity Levels**
   - Critical warnings (require reason)
   - Standard warnings (simple confirmation)
   - Info warnings (just notify, no confirmation)

## Migration Notes

- No database changes required
- No breaking API changes
- Frontend needs to implement confirmation dialog
- Existing leave bookings unaffected
