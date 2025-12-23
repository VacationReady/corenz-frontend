# Annual Leave Balance Edit Feature - Implementation Complete

## Overview
Implemented a fully functional edit feature for the annual leave balance card on the `/leave` page. The feature allows admins and managers to adjust employee annual leave balances with proper audit logging and system-wide integration.

## Implementation Details

### 1. New Components

#### `components/leave/EditAnnualLeaveModal.tsx`
- Modern modal dialog for editing annual leave balance
- Features:
  - Real-time balance change preview
  - Input validation (non-negative, max 200 days, required reason)
  - Displays current balance and change delta
  - Mandatory reason field for audit trail
  - Loading states and error handling
  - Consistent with existing `EditOtherEntitlementsModal` design

### 2. New API Endpoint

#### `PUT /api/employees/[id]/annual-leave-balance`
- **Authorization**: Admin/Manager only
- **Tenant Isolation**: Enforced via companyId checks
- **Request Body**:
  ```json
  {
    "balanceDays": 15.5,
    "reason": "Annual leave carryover from previous year"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "balance": {
      "days": 15.5,
      "hours": 124.0,
      "previousDays": 12.5,
      "previousHours": 100.0
    },
    "message": "Annual leave balance updated successfully"
  }
  ```

#### Key Features:
- Converts days to hours (8 hours per day - NZ standard)
- Updates `Employee.annualLeaveBalance` field
- Sets `Employee.leaveBalanceLastUpdated` timestamp
- Creates audit log entry in `EmployeeAuditLog` table
- Transaction-based to ensure data consistency
- Comprehensive validation and error handling

### 3. Integration Points

#### Leave Page Updates (`app/(withSidebar)/employees/[id]/leave/page.tsx`)
- Added import for `EditAnnualLeaveModal`
- Added state: `annualLeaveModalOpen`
- Updated `handleEditAnnualLeave()` to open modal instead of showing toast
- Modal receives current balance from balances array
- Modal triggers `refresh()` on success to update all data

#### Balance Card Component
- Edit button already existed with `onEdit` callback
- Now properly wired to `handleEditAnnualLeave()`
- Only visible for annual leave balance cards
- Only shown to privileged users (admin/manager)

### 4. Data Flow

```
User clicks edit icon
  ↓
Modal opens with current balance
  ↓
User enters new balance + reason
  ↓
PUT /api/employees/[id]/annual-leave-balance
  ↓
Transaction:
  - Update Employee.annualLeaveBalance (in hours)
  - Update Employee.leaveBalanceLastUpdated
  - Create EmployeeAuditLog entry
  ↓
Success response
  ↓
Modal closes, page refreshes
  ↓
Updated balance displayed everywhere
```

### 5. System-Wide Integration

The annual leave balance is used throughout the system:

#### Read Locations:
- `/api/employees/[id]/leave-balances` - Returns balance for display
- `/api/leave-request` - Checks balance when booking leave
- `/api/payroll/export-ird` - Includes in payroll export
- `lib/payroll/payroll-calculation-service.ts` - Payroll calculations
- Report library - "Annual Leave Balances" and "Low Leave Balances" reports

#### Write Locations:
- **NEW**: `/api/employees/[id]/annual-leave-balance` - Manual adjustments
- `lib/payroll/payroll-calculation-service.ts` - Automatic accrual during payroll
- `scripts/fix-leave-entitlement-decimals.ts` - Data cleanup script

All write operations:
- Update `annualLeaveBalance` in hours (Decimal 8,2)
- Set `leaveBalanceLastUpdated` timestamp
- Are tenant-isolated via companyId checks

### 6. Audit Trail

Every balance change is logged in `EmployeeAuditLog`:
- **section**: "leave-balance"
- **field**: "annualLeaveBalance"
- **oldValue**: "12.5 days (100.00 hours)"
- **newValue**: "15.5 days (124.00 hours)"
- **reason**: User-provided reason
- **changedById**: User who made the change
- **changedAt**: Timestamp

This provides full traceability for compliance and debugging.

### 7. Security & Validation

#### Authorization:
- Only authenticated users can access
- Only admin/manager roles can edit balances
- Tenant isolation enforced at database level
- Employee must belong to same company as user

#### Validation:
- Balance must be a valid number
- Balance cannot be negative
- Balance cannot exceed 200 days (sanity check)
- Reason is mandatory (min 1 character after trim)
- All inputs sanitized and validated

#### Data Integrity:
- Transaction-based updates (atomic)
- Decimal precision maintained (8,2)
- Timestamp tracking for audit
- No orphaned records possible

### 8. User Experience

#### Visual Design:
- Consistent with existing leave page design
- Edit icon appears on hover (annual leave card only)
- Modal matches `EditOtherEntitlementsModal` styling
- Real-time balance change preview
- Clear error messages
- Loading states during save

#### Workflow:
1. User hovers over annual leave balance card
2. Edit icon appears (if user is admin/manager)
3. Click opens modal with current balance pre-filled
4. User adjusts balance and enters reason
5. Save button disabled until changes made
6. Success toast appears
7. Page refreshes to show updated balance
8. Balance updates everywhere in the system

### 9. Testing Checklist

- [x] Modal opens when edit icon clicked
- [x] Current balance displayed correctly
- [x] Balance change preview updates in real-time
- [x] Validation prevents negative values
- [x] Validation prevents values > 200 days
- [x] Validation requires reason
- [x] API endpoint enforces authorization
- [x] API endpoint enforces tenant isolation
- [x] Balance updates in database (hours)
- [x] Audit log entry created
- [x] Page refreshes after save
- [x] Balance updates in all views
- [x] Error handling works correctly
- [x] Loading states display properly

### 10. No Regressions

#### Verified No Impact On:
- Existing leave request booking flow
- Payroll calculation and accrual
- Leave balance display in other pages
- Report generation
- Sick leave balance (separate ledger system)
- Other entitlements editing
- Leave approval workflow

#### Verified Consistency With:
- Sick leave ledger pattern (audit trail)
- Other entitlements edit modal (UI/UX)
- Payroll balance updates (hours storage)
- Existing authorization patterns
- Tenant isolation patterns

## Files Created/Modified

### Created:
1. `components/leave/EditAnnualLeaveModal.tsx` - Modal component
2. `app/api/employees/[id]/annual-leave-balance/route.ts` - API endpoint
3. `ANNUAL_LEAVE_BALANCE_EDIT_IMPLEMENTATION.md` - This documentation

### Modified:
1. `app/(withSidebar)/employees/[id]/leave/page.tsx` - Integration

## Future Enhancements (Optional)

1. **Bulk Balance Adjustments**: Allow updating multiple employees at once
2. **Balance History View**: Show timeline of all balance changes
3. **Import from CSV**: Bulk import balances from spreadsheet
4. **Approval Workflow**: Require approval for large adjustments
5. **Notification**: Email employee when balance is adjusted
6. **Balance Limits**: Company-specific min/max balance rules
7. **Carryover Rules**: Automatic carryover at year-end

## Deployment Notes

- No database migrations required (uses existing fields)
- No environment variables needed
- No external dependencies added
- Backward compatible with existing data
- Can be deployed immediately

## Support & Maintenance

- Audit logs provide full traceability
- Error logging in place for debugging
- Consistent with existing patterns
- Well-documented code
- TypeScript types ensure safety

---

**Status**: ✅ Complete and Ready for Production
**Date**: December 24, 2025
**Tested**: Yes
**Documented**: Yes
