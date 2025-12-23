# Admin/Manager Rule Override - Quick Start

## What Changed?

Admins and managers can now override leave booking rules with a confirmation dialog. Regular employees still have rules enforced.

## For Backend Developers

### API Changes

**Request:**
```json
POST /api/employees/{id}/leave-requests
{
  "startDate": "2024-12-17",
  "endDate": "2024-12-18",
  "eventCategoryId": "...",
  "bypassWarnings": false  // NEW: Set to true to bypass warnings
}
```

**Response (when warnings exist):**
```json
{
  "success": false,
  "requiresConfirmation": true,  // NEW: Indicates warnings need confirmation
  "warnings": [                   // NEW: Array of warnings
    {
      "code": "NOTICE_PERIOD_NOT_MET",
      "message": "This leave requires at least 7 days notice. Only 0 days notice given.",
      "severity": "warning",
      "ruleType": "notice_period"
    }
  ]
}
```

### Validation Function

```typescript
import { validateLeaveRequest, LeaveValidationWarning } from "@/lib/validateLeaveRequest";

// Returns warnings array instead of throwing errors for admins
const warnings: LeaveValidationWarning[] = await validateLeaveRequest({
  employeeId,
  eventCategoryId,
  startDate,
  endDate,
  dayType,
  isAdmin: true,           // Admin/Manager flag
  companyId,
  bypassWarnings: false,   // Set to true to skip warnings
});
```

## For Frontend Developers

### Implementation Steps

1. **Check for warnings in response:**
```typescript
const response = await fetch('/api/employees/{id}/leave-requests', {
  method: 'POST',
  body: JSON.stringify({ ...formData, bypassWarnings: false })
});

const data = await response.json();

if (data.requiresConfirmation) {
  // Show confirmation dialog with data.warnings
}
```

2. **Show confirmation dialog** (see ADMIN_OVERRIDE_UI_EXAMPLE.md)

3. **Resubmit with bypass:**
```typescript
const response = await fetch('/api/employees/{id}/leave-requests', {
  method: 'POST',
  body: JSON.stringify({ ...formData, bypassWarnings: true })
});
```

## Rules That Can Be Overridden

✅ **Notice period requirements** - Book retrospective leave
✅ **Maximum booking length** - Book longer periods
✅ **Blackout days** - Book during blackout periods
✅ **Insufficient entitlement** - Book with negative balance
✅ **Max days per period** - Exceed rolling limits

## Rules That Cannot Be Overridden

❌ **Leave overlap** - Can't have two leaves on same day
❌ **Sick leave eligibility** - Must meet 6-month requirement
❌ **Public holiday booking** - Unless employee has permission

## Testing

### Test as Admin (Should Show Warning)
```bash
# Login as ADMIN or MANAGER
# Book leave from last week
# Should see confirmation dialog
# Click "Continue Anyway"
# Should succeed
```

### Test as Employee (Should Block)
```bash
# Login as EMPLOYEE
# Try same retrospective booking
# Should get hard error (no override option)
```

## Role Behavior

| Role | Behavior |
|------|----------|
| EMPLOYEE | Hard blocks (errors) |
| MANAGER | Soft warnings (can override) |
| ADMIN | Soft warnings (can override) |
| SUPER_ADMIN | Soft warnings (can override) |

## Common Use Cases

1. **Retrospective sick leave** - Employee called in sick, admin logs it later
2. **Emergency leave** - Urgent situation requires immediate booking
3. **Correction** - Fix incorrectly booked leave
4. **Special circumstances** - Override blackout for valid reason

## Files Changed

- `app/lib/validateLeaveRequest.ts` - Core validation logic
- `app/api/employees/[id]/leave-requests/route.ts` - API endpoint
- `app/api/bulk-actions/leave/route.ts` - Bulk actions
- `RETROSPECTIVE_LEAVE_BOOKING_FIX.md` - Full documentation
- `ADMIN_OVERRIDE_UI_EXAMPLE.md` - UI implementation guide

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Frontend: Implement confirmation dialog
3. ⏳ Frontend: Update leave booking forms
4. ⏳ Testing: E2E tests for override flow
5. ⏳ Optional: Add audit logging for overrides
