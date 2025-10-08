# Org Chart CSV Import Troubleshooting

## Problem
After CSV importing 75 employees, they show correctly in `/employees` and dashboard metrics (76 total including admin), but the org chart only displays the system admin.

## Root Cause
**Manager relationships were not established during CSV import**, causing each employee to become a separate "root" node in the org chart hierarchy. The org chart tries to render 76 separate trees instead of one unified hierarchy, which breaks the visualization.

## Why Manager Relationships Failed

Even though your CSV has `managerEmail` and `lineManagerName` columns populated, the relationships may have failed to set because:

### 1. **Import Order Issue** (Most Common)
The CSV import processes rows sequentially. If an employee's manager appears *later* in the CSV, the manager doesn't exist in the database yet when processing that employee's row.

**Example:**
```csv
firstName,lastName,email,managerEmail
Jane,Smith,jane@company.com,john@company.com  ← John doesn't exist yet!
John,Doe,john@company.com,                    ← John imported after Jane
```

**Solution:** Order your CSV so managers appear BEFORE their direct reports.

### 2. **Email Mismatch**
The `managerEmail` in your CSV must *exactly* match the manager's email in the system (case-sensitive in some databases).

**Common issues:**
- Extra spaces: `" john@company.com "` vs `"john@company.com"`
- Different domains: `john@company.com` vs `john@company.co.nz`
- Typos: `john@company.com` vs `jhon@company.com`

### 3. **Name Matching Ambiguity**
If using `lineManagerName` instead of `managerEmail`, multiple employees might match:
- "John Smith" could match multiple people
- "Smith" as a last name might match several employees

**Solution:** Always prefer `managerEmail` over `lineManagerName` for accuracy.

### 4. **Manager Not Activated**
If the manager exists but `isActivated = false`, some lookups might fail.

## How the CSV Import Handles Managers

The import has a **two-pass system**:

### Pass 1: Create Users
- Creates all user and employee records
- Skips manager assignment
- Stores manager info for later

### Pass 2: Link Managers
- After all users exist, tries to find and link managers
- Searches by `managerEmail` first, then `lineManagerName`
- **Adds warnings (not errors) if managers not found**
- Continues import even if manager links fail

**Important:** Check your import results for warnings like:
```
Row 12: Manager "john@company.com" not found. Employee imported without manager relationship.
```

## Solutions

### Quick Fix: Auto-Connect to Admin

Run this script to connect all employees without managers to your admin user:

```bash
COMPANY_ID=your-company-id npx tsx scripts/connect-orphaned-employees.ts
```

This creates a flat hierarchy with all employees reporting to admin, which:
- ✅ Makes org chart visible immediately
- ✅ You can manually reassign correct managers after
- ✅ Non-destructive (doesn't change existing relationships)

### Diagnostic: Check What Went Wrong

```bash
COMPANY_ID=your-company-id npx tsx scripts/diagnose-org-chart.ts
```

Shows:
- How many employees lack managers
- Which specific employees have no manager
- Recent CSV import warnings
- Circular reference issues

### Proper Fix: Re-Import with Correct Order

1. **Export current data** (backup):
   ```sql
   SELECT * FROM "User" WHERE "companyId" = 'your-company-id';
   ```

2. **Order CSV correctly**:
   - CEO/Top-level first (no manager)
   - Then managers (reporting to CEO)
   - Then employees (reporting to managers)

3. **Use exact email addresses**:
   ```csv
   firstName,lastName,email,managerEmail
   Sarah,CEO,sarah@company.com,
   John,Manager,john@company.com,sarah@company.com
   Jane,Employee,jane@company.com,john@company.com
   ```

4. **Enable updates** when re-importing:
   - Check "Allow updates for existing employees"
   - This updates manager relationships without creating duplicates

### Manual Fix: Set Managers in UI

Go to each employee's profile and manually set their manager using the UI.

## Preventing Future Issues

### CSV Best Practices

1. **Always use `managerEmail` column** (more reliable than names)

2. **Import in hierarchical order**:
   ```
   Level 1: CEO/Admins (no manager)
   Level 2: Department heads (report to CEO)
   Level 3: Team leads (report to dept heads)
   Level 4: Individual contributors (report to team leads)
   ```

3. **Verify email addresses** match exactly (no typos, extra spaces)

4. **Check import warnings** after upload - warnings tell you which manager relationships failed

5. **Test with small sample first** - Import 5-10 employees to verify structure works

### Recommended CSV Structure

```csv
firstName,lastName,email,phoneNumber,departmentName,jobRoleName,managerEmail,startDate
Sarah,Johnson,sarah.j@company.com,+64211234567,Executive,CEO,,2020-01-01
John,Smith,john.s@company.com,+64211234568,Engineering,CTO,sarah.j@company.com,2020-02-01
Jane,Doe,jane.d@company.com,+64211234569,Engineering,Engineer,john.s@company.com,2021-03-15
```

## Verification

After applying any fix, verify the org chart works:

1. **Check database**:
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT("managerId") as with_manager,
     COUNT(*) - COUNT("managerId") as without_manager
   FROM "User"
   WHERE "companyId" = 'your-company-id'
     AND "isActivated" = true
     AND role != 'SUPER_ADMIN';
   ```

   Expected: `without_manager` should be 0 or 1 (just CEO/top-level)

2. **Refresh org chart page** - All 76 employees should now be visible

3. **Check for warnings** - No more "employee imported without manager" messages

## Technical Details

### Org Chart Tree Building Logic

```typescript
// From OrgChartPageClient.tsx, lines 396-418
nodes.forEach((node) => {
  const managerId = node.managerUserId;
  
  if (!managerId || managerId === node.userId) {
    // No manager = ROOT NODE (separate tree)
    roots.push(node);
    return;
  }
  
  const managerNode = findManager(managerId);
  
  if (managerNode) {
    // Has manager = CHILD NODE (connected to tree)
    managerNode.children.push(node);
  } else {
    // Manager not found = ROOT NODE (orphaned)
    roots.push(node);
  }
});
```

If 75 employees have no `managerId`, you get 76 root nodes (75 employees + 1 admin), which breaks the chart rendering.

### Why Total Shows 76 But Chart Shows 1

The API returns all 76 users, and the page calculates `totalEmployees = 76`. However:

1. The org chart tries to render 76 separate trees
2. Without proper positioning, they overlap or render off-screen
3. Only the first tree (admin) is visible
4. The rest are technically rendered but not visible in the viewport

## Related Files

- `/app/api/org-chart/route.ts` - API that fetches users
- `/app/(withSidebar)/org-chart/OrgChartPageClient.tsx` - Tree building logic
- `/app/api/csv-import/employees/route.ts` - Import with two-pass manager linking
- `/scripts/connect-orphaned-employees.ts` - Quick fix script
- `/scripts/diagnose-org-chart.ts` - Diagnostic script

## Support

If issues persist:
1. Run diagnostic script and share output
2. Check browser console for errors
3. Verify CSV format matches template
4. Check recent audit logs for import warnings
