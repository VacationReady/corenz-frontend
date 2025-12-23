# Leave Auto-Approval Fix

## Problem
When a manager booked sick leave (or any leave) for their direct reports, the system created a PENDING request that required the manager to then go to their dashboard and approve their own submission. This created poor UX where managers had to approve leave they just booked.

## Root Cause
The auto-approval logic had a flaw:

```typescript
// OLD LOGIC
const isManagerOfEmployee = 
  session.user.role === "MANAGER" && 
  employee.User?.managerId === session.user.id;

const canAutoApprove = 
  session.user.role === "ADMIN" || 
  session.user.role === "SUPER_ADMIN" || 
  isManagerOfEmployee;
```

This logic would auto-approve when:
- User is ADMIN or SUPER_ADMIN
- User is a MANAGER and is the employee's manager

**The problem**: This didn't distinguish between:
1. A manager booking leave for their direct reports (should auto-approve)
2. A manager booking leave for themselves (should follow normal approval workflow)

## Solution
Updated the logic to check if the manager is booking for someone else:

```typescript
// NEW LOGIC
// Determine if the current user is booking leave for someone else (not themselves)
const isBookingForSomeoneElse = employee.User?.id !== session.user.id;

// Determine if the current user is a manager of this employee
const isManagerOfEmployee = 
  session.user.role === "MANAGER" && 
  employee.User?.managerId === session.user.id;

// Auto-approve immediately when:
// 1. Created by ADMIN or SUPER_ADMIN (for anyone)
// 2. Created by a MANAGER for their direct reports (not for themselves)
// Managers booking their OWN leave should follow normal approval workflow
const canAutoApprove = 
  (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") ||
  (session.user.role === "MANAGER" && isManagerOfEmployee && isBookingForSomeoneElse);
```

## Behavior After Fix

### Auto-Approved (No workflow):
- ✅ Admin booking leave for anyone
- ✅ Super Admin booking leave for anyone
- ✅ Manager booking leave for their direct reports
- ✅ Manager booking sick leave for their direct reports

### Requires Approval (Normal workflow):
- ❌ Manager booking leave for themselves
- ❌ Employee booking leave for themselves
- ❌ Manager booking leave for someone who isn't their direct report

## Additional Fix: Bulk Actions
Also updated bulk actions to default `forceApprove` to `true` since only admins can use bulk actions:

```typescript
const payloadSchema = z.object({
  // ...
  forceApprove: z.boolean().optional().default(true), // Default to auto-approve
});
```

## Files Changed
- `app/api/employees/[id]/leave-requests/route.ts` - Fixed auto-approval logic
- `app/api/bulk-actions/leave/route.ts` - Default to auto-approve for admin bulk actions

## Testing
1. As a manager, book sick leave for a direct report → Should be APPROVED immediately
2. As a manager, book annual leave for a direct report → Should be APPROVED immediately
3. As a manager, book leave for yourself → Should be PENDING (requires approval)
4. As an admin, book leave for anyone → Should be APPROVED immediately
5. As an employee, book leave for yourself → Should be PENDING (requires approval)

## Related Issues
This fix also resolves the issue where the pending sickness on Dec 23 was blocking new bookings. The pending request should never have been created in the first place - it should have been auto-approved when the manager booked it.
