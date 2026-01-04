# Documents Access Filtering Fix

## Issues Fixed

### 1. Admin Filter Option Removed
**Problem**: The UI showed an "Admin" toggle button, which was nonsensical since admins should always see ALL documents regardless of access settings.

**Solution**: 
- Removed the Admin toggle button from the EditAccessModal UI
- Changed the layout from 3 columns (Admin, Manager, Employee) to 2 columns (Manager, Employee)
- Added explanatory text: "Admins can always see all documents. Configure which other roles can access this document below."
- Updated validation logic to only require Manager OR Employee selection (not Admin)

### 2. Access Filtering Logic Completely Broken
**Problem**: The API filtering logic was fundamentally flawed. It used equality checks like `{ canViewManager: true }` which only showed documents where the flag was true, but didn't actually filter OUT documents where the flag was false.

**Solution**: 
- **For Admins**: Completely bypass role filtering (empty filter object `{}`) - they see ALL documents
- **For Managers**: Only show documents where `canViewManager: true` 
- **For Employees**: Only show documents where `canViewEmployee: true`

### 3. Permission-Based Bypass Was Ignoring Access Flags
**Problem**: In `/api/documents/list`, managers with `canManageDocuments` permission (edit/delete) were bypassing ALL role-based filtering and seeing every document, regardless of access flags.

**Solution**: 
- The `canManageDocuments` permission now only grants edit/delete capabilities
- Role-based access filtering is ALWAYS applied, even for document managers
- Only true Admins/Super Admins bypass the role filter

### 4. Inconsistent Behavior Across API Endpoints
**Problem**: Multiple document API endpoints had the same broken filtering logic.

**Solution**: Fixed the role-based filtering logic in all document API endpoints:
- `app/api/documents/list-company/route.ts` - Main company document listing
- `app/api/documents/list-employee/route.ts` - Employee-specific document listing  
- `app/api/documents/list/route.ts` - Alternative document listing (with permission bypass fix)
- `app/api/documents/download/route.ts` - Document download access control

### 5. Department/Job Role Filtering Bypassed for Document Managers (NEW - Jan 2026)
**Problem**: Managers with document management permissions (`canManageDocuments`) were bypassing department/job role restrictions entirely. This meant a Sales Manager could see HR-restricted documents if they had document edit/delete permissions, even though they weren't in the HR department.

**Root Cause**: The `canManageDocuments` code path in `/api/documents/list` only applied `roleFilter` (checking `canViewManager: true`) but completely skipped the department/job role filtering that was applied to regular users.

**Solution**: 
- Non-admin document managers now have department/job role filtering applied
- Only true Admins/Super Admins bypass department filtering
- The fix ensures that even if a manager has document management permissions, they can only see documents that:
  1. Match their role access (`canViewManager: true`)
  2. AND match their department OR job role OR are unrestricted (no department/job role set)

## Files Modified

### API Routes (Backend)
1. **`app/api/documents/list-company/route.ts`**
   - Updated role filter logic to bypass filtering for admins
   - Added detailed comments explaining the access control logic

2. **`app/api/documents/list-employee/route.ts`**
   - Fixed role-based access filter to bypass filtering for admins
   - Updated comments to clarify the intended behavior

3. **`app/api/documents/list/route.ts`**
   - **CRITICAL FIX**: Removed the `canManageDocuments` permission bypass that was ignoring access flags
   - Role-based filtering now applies to ALL users except Admins/Super Admins
   - Document managers can still edit/delete but only see documents they have access to

4. **`app/api/documents/download/route.ts`**
   - Fixed role-based access check to allow all documents for admins
   - Added detailed comments explaining the access control flow

### UI Components (Frontend)
5. **`app/components/documents/EditAccessModal.tsx`**
   - Removed Admin toggle button (3-column → 2-column layout)
   - Added explanatory note about admin access
   - Updated validation logic to not require admin selection
   - Modified save logic to always set `canViewAdmin: true`
   - Updated audience summary to always include "Admins"
   - Removed `canAdmin` state variable and related logic

## Expected Behavior After Fix

### For Admins:
- ✅ See ALL documents regardless of access flags or department restrictions
- ✅ Cannot toggle "Admin" access off (option removed from UI)
- ✅ All documents automatically have `canViewAdmin: true` when saved

### For Managers:
- ✅ Only see documents where `canViewManager: true`
- ✅ Cannot see documents where `canViewManager: false`
- ✅ Can toggle Manager access on/off when editing documents
- ✅ Document management permissions (edit/delete) do NOT bypass access control
- ✅ **Department/Job Role restrictions are enforced** - managers only see documents that match their department/job role OR are unrestricted

### For Employees:
- ✅ Only see documents where `canViewEmployee: true`  
- ✅ Cannot see documents where `canViewEmployee: false`
- ✅ Can toggle Employee access on/off when editing documents

### Scenario: Sales Manager with HR Employee Reporting to Them
- ✅ Sales Manager cannot see HR-restricted documents (even if they have document management permissions)
- ✅ The HR employee reporting to them CAN see HR documents (if they're in the HR department)
- ✅ The reporting relationship does NOT grant access to department-restricted documents

## Testing Recommendations

1. **Create test documents with different access combinations**:
   - Manager: ON, Employee: OFF
   - Manager: OFF, Employee: ON  
   - Manager: ON, Employee: ON
   - Manager: OFF, Employee: OFF

2. **Test with different user roles**:
   - Admin should see ALL documents
   - Manager should only see documents with Manager: ON
   - Employee should only see documents with Employee: ON

3. **Test manager with document permissions**:
   - Manager with edit/delete permissions should still only see Manager: ON documents
   - They should NOT see all documents just because they can manage them

4. **Verify UI behavior**:
   - Admin toggle should not be visible
   - Explanatory text should be present
   - Validation should work with just Manager/Employee selection

## Security Notes

- ✅ Tenant isolation is maintained (all queries still filter by `companyId`)
- ✅ Department and job role restrictions still apply correctly
- ✅ Admin bypass only affects role-based filtering, not other security checks
- ✅ Employee-specific documents still respect employee ownership
- ✅ Document management permissions no longer bypass access control