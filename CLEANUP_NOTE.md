# Employment Checks Duplication Fix

## Issue Fixed
- Employment Checks was showing twice in the employee profile navigation
- This was caused by both a built-in form template AND a dedicated component existing

## Solution Applied
1. **Removed the built-in employment-checks form template** from `app/api/forms/defaults/route.ts`
2. **Kept the functional Employment Checks component** at `app/components/employees/EmploymentChecks.tsx` which has:
   - Full API backend (`/api/employment-checks/*`)
   - Database model (`EmploymentCheck`)  
   - File upload capabilities
   - CRUD operations
   - Integration with audit logs and automation rules

## If You Have Existing Data
If there are existing "Employment Checks" forms in the database (created from the old template), you can clean them up with:

```sql
-- Find any forms with employment-checks slug
SELECT id, name, slug, companyId FROM "Form" WHERE slug = 'employment-checks';

-- Delete them (if they don't contain important data)
DELETE FROM "Form" WHERE slug = 'employment-checks';
```

The dedicated Employment Checks component will continue to work normally via `/employees/[id]/employment-checks`.
