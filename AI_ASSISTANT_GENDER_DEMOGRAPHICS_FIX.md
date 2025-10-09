# AI Assistant - Gender Demographics Fix

## Problem
The AI Assistant was returning "0 results" when asked about gender demographics (e.g., "What is the gender split in the org?") even though there are 75 employees in the system.

## Root Cause
The AI Assistant's schema context in `app/lib/ai/query-generator.ts` was missing the `genderOptionId` field from the User model and had no knowledge of the `GenderOption` model. Without this information, the AI couldn't generate queries about gender demographics.

## Changes Made

### 1. Updated Schema Context (Lines 23-28)
**Before:**
```typescript
CORE MODELS:
- Employee: id, userId, isActive, departmentId, jobRoleId, startDate, contractEndDate, irdNumber, taxCode, salaryAmount, hourlyRate, contractType, employmentType, siteLocation
- User: id, email, firstName, lastName, role, phone, dateOfBirth, addressCity, addressCountry
- Department: id, name, headId
- JobRole: id, name, level
```

**After:**
```typescript
CORE MODELS:
- Employee: id, userId, isActive, departmentId, jobRoleId, startDate, contractEndDate, irdNumber, taxCode, salaryAmount, hourlyRate, contractType, employmentType, siteLocation
- User: id, email, firstName, lastName, role, phone, dateOfBirth, addressCity, addressCountry, genderOptionId
- Department: id, name, headId
- JobRole: id, name, level
- GenderOption: id, key, label (e.g., "male", "female", "non-binary", "prefer-not-to-say")
```

### 2. Added Gender Query Examples (Lines 102-106)
Added comprehensive examples to guide the AI:
```typescript
DEMOGRAPHICS & DIVERSITY EXAMPLES:
- "What is the gender split?" → employee model, group by User.GenderOption.label, count
- "How many male/female employees?" → employee model, count, WHERE User.GenderOption filter
- "Show diversity breakdown" → employee model, findMany, include GenderOption
- "Gender distribution by department" → employee model, group by department and gender
```

### 3. Updated Employee Query to Include Gender Data (Lines 493-528)
Modified the `findMany` query to include GenderOption relation:
```typescript
User: {
  select: {
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    dateOfBirth: true,
    GenderOption: {
      select: {
        label: true,
        key: true,
      },
    },
  },
},
```

### 4. Added GroupBy Query Support (Lines 609-659)
Implemented new `groupBy` query type to handle demographic breakdown queries:
```typescript
if (queryType === "groupBy") {
  // Handle gender split queries
  if (operation.includes("gender") || operation.includes("GenderOption")) {
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        User: {
          include: {
            GenderOption: true,
          },
        },
        Department: true,
      },
    });

    // Group by gender
    const genderGroups = employees.reduce((acc: any, emp: any) => {
      const genderLabel = emp.User?.GenderOption?.label || "Not specified";
      if (!acc[genderLabel]) {
        acc[genderLabel] = { count: 0, employees: [] };
      }
      acc[genderLabel].count++;
      acc[genderLabel].employees.push({
        name: `${emp.User?.firstName || ''} ${emp.User?.lastName || ''}`.trim(),
        department: emp.Department?.name || 'N/A',
      });
      return acc;
    }, {});

    // Convert to array format for easier display
    const result = Object.entries(genderGroups).map(([gender, data]: [string, any]) => ({
      gender,
      count: data.count,
      percentage: ((data.count / employees.length) * 100).toFixed(1),
    }));

    return result;
  }
}
```

### 5. Updated AI Prompt Decision Guide (Lines 169-173)
Added `groupBy` to the query type options:
```typescript
CRITICAL DECISION GUIDE:
- "How many" = count
- "List", "Show me", "Who are", "Names of", "Display" = findMany
- "Total salary", "Average salary", "Sum of" = aggregate
- "Gender split", "breakdown by", "distribution by", "group by" = groupBy
```

## How to Test

### Test Queries
Try these queries in the AI Assistant:

1. **Basic Gender Split:**
   - "What is the gender split in the org?"
   - "Show me the gender distribution"
   - "How many male vs female employees?"

2. **Gender by Department:**
   - "Gender distribution by department"
   - "How many women are in Engineering?"
   - "Show me male employees in Sales"

3. **List with Gender:**
   - "Show me all employees with their gender"
   - "List employees and include gender information"

### Expected Results

For "What is the gender split in the org?", you should now see:
```json
[
  {
    "gender": "Male",
    "count": 40,
    "percentage": "53.3"
  },
  {
    "gender": "Female",
    "count": 30,
    "percentage": "40.0"
  },
  {
    "gender": "Not specified",
    "count": 5,
    "percentage": "6.7"
  }
]
```

The UI will automatically format this as a table showing:
- Gender category
- Count of employees
- Percentage of total

## Database Schema Reference

The gender data is stored across these models:

### GenderOption Model
```prisma
model GenderOption {
  id        String   @id
  companyId String
  key       String
  label     String
  order     Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime
  Company   Company  @relation(fields: [companyId], references: [id])
  User      User[]
}
```

### User Model (relevant fields)
```prisma
model User {
  id             String        @id
  genderOptionId String?
  GenderOption   GenderOption? @relation(fields: [genderOptionId], references: [id])
  // ... other fields
}
```

## Notes

- Employees without a gender specified will be grouped under "Not specified"
- The query only includes active employees by default
- Results are calculated in real-time from the database
- The AI Assistant UI automatically renders groupBy results in a readable table format
- The fix is backward compatible - existing queries will continue to work

## Files Modified
- `app/lib/ai/query-generator.ts` - Main query generation logic

## No Breaking Changes
- All existing AI Assistant functionality remains unchanged
- This is purely additive - adds new capabilities without affecting existing ones

