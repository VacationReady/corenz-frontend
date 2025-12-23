# Annual Leave Balance Edit - System Architecture

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Leave Page (/employees/[id]/leave)          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Leave Balances Section                       │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │ Annual Leave│  │ Sick Leave  │  │   Other     │     │  │
│  │  │   Card      │  │    Card     │  │ Entitlements│     │  │
│  │  │             │  │             │  │    Card     │     │  │
│  │  │  12.5 days  │  │  10.0 days  │  │  3 items    │     │  │
│  │  │     [✏️]     │  │             │  │     [✏️]     │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │         │                                    │           │  │
│  │         │ onClick                            │           │  │
│  │         ▼                                    ▼           │  │
│  │  handleEditAnnualLeave()      handleEditOtherEntitlements│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                        │                           │
                        │                           │
                        ▼                           ▼
        ┌───────────────────────────┐   ┌──────────────────────────┐
        │ EditAnnualLeaveModal      │   │ EditOtherEntitlementsModal│
        │                           │   │                           │
        │ ┌───────────────────────┐ │   │ (Existing Component)     │
        │ │ Current: 12.5 days    │ │   │                           │
        │ │ New: [15.5] days      │ │   └──────────────────────────┘
        │ │ Change: +3.0 days     │ │
        │ │                       │ │
        │ │ Reason: [________]    │ │
        │ │                       │ │
        │ │ [Cancel] [Save]       │ │
        │ └───────────────────────┘ │
        └───────────────────────────┘
                        │
                        │ PUT Request
                        ▼
        ┌───────────────────────────────────────────────────┐
        │  API: /api/employees/[id]/annual-leave-balance    │
        │                                                   │
        │  1. Authenticate user                             │
        │  2. Authorize (admin/manager only)                │
        │  3. Validate employee (tenant isolation)          │
        │  4. Validate input (balance, reason)              │
        │  5. Convert days → hours (× 8)                    │
        │  6. Transaction:                                  │
        │     ├─ Update Employee.annualLeaveBalance         │
        │     ├─ Update Employee.leaveBalanceLastUpdated    │
        │     └─ Create EmployeeAuditLog entry              │
        │  7. Return success response                       │
        └───────────────────────────────────────────────────┘
                        │
                        │ Database Transaction
                        ▼
        ┌───────────────────────────────────────────────────┐
        │              Database (PostgreSQL)                │
        │                                                   │
        │  ┌─────────────────────────────────────────────┐ │
        │  │ Employee Table                              │ │
        │  │ ┌─────────────────────────────────────────┐ │ │
        │  │ │ id: abc-123                             │ │ │
        │  │ │ annualLeaveBalance: 124.0 (hours)       │ │ │
        │  │ │ leaveBalanceLastUpdated: 2025-12-24     │ │ │
        │  │ └─────────────────────────────────────────┘ │ │
        │  └─────────────────────────────────────────────┘ │
        │                                                   │
        │  ┌─────────────────────────────────────────────┐ │
        │  │ EmployeeAuditLog Table                      │ │
        │  │ ┌─────────────────────────────────────────┐ │ │
        │  │ │ section: "leave-balance"                │ │ │
        │  │ │ field: "annualLeaveBalance"             │ │ │
        │  │ │ oldValue: "12.5 days (100.00 hours)"    │ │ │
        │  │ │ newValue: "15.5 days (124.00 hours)"    │ │ │
        │  │ │ reason: "Annual leave carryover..."     │ │ │
        │  │ │ changedById: user-xyz                   │ │ │
        │  │ │ changedAt: 2025-12-24 10:30:00          │ │ │
        │  │ └─────────────────────────────────────────┘ │ │
        │  └─────────────────────────────────────────────┘ │
        └───────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────┐
│  User    │
│ (Admin/  │
│ Manager) │
└────┬─────┘
     │
     │ 1. Navigate to /employees/[id]/leave
     ▼
┌─────────────────┐
│  Leave Page     │
│  Component      │
└────┬────────────┘
     │
     │ 2. Fetch balances
     │    GET /api/employees/[id]/leave-balances
     ▼
┌─────────────────┐
│  API Endpoint   │
│  (GET)          │
└────┬────────────┘
     │
     │ 3. Query database
     ▼
