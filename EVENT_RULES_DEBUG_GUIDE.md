# Event Rules - Debugging Guide for eventCategoryId Issue

## The Problem

Getting Zod validation error: "Invalid event category ID" when creating staffing density override.

## Console Logging Added

I've added three console logs to help debug this issue:

### 1. Category Selection Log
**When:** You select a category from the dropdown
**Log:** `"Selected category ID: <value>"`
**What to check:** Should be a CUID format like `clxxxxxxxxxxxxxxxxx`

### 2. State Before Save Log  
**When:** Right before attempting to save
**Log:** `"Current override state: <object>"`
**What to check:** 
- `eventCategoryId` should be present and valid
- `staffingDensityEnabled` should be `true`
- `staffingDensityThreshold` should be between 0-1 (e.g., 0.8 for 80%)
- `staffingDensityBehavior` should be "DENY" or "REQUIRE_APPROVAL"

### 3. Data Being Sent Log
**When:** Just before making the API call
**Log:** `"Sending override data: <object>"`
**What to check:**
- `eventCategoryId` should match what was selected
- All other fields should be present and valid

## Steps to Debug

### Step 1: Open Browser DevTools
1. Press F12 or right-click > Inspect
2. Go to the "Console" tab
3. Clear the console (🚫 icon)

### Step 2: Create Override with Logging
1. Navigate to Settings > Event Rules
2. Go to "Staffing Density" tab
3. Click "Add Density Rule"
4. Select a category - **CHECK CONSOLE** for log #1
5. Enter threshold (e.g., 80)
6. Select behavior
7. Click "Create Override" - **CHECK CONSOLE** for logs #2 and #3

### Step 3: Analyze the Logs

#### Scenario A: Category ID is valid in all logs
```
Selected category ID: cly123abc456def789
Current override state: { eventCategoryId: "cly123abc456def789", ... }
Sending override data: { eventCategoryId: "cly123abc456def789", ... }
```
**Issue:** The API is receiving valid data but still rejecting it
**Possible causes:**
- Event category doesn't exist in database
- Event category belongs to different company
- Database constraint issue

**Solution:** Check the database directly:
```sql
SELECT id, name, companyId FROM "EventCategory" 
WHERE id = 'cly123abc456def789';
```

#### Scenario B: Category ID is empty string in any log
```
Selected category ID: ""
```
OR
```
Current override state: { eventCategoryId: "", ... }
```
OR
```
Sending override data: { eventCategoryId: "", ... }
```
**Issue:** Category is not being selected or state is being cleared
**Possible causes:**
- Select component not working correctly
- State update timing issue
- Form reset happening at wrong time

**Solution:** Will need to investigate React state management

#### Scenario C: Category ID is undefined
```
Current override state: { staffingDensityEnabled: true, ... }
// No eventCategoryId field
```
**Issue:** Field is being omitted entirely
**Possible causes:**
- Not spreading state correctly
- Field being deleted during state updates

**Solution:** Check all `setCurrentOverride` calls

#### Scenario D: Category ID changes between logs
```
Selected category ID: cly123abc456def789
Current override state: { eventCategoryId: "", ... }
```
**Issue:** State is being overwritten after selection
**Possible causes:**
- Another setState call clearing the field
- Form reset being called
- State update race condition

**Solution:** Check state update sequence

## Common Issues and Solutions

### Issue 1: "No categories available" in dropdown
**Symptom:** Can't select any category
**Solution:** 
1. Check if event categories exist: Navigate to Settings > Event Categories
2. Create at least one category if none exist

### Issue 2: Category selection doesn't update state
**Symptom:** Log #1 doesn't appear when selecting category
**Solution:**
1. Check if JavaScript errors in console
2. Try refreshing the page
3. Check if Select component is properly bound

### Issue 3: State resets when changing threshold
**Symptom:** Category selected but lost when entering threshold
**Solution:** 
- This indicates a state spreading issue
- Check console for "Current override state" to see if eventCategoryId is present

### Issue 4: CUID format invalid
**Symptom:** eventCategoryId looks wrong (not starting with "cl")
**Solution:**
- Database might have corrupted data
- Check database directly
- May need to regenerate category IDs

## What I Fixed

### Fix 1: Removed double state reset
**Before:**
```typescript
const openCreateOverrideDialog = (enableStaffingDensity = false) => {
  resetOverrideForm();  // Sets eventCategoryId: ""
  if (enableStaffingDensity) {
    setCurrentOverride({  // Sets eventCategoryId: "" again
      eventCategoryId: "",
      ...
    });
  }
  setOverrideDialogOpen(true);
};
```

**After:**
```typescript
const openCreateOverrideDialog = (enableStaffingDensity = false) => {
  if (enableStaffingDensity) {
    setCurrentOverride({  // Only one state update
      eventCategoryId: "",
      ...
    });
  } else {
    resetOverrideForm();
  }
  setOverrideDialogOpen(true);
};
```

### Fix 2: Explicit field inclusion in API payload
**Before:** Spreading all fields (might include undefined)
**After:** Explicitly including required fields, conditionally including optional ones

## Next Steps Based on Console Output

Please share:
1. All three console logs
2. Any JavaScript errors in console
3. The Network tab showing the actual API request/response

This will help identify exactly where the eventCategoryId is getting lost or corrupted.

## If All Logs Look Correct But Still Getting Error

If the logs show:
- Valid CUID in all three places
- No JavaScript errors
- Data looks correct

Then the issue is likely:
1. **Database mismatch:** Category ID doesn't exist in DB
2. **Company mismatch:** Category belongs to different company
3. **Cache issue:** Old data in Prisma cache
4. **Build issue:** Code not deployed correctly

### Solutions:
```sql
-- Check if category exists
SELECT * FROM "EventCategory" WHERE id = '<your-category-id>';

-- Check company association
SELECT ec.*, e.companyId
FROM "EventCategory" ec
LEFT JOIN "Employee" e ON e.companyId = ec.companyId
WHERE ec.id = '<your-category-id>';
```

If category doesn't exist or belongs to wrong company, you'll need to:
1. Create the category correctly
2. Or select a different existing category

## Support Checklist

Before reporting the issue, please provide:
- [ ] All three console log outputs
- [ ] Any JavaScript console errors
- [ ] Network tab showing the POST request
- [ ] Database query results for the category ID
- [ ] Your user's companyId from the session
- [ ] List of available categories in the dropdown

This information will help pinpoint the exact issue!

