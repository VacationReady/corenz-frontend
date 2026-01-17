# Mobile Documents Debugging Guide

## Issue
Alex Ward has 13 documents in the database but the mobile app shows "no documents".

## What We Know
- ✅ Alex Ward's employee ID: `e24bdcf4-abb7-48c5-9221-75911f75d5a2`
- ✅ Alex Ward's user ID: `4991d6be-3b20-4e1e-ac42-40be14a2285e`
- ✅ All 13 documents have `canViewEmployee: true`
- ✅ API endpoint `/api/documents/list-employee` is correctly implemented
- ✅ Supabase is configured correctly

## Testing Steps

### 1. Check Backend Logs
When you open the Documents screen in the mobile app as Alex Ward, you should see logs like:

```
[list-employee] Request received: { hasSession: true, userId: '...', ... }
[list-employee] Request params: { employeeId: 'e24bdcf4-abb7-48c5-9221-75911f75d5a2', ... }
[list-employee] Viewer check: { viewerEmployeeId: '...', isViewingOwnDocuments: true, ... }
[list-employee] Where clause: { ... }
[list-employee] Total count: 13
[list-employee] Returning documents: { count: 13, ... }
```

### 2. Check Mobile App Logs
In the mobile app console (React Native debugger or Expo logs), you should see:

```
[DocumentsScreen] Fetching employee profile...
[DocumentsScreen] Profile received: { hasProfile: true, employeeId: '...', ... }
[DocumentsScreen] Loading documents for employee: e24bdcf4-abb7-48c5-9221-75911f75d5a2
[getEmployeeDocuments] Fetching documents for employee: e24bdcf4-abb7-48c5-9221-75911f75d5a2
[getEmployeeDocuments] Response status: 200
[getEmployeeDocuments] Raw data received: { isArray: true, length: 13, ... }
[getEmployeeDocuments] Mapped documents: { count: 13, ... }
[DocumentsScreen] Documents loaded: { count: 13, ... }
```

### 3. Possible Issues to Look For

#### Issue A: Wrong Employee ID
If the logs show a different employee ID than `e24bdcf4-abb7-48c5-9221-75911f75d5a2`, then:
- The mobile app is logged in as a different user
- Check which user is actually logged in

#### Issue B: Authentication Failure
If you see `[list-employee] Unauthorized - no session`:
- The mobile session token is not being sent correctly
- Check the mobile app's authentication state

#### Issue C: Empty Response
If the API returns 0 documents but the database has 13:
- Check the `whereClause` in the logs
- Verify `companyId` matches between session and documents
- Check if `isViewingOwnDocuments` is `false` (should be `true`)

#### Issue D: Response Not Reaching Mobile App
If API logs show 13 documents but mobile app receives 0:
- Network issue or response transformation problem
- Check the raw response data in mobile logs

## Quick Database Verification

Run this to verify Alex Ward's documents:
```bash
npx tsx scripts/debug-alex-ward-docs.ts
```

Expected output: 13 documents, all with `canViewEmployee: true`

## Manual API Test

Test the API directly with curl (replace with actual session token):
```bash
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  "http://localhost:3000/api/documents/list-employee?employeeId=e24bdcf4-abb7-48c5-9221-75911f75d5a2"
```

Should return JSON array with 13 documents.

## Next Steps

1. **Start the dev server** and mobile app
2. **Log in as Alex Ward** (alex.ward@peoplecore.co.nz)
3. **Navigate to Documents** from Quick Actions
4. **Check the logs** in both backend console and mobile app console
5. **Compare the logs** with the expected output above
6. **Identify which issue** (A, B, C, or D) is occurring

## Contact Points

The key files with logging:
- Backend: `app/api/documents/list-employee/route.ts` (lines 19-39, 77-82, 117-123, 172-177)
- Mobile API: `mobile/src/api/profile.ts` (lines 304-339)
- Mobile Screen: `mobile/src/screens/profile/DocumentsScreen.tsx` (lines 37-48, 65-72)