┌─────────────────┐
│  Database       │
│  Employee table │
│  annualLeave    │
│  Balance: 100h  │
└────┬────────────┘
     │
     │ 4. Return balance (12.5 days)
     ▼
┌─────────────────┐
│  Leave Page     │
│  Displays:      │
│  Annual Leave   │
│  12.5 days [✏️]  │
└────┬────────────┘
     │
     │ 5. User clicks edit icon
     ▼
┌─────────────────┐
│  Modal Opens    │
│  Current: 12.5  │
│  New: [____]    │
│  Reason: [___]  │
└────┬────────────┘
     │
     │ 6. User enters 15.5 days + reason
     │    Clicks Save
     ▼
┌─────────────────┐
│  Modal          │
│  Validates      │
│  Client-side    │
└────┬────────────┘
     │
     │ 7. PUT /api/employees/[id]/annual-leave-balance
     │    { balanceDays: 15.5, reason: "..." }
     ▼
┌─────────────────┐
│  API Endpoint   │
│  (PUT)          │
│  - Auth check   │
│  - Validate     │
│  - Convert to h │
└────┬────────────┘
     │
     │ 8. Transaction START
     ▼
┌─────────────────────────────────────┐
│  Database Transaction               │
│                                     │
│  UPDATE Employee                    │
│  SET annualLeaveBalance = 124.0,    │
│      leaveBalanceLastUpdated = NOW()│
│  WHERE id = 'abc-123'               │
│                                     │
│  INSERT INTO EmployeeAuditLog       │
│  VALUES (...)                       │
│                                     │
│  COMMIT                             │
└────┬────────────────────────────────┘
     │
     │ 9. Success response
     ▼
┌─────────────────┐
│  Modal          │
│  Shows success  │
│  Closes         │
└────┬────────────┘
     │
     │ 10. Trigger refresh()
     ▼
┌─────────────────┐
│  Leave Page     │
│  Re-fetches     │
│  balances       │
└────┬────────────┘
     │
     │ 11. GET /api/employees/[id]/leave-balances
     ▼
┌─────────────────┐
│  Database       │
│  Returns new    │
│  balance: 124h  │
└────┬────────────┘
     │
     │ 12. Display updated balance
     ▼
┌─────────────────┐
│  Leave Page     │
│  Annual Leave   │
│  15.5 days [✏️]  │
└─────────────────┘
```

## Authorization Flow

```
┌──────────────┐
│ User Request │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Session Check        │
│ - Is authenticated?  │
└──────┬───────────────┘
       │
       ├─ No ──→ 401 Unauthorized
       │
       ▼ Yes
┌──────────────────────┐
│ Role Check           │
│ - Is Admin/Manager?  │
└──────┬───────────────┘
       │
       ├─ No ──→ 403 Forbidden
       │
       ▼ Yes
┌──────────────────────┐
│ Tenant Check         │
│ - Same companyId?    │
└──────┬───────────────┘
       │
       ├─ No ──→ 403 Forbidden
       │
       ▼ Yes
┌──────────────────────┐
│ Process Request      │
│ - Update balance     │
│ - Create audit log   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 200 Success          │
└──────────────────────┘
```

## Validation Flow

```
Client-Side Validation
┌─────────────────────┐
│ User Input          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Is valid number?    │
├─────────────────────┤
│ balanceDays >= 0?   │
├─────────────────────┤
│ balanceDays <= 200? │
├─────────────────────┤
│ reason.length > 0?  │
└──────┬──────────────┘
       │
       ├─ Fail ──→ Show error message
       │
       ▼ Pass
┌─────────────────────┐
│ Enable Save button  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Send to API         │
└─────────────────────┘

Server-Side Validation
┌─────────────────────┐
│ API receives data   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ typeof number?      │
├─────────────────────┤
│ !isNaN()?           │
├─────────────────────┤
│ >= 0?               │
├─────────────────────┤
│ <= 200?             │
├─────────────────────┤
│ reason is string?   │
├─────────────────────┤
│ reason.trim() > 0?  │
└──────┬──────────────┘
       │
       ├─ Fail ──→ 400 Bad Request
       │
       ▼ Pass
┌─────────────────────┐
│ Process update      │
└─────────────────────┘
```

## Integration Points

```
┌────────────────────────────────────────────────────────────┐
│                  Annual Leave Balance                      │
│                  (Employee.annualLeaveBalance)             │
└────────────────────┬───────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Read    │  │  Write   │  │  Display │
│  Points  │  │  Points  │  │  Points  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     │             │             │
     ▼             ▼             ▼

