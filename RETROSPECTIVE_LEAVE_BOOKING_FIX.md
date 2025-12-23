# Admin/Manager Leave Rule Override System

## Summary
Admins and managers can now override leave booking rules with a confirmation dialog. Regular employees still have rules enforced as hard blocks.

## How It Works

1. **Admin/Manager books leave that violates a rule** (e.g., retrospective sick leave)
2. **System shows confirmation dialog** with warning messages
3. **User clicks "Continue Anyway"** to proceed
4. **Leave is booked** with the rule override

## Rules That Can Be Overridden

- ✅ Notice period requirements (retrospective bookings)
- ✅ Maximum booking length limits
- ✅ Blackout days
- ✅ Insufficient entitlement
- ✅ Max days per period limits

## Rules That Cannot Be Overridden

- ❌ Leave overlap (can't have two leaves on same day)
- ❌ Sick leave eligibility (6-month requirement)
- ❌ Public holiday booking (unless employee has permission)

## Files Changed

### Backend
- `app/lib/validateLeaveRequest.ts` - Returns warnings instead of errors for admins
- `app/api/employees/[id]/leave-requests/route.ts` - Handles `bypassWarnings` parameter
- `app/api/bulk-actions/leave/route.ts` - Auto-bypasses warnings for bulk actions

### Frontend
- `app/components/leave/LeaveRuleOverrideDialog.tsx` - New confirmation dialog component
- `app/components/AddLeaveRequestDialog.tsx` - Integrated override dialog
- `app/(withSidebar)/calendar/QuickLeaveBookingModal.tsx` - Integrated override dialog

## API Changes

### Request
```json
POST /api/employees/{id}/leave-requests
{
  "startDate": "2024-12-17",
  "endDate": "2024-12-18",
  "eventCategoryId": "...",
  "bypassWarnings": false  // Set to true to bypass warnings
}
```

### Response (when warnings exist)
```json
{
  "success": false,
  "requiresConfirmation": true,
  "warnings": [
    {
      "code": "NOTICE_PERIOD_NOT_MET",
      "message": "This leave requires at least 7 days notice.",
      "severity": "warning",
      "ruleType": "notice_period"
    }
  ]
}
```

## Testing

1. Login as ADMIN or MANAGER
2. Book leave from last week (retrospective)
3. See confirmation dialog with warning
4. Click "Continue Anyway"
5. Leave should be booked successfully
