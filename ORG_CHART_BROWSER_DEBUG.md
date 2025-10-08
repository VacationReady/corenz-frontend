# Org Chart Browser Debugging Guide

Since your User table has all the correct `managerId` values but the org chart still only shows 1 person, let's debug what the frontend is actually receiving.

## Step 1: Check the API Response

1. Open your org chart page: `/org-chart`
2. Open **Browser DevTools** (F12)
3. Go to **Network** tab
4. Refresh the page
5. Look for the request to `/api/org-chart`
6. Click on it and view the **Response**

### What to Check:

**Question 1:** How many users are in the response?
- Expected: 76 users
- If less: The API is filtering some out

**Question 2:** Do the users have `managerUserId` set?
- Look at a few users in the response
- Check if `managerUserId` is `null` or has a value
- Example of what you should see:
```json
[
  {
    "id": "emp-123",
    "userId": "user-456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@company.com",
    "managerUserId": "user-789",  // ← Should have a value
    ...
  }
]
```

**Question 3:** Do the `managerUserId` values exist in the response?
- Copy a `managerUserId` value
- Search (Ctrl+F) for that ID in the response
- It should appear as someone's `userId`
- If not found: **This is the problem!**

## Step 2: Check Frontend Console

1. In **Console** tab, run this:
```javascript
// Check if data is loaded
const data = window.localStorage.getItem('orgChartDebug');
console.log('Employees loaded:', data ? JSON.parse(data).length : 'none');
```

2. Add this debug code temporarily to OrgChartPageClient.tsx after line 427:

```typescript
console.log('🌳 Org Forest Debug:', {
  totalNodes: normalizedEmployees.length,
  rootNodes: orgForest.length,
  roots: orgForest.map(r => ({ 
    name: r.fullName, 
    email: r.email,
    children: r.children.length 
  }))
});
```

This will show you:
- How many root nodes (should be 1-2, not 76)
- Which users are roots
- How many children each root has

## Step 3: Run Backend Debug Script

In your terminal:

```bash
COMPANY_ID=your-company-id npx tsx scripts/debug-org-chart-data.ts
```

This will show:
- ✅ How many users have `managerId` set
- ⚠️  Any invalid manager references (managerId points to non-existent user)
- 🌳 How many root nodes the tree would have
- 📤 Preview of what the API returns

## Common Issues & Solutions

### Issue 1: Manager IDs Don't Exist
**Symptom:** API returns 76 users, but many `managerUserId` values don't exist in the dataset

**Cause:** The `managerId` in your User table might be pointing to:
- Employee IDs instead of User IDs
- Old/deleted user IDs
- IDs from a different company

**Solution:**
```sql
-- Check for invalid manager references
SELECT 
  u.email,
  u."managerId" as manager_id,
  m.email as manager_email
FROM "User" u
LEFT JOIN "User" m ON u."managerId" = m.id
WHERE u."companyId" = 'YOUR_COMPANY_ID'
  AND u."managerId" IS NOT NULL
  AND m.id IS NULL;  -- Manager doesn't exist
```

### Issue 2: Circular References
**Symptom:** Two employees are each other's managers

**Check:**
```sql
SELECT 
  u1.email as employee,
  u2.email as manager
FROM "User" u1
JOIN "User" u2 ON u1."managerId" = u2.id
WHERE u2."managerId" = u1.id
  AND u1."companyId" = 'YOUR_COMPANY_ID';
```

### Issue 3: Employee ID vs User ID Confusion
**Symptom:** `managerId` contains Employee IDs instead of User IDs

**Check:**
```sql
-- See if managerId matches any Employee.id (it shouldn't!)
SELECT 
  u.email,
  u."managerId",
  e.id as employee_id
FROM "User" u
JOIN "Employee" e ON u."managerId" = e.id
WHERE u."companyId" = 'YOUR_COMPANY_ID'
  AND u."managerId" IS NOT NULL;
```

If this returns rows, that's your problem! The `managerId` field should contain User IDs, not Employee IDs.

**Fix:**
```sql
-- Update to use User IDs instead of Employee IDs
UPDATE "User" u
SET "managerId" = e."userId"
FROM "Employee" e
WHERE u."managerId" = e.id
  AND u."companyId" = 'YOUR_COMPANY_ID';
```

### Issue 4: Case Sensitivity
**Symptom:** IDs have mismatched casing (unlikely but possible)

**Check:** Compare IDs in the browser response carefully

### Issue 5: Frontend Filtering
**Symptom:** API returns 76 users but frontend only processes some

Add this debug after line 370 in OrgChartPageClient.tsx:
```typescript
console.log('📊 Normalization:', {
  rawEmployees: rawEmployees.length,
  normalized: normalizedEmployees.length,
  sample: normalizedEmployees.slice(0, 3).map(e => ({
    name: e.fullName,
    managerId: e.managerUserId
  }))
});
```

## Quick Fixes

### If Manager IDs are Employee IDs (most likely):
```bash
COMPANY_ID=your-company-id npx tsx scripts/fix-manager-id-type.ts
```

### If Manager IDs are invalid:
```bash
COMPANY_ID=your-company-id npx tsx scripts/connect-orphaned-employees.ts
```

## Report Format

When reporting the issue, please provide:

1. **Network Response Sample:**
```json
{
  "totalUsers": 76,
  "sampleUser": {
    "userId": "...",
    "managerUserId": "...",
    ...
  }
}
```

2. **Debug Script Output:**
```
Total Users: 76
Valid manager references: ...
Invalid manager references: ...
Root nodes: ...
```

3. **Console Output:**
```
Org Forest Debug: {
  totalNodes: 76,
  rootNodes: ...,
  ...
}
```

This will help identify exactly where the disconnect is happening!
