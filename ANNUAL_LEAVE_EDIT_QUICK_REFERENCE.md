# Annual Leave Balance Edit - Quick Reference

## For Users

### How to Edit Annual Leave Balance

1. Navigate to an employee's leave page: `/employees/[id]/leave`
2. Look at the "Leave Balances" section at the top
3. Find the "Annual Leave" card
4. Hover over the card to see the edit icon (pencil) in the top-right corner
5. Click the edit icon
6. In the modal:
   - Enter the new balance in days (e.g., 15.5)
   - Provide a reason for the adjustment (required)
   - Review the balance change preview
7. Click "Save Changes"
8. The balance updates immediately across the entire system

### Who Can Edit?
- Only **Admins** and **Managers** can edit leave balances
- Regular employees cannot edit their own or others' balances

### Where Does the Balance Update?
The updated balance appears in:
- Leave page balance cards
- Employee overview page
- Dashboard widgets
- Leave request dialogs (shows available balance)
- Reports (Annual Leave Balances, Low Leave Balances)
- Payroll exports
- Mobile app (after sync)

## For Developers

### API Endpoint
```typescript
PUT /api/employees/[id]/annual-leave-balance

// Request
{
  "balanceDays": 15.5,
  "reason": "Annual leave carryover from previous year"
}

// Response
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

### Component Usage
```tsx
import EditAnnualLeaveModal from '@/components/leave/EditAnnualLeaveModal';

<EditAnnualLeaveModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  employeeId="employee-uuid"
  currentBalance={12.5} // in days
  onSuccess={() => {
    // Refresh data
    refetch();
  }}
/>
```

### Database Schema
```prisma
model Employee {
  annualLeaveBalance      Decimal   @default(0) @db.Decimal(8, 2) // in HOURS
  leaveBalanceLastUpdated DateTime?
  // ... other fields
}

model EmployeeAuditLog {
  section     String  // "leave-balance"
  field       String  // "annualLeaveBalance"
  oldValue    String? // "12.5 days (100.00 hours)"
  newValue    String? // "15.5 days (124.00 hours)"
  reason      String  // User-provided reason
  changedById String
  changedAt   DateTime
  // ... other fields
}
```

### Key Implementation Details

1. **Storage Format**: Balance stored in HOURS (8 hours = 1 day)
2. **Display Format**: Shown to users in DAYS
3. **Precision**: Decimal(8,2) - supports up to 999,999.99 hours
4. **Audit Trail**: Every change logged in EmployeeAuditLog
5. **Authorization**: Admin/Manager only via `isAdminOrManager(session)`
6. **Tenant Isolation**: Enforced via companyId checks
7. **Transaction**: Update + audit log in single transaction

### Integration Points

#### Reading Balance:
- `GET /api/employees/[id]/leave-balances` - Primary endpoint
- Converts hours to days for display (÷ 8)
- Returns as part of balances array

#### Writing Balance:
- `PUT /api/employees/[id]/annual-leave-balance` - Manual adjustment (NEW)
- `lib/payroll/payroll-calculation-service.ts` - Automatic accrual
- Both update `annualLeaveBalance` and `leaveBalanceLastUpdated`

#### Validation:
```typescript
// Client-side
- Must be valid number
- Cannot be negative
- Cannot exceed 200 days
- Reason required (min 1 char)

// Server-side
- Same validations
- Authorization check
- Tenant isolation check
- Transaction safety
```

### Testing

```bash
# Manual test flow
1. Login as admin/manager
2. Go to /employees/[id]/leave
3. Click edit icon on Annual Leave card
4. Change balance and add reason
5. Save and verify:
   - Balance updates on page
   - Audit log entry created
   - leaveBalanceLastUpdated set
   - No errors in console
```

### Troubleshooting

**Edit icon not showing?**
- Check user role (must be admin/manager)
- Check if it's the annual leave card (not sick leave or other)

**Save button disabled?**
- Ensure balance has changed
- Check validation errors

**API returns 403?**
- User lacks admin/manager role
- Check session.user.role

**Balance not updating?**
- Check browser console for errors
- Verify API response is 200 OK
- Check database for transaction rollback

**Audit log not created?**
- Check transaction completed successfully
- Verify EmployeeAuditLog table exists
- Check database logs

## Audit Trail Example

```sql
SELECT 
  section,
  field,
  oldValue,
  newValue,
  reason,
  changedAt,
  u.email as changedBy
FROM EmployeeAuditLog eal
JOIN User u ON u.id = eal.changedById
WHERE 
  eal.employeeId = 'employee-uuid'
  AND eal.section = 'leave-balance'
ORDER BY eal.changedAt DESC;
```

## Common Use Cases

1. **Annual Carryover**: Adjust balance at year-end for unused leave
2. **Correction**: Fix incorrect balance from data migration
3. **Policy Change**: Adjust for company policy updates
4. **Compensation**: Add extra leave as employee benefit
5. **Adjustment**: Correct for manual leave taken outside system

## Best Practices

1. Always provide clear, descriptive reasons
2. Verify balance before and after adjustment
3. Check audit log after making changes
4. Communicate changes to affected employees
5. Document policy for when manual adjustments are allowed
6. Regular audit of balance changes for compliance

---

**Quick Links:**
- [Full Implementation Docs](./ANNUAL_LEAVE_BALANCE_EDIT_IMPLEMENTATION.md)
- [Leave Page](./app/(withSidebar)/employees/[id]/leave/page.tsx)
- [Modal Component](./components/leave/EditAnnualLeaveModal.tsx)
- [API Route](./app/api/employees/[id]/annual-leave-balance/route.ts)