READ POINTS:
├─ GET /api/employees/[id]/leave-balances
├─ GET /api/leave-request (check balance)
├─ GET /api/payroll/export-ird
├─ lib/payroll/payroll-calculation-service.ts
└─ Reports: Annual Leave Balances, Low Leave Balances

WRITE POINTS:
├─ PUT /api/employees/[id]/annual-leave-balance (NEW)
├─ lib/payroll/payroll-calculation-service.ts (accrual)
└─ scripts/fix-leave-entitlement-decimals.ts (cleanup)

DISPLAY POINTS:
├─ /employees/[id]/leave (balance cards)
├─ /employees/[id]/overview (quick info)
├─ /dashboard/employee (widget)
├─ /dashboard/manager (team view)
├─ Leave request dialogs (available balance)
├─ Reports (various)
└─ Mobile app (after sync)
```

## Error Handling Flow

```
┌──────────────┐
│ User Action  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Try: API Request     │
└──────┬───────────────┘
       │
       ├─ Network Error ──→ Show "Failed to update. Try again."
       │
       ├─ 400 Bad Request ──→ Show validation error message
       │
       ├─ 401 Unauthorized ──→ Redirect to login
       │
       ├─ 403 Forbidden ──→ Show "Permission denied"
       │
       ├─ 404 Not Found ──→ Show "Employee not found"
       │
       ├─ 500 Server Error ──→ Show "Server error. Try again."
       │
       ▼ 200 Success
┌──────────────────────┐
│ Show success toast   │
│ Close modal          │
│ Refresh data         │
└──────────────────────┘
```

## Audit Trail Architecture

```
Every Balance Change Creates:

┌─────────────────────────────────────────────────────────┐
│ EmployeeAuditLog Entry                                  │
├─────────────────────────────────────────────────────────┤
│ id: uuid                                                │
│ companyId: tenant-id                                    │
│ employeeId: employee-id                                 │
│ section: "leave-balance"                                │
│ field: "annualLeaveBalance"                             │
│ oldValue: "12.5 days (100.00 hours)"                    │
│ newValue: "15.5 days (124.00 hours)"                    │
│ reason: "Annual leave carryover from 2024"              │
│ changedById: admin-user-id                              │
│ changedAt: 2025-12-24T10:30:00Z                         │
└─────────────────────────────────────────────────────────┘

Query Audit History:
SELECT * FROM EmployeeAuditLog
WHERE employeeId = 'abc-123'
  AND section = 'leave-balance'
ORDER BY changedAt DESC;

Result:
┌──────────────┬─────────────┬─────────────┬──────────────┐
│ Changed At   │ Old Value   │ New Value   │ Changed By   │
├──────────────┼─────────────┼─────────────┼──────────────┤
│ 2025-12-24   │ 12.5 days   │ 15.5 days   │ admin@co.com │
│ 2025-11-30   │ 10.0 days   │ 12.5 days   │ hr@co.com    │
│ 2025-10-15   │ 8.0 days    │ 10.0 days   │ admin@co.com │
└──────────────┴─────────────┴─────────────┴──────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                            │
├─────────────────────────────────────────────────────────┤
│ - React 18                                              │
│ - Next.js 14 (App Router)                               │
│ - TypeScript                                            │
│ - Tailwind CSS                                          │
│ - Framer Motion (animations)                            │
│ - Shadcn/ui (components)                                │
│ - React Hook Form (validation)                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Backend                             │
├─────────────────────────────────────────────────────────┤
│ - Next.js API Routes                                    │
│ - NextAuth.js (authentication)                          │
│ - Prisma ORM                                            │
│ - PostgreSQL                                            │
│ - Transaction support                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Security                            │
├─────────────────────────────────────────────────────────┤
│ - Role-based access control (RBAC)                      │
│ - Tenant isolation (multi-tenancy)                      │
│ - Input validation (client + server)                    │
│ - SQL injection prevention (Prisma)                     │
│ - XSS prevention (React)                                │
│ - CSRF protection (NextAuth)                            │
└─────────────────────────────────────────────────────────┘
```

---

**Architecture Status**: ✅ Complete and Production Ready
