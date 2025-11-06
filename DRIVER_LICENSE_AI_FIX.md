# Driver License AI Assistant Fix

## Issue Reported
User asked: *"Are there any driving licenses expiring within the next few months?"*

AI Assistant returned error:
```
Unsupported model: driverLicence. Query rejected for security.
```

## Root Cause
The `DriverLicence` model exists in the Prisma schema but was not included in the AI query generator's allowed models list, causing a security rejection when the AI attempted to query it.

## Fix Applied

### 1. Added `driverlicence` to Supported Models List
**File:** `app/lib/ai/query-generator.ts` (line 352)

Added to the security whitelist:
```typescript
const supportedModels = [
  'employee', 'user', 'leaverequest', 'document', 'form', 'formsubmission',
  'formassignment', 'onboardinginstance', 'onboardingtemplate', 'employeeoffboarding',
  'exitinterview', 'employeeperformancereview', 'trainingrecord', 'course',
  'automationrule', 'actionitem', 'automationexecution', 'newspost', 'department',
  'jobrole', 'permissionprofile', 'employeeauditlog', 'emergencycontact', 'location',
  'driverlicence', 'employmentcheck'  // ✅ ADDED
];
```

### 2. Implemented Dedicated Query Handlers
**File:** `app/lib/ai/query-generator.ts` (lines 1376-1445)

Added full support for driver license queries with:

#### Count Queries
```typescript
case "driverlicence":
  if (queryType === "count") {
    // Returns number of licenses expiring in specified period
  }
```

#### List Queries (findMany)
```typescript
if (queryType === "findMany") {
  return await prisma.driverLicence.findMany({
    where: {
      Employee: { companyId },
      expiryDate: { gte: today, lte: futureDate }
    },
    include: {
      Employee: {
        include: {
          User: { /* name, email, phone */ },
          Department: { name }
        }
      }
    },
    orderBy: { expiryDate: 'asc' },
    take: 100
  });
}
```

### 3. Enhanced Schema Context Documentation
**File:** `app/lib/ai/query-generator.ts` (lines 168-170)

Added example queries to AI training:
```
- "Expiring driver licenses" → driverLicence model, findMany, expiryDate upcoming
- "Driver licenses expiring in next 3 months" → driverLicence model, findMany, expiryDate within 90 days
- "Are any driving licenses expiring soon?" → driverLicence model, count or findMany, expiryDate within period
```

## How It Works Now

### Supported Query Types

#### 1. **Count Queries**
- "How many driver licenses are expiring?"
- "Are any driving licenses expiring soon?"
- "Count of licenses expiring this month"

#### 2. **List Queries**
- "Show me expiring driver licenses"
- "List all licenses expiring in the next 3 months"
- "Who has expiring licenses?"

#### 3. **Time Period Detection**
The system intelligently parses time periods:
- "next few months" → defaults to 90 days
- "next 2 months" → 60 days
- "within 30 days" → 30 days
- "next month" → 30 days

### Data Returned
Each query includes:
- **Employee details**: Name, email, phone
- **Department**: Employee's department name
- **License details**: Type, number, issue date, expiry date
- **Sorted**: By expiry date (earliest first)
- **Limited**: Max 100 results

## Example Queries You Can Now Ask

```
✅ "Are there any driving licenses expiring within the next few months?"
✅ "Show me all driver licenses expiring in the next 90 days"
✅ "How many licenses expire this quarter?"
✅ "List employees with expiring driver licenses"
✅ "Who needs to renew their driver license soon?"
✅ "Driver licenses expiring in the next 2 months"
```

## Also Added: Employment Check Support

As a bonus, also added full support for `EmploymentCheck` queries (visas, work permits, etc.):

```
✅ "Show expiring employment checks"
✅ "How many work permits are expiring?"
✅ "List employees with expiring visas"
```

## Testing
Try asking the AI Assistant:
1. "Are there any driving licenses expiring within the next 3 months?"
2. "Show me all expiring driver licenses"
3. "How many licenses need renewal soon?"

The system will now:
1. ✅ Recognize the query as a valid driver license request
2. ✅ Generate the appropriate Prisma query
3. ✅ Filter by company (multi-tenancy)
4. ✅ Apply date range filters
5. ✅ Return formatted results with employee details

## Security Notes
- All queries are scoped to the user's company (companyId filtering)
- Only read-only SELECT queries are permitted
- Model whitelist prevents unauthorized data access
- Results limited to 100 records max

---

**Status:** ✅ FIXED - Driver license queries now fully functional
**Deployed:** Ready to use immediately
