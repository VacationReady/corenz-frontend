# Event Rules - Testing Guide

This guide will help you verify that all the fixes are working correctly.

## Prerequisites

- Access to Settings > Event Rules
- At least one event category configured
- (Optional) At least one department configured for testing department overrides

## Test 1: Create Override Dialog Validation

### Steps:
1. Navigate to Settings > Event Rules
2. Go to the "Overrides" tab
3. Click "Create Override"

### Expected Results:
- ✅ Dialog opens
- ✅ "Event Category *" label is red (indicating required field)
- ✅ Event Category select has red border
- ✅ Red text below shows "Event category is required"
- ✅ "Create Override" button is disabled
- ✅ Gray text shows "Please select an event category to continue"

### Test Actions:
1. Try clicking "Create Override" button
   - **Expected:** Button is disabled, nothing happens

2. Select an event category from dropdown
   - **Expected:** Red border disappears, button becomes enabled

3. Click "Create Override" button
   - **Expected:** Successfully creates override with toast notification

## Test 2: Staffing Density Rule Creation

### Steps:
1. Navigate to Settings > Event Rules
2. Go to the "Staffing Density" tab
3. Click "Add Density Rule"

### Expected Results:
- ✅ Dialog opens with "Staffing Density" toggle already enabled
- ✅ Threshold field shows 30% (default)
- ✅ Behavior set to "Deny request (Hard Block)"

### Test Actions:
1. Without selecting a category, try to create
   - **Expected:** Toast error "Please select an event category"

2. Select a category but set threshold to 0
   - **Expected:** Toast error "Please enter a valid density threshold (1-100%)"

3. Select category, set threshold to 30%, choose department (or Company-wide)
   - **Expected:** Successfully creates with toast notification
   - **Expected:** New rule appears in the Staffing Density list

4. Verify the new rule shows in the list with:
   - Department name
   - Threshold percentage
   - Edit button (pencil icon)
   - Delete button (trash icon)

## Test 3: Test Scenario Dialog

### Steps:
1. Navigate to Settings > Event Rules
2. Click "Test Scenario" button

### Expected Results:
- ✅ Dialog opens
- ✅ "All employees" is selected by default (not empty)

### Test Actions:
1. Select an event category
2. Keep "All employees" selected
3. Click "Run Simulation"
   - **Expected:** Simulation runs without React errors
   - **Expected:** Results display correctly

## Test 4: Department Selection

### Steps:
1. Create a new override
2. Look at the Department dropdown

### Expected Results:
- ✅ "Company-wide" option available (not empty string)
- ✅ All departments listed

### Test Actions:
1. Select "Company-wide"
2. Save the override
   - **Expected:** Creates successfully
   - **Expected:** Shows as "Company-wide" in the list

3. Edit the override
4. Change to a specific department
5. Save
   - **Expected:** Updates successfully
   - **Expected:** Shows department name in the list

## Test 5: Loading States

### Steps:
1. Create a new override with valid data
2. Click "Create Override"

### Expected Results During Save:
- ✅ Button text changes to "Saving..."
- ✅ Button becomes disabled
- ✅ Cannot click button multiple times

### Expected Results After Save:
- ✅ Success toast notification
- ✅ Dialog closes automatically
- ✅ New override appears in list
- ✅ Page data refreshes

## Test 6: Error Handling

### Test API Error:
1. Open browser DevTools Console
2. Create an override with a category that already has an override for the same department
   - **Expected:** Toast error: "An override for this category and scope already exists"

### Test Network Error:
1. Turn off internet connection
2. Try to create override
   - **Expected:** Toast error: "An unexpected error occurred"
   - **Expected:** Error logged to console

## Test 7: Edit Existing Override

### Steps:
1. Go to Overrides tab or Staffing Density tab
2. Click Edit (pencil icon) on an existing override

### Expected Results:
- ✅ Dialog opens with pre-filled data
- ✅ Event category is selected and shows correctly
- ✅ Department shows correctly
- ✅ All fields populated with current values

### Test Actions:
1. Change the threshold or other settings
2. Click "Update Override"
   - **Expected:** Success toast
   - **Expected:** Changes reflected in the list

## Test 8: No Categories Available

### Steps:
1. (Only if you can test this) If no event categories exist
2. Try to create an override

### Expected Results:
- ✅ Select shows "No categories available"
- ✅ Cannot proceed without categories

## Common Issues to Watch For

### ❌ Issue: Empty string React error
**Error Message:** "A <Select.Item /> must have a value prop that is not an empty string"
**Status:** Should be FIXED - test all selects to confirm

### ❌ Issue: Validation error on save
**Error Message:** "Invalid event category ID" (Zod error)
**Status:** Should be FIXED - proper validation now prevents submission

### ❌ Issue: Button doesn't disable
**Status:** Should be FIXED - button properly disables when no category selected

### ❌ Issue: No visual feedback
**Status:** Should be FIXED - red borders, helper text, and disabled states all working

## Success Criteria

All tests should pass with:
- ✅ No React errors in console
- ✅ No Zod validation errors from API
- ✅ Proper visual feedback for required fields
- ✅ Cannot submit invalid data
- ✅ Success/error toasts display correctly
- ✅ Loading states prevent double submissions
- ✅ Data refreshes after operations

## Deployment Verification

After deploying to Vercel:

1. Check Vercel logs for any errors during build
   - Should show no TypeScript errors
   - Should build successfully

2. Test the live application
   - All functionality should work as in local testing
   - No console errors in production

3. Monitor Vercel runtime logs
   - No Zod validation errors should appear
   - Successful POST requests should create overrides

## Rollback Plan

If issues persist after deployment:

1. Check Vercel logs for specific error messages
2. Verify event categories exist and have valid CUID IDs
3. Check that departments have valid CUID IDs
4. Ensure Prisma schema is up to date
5. Contact support with specific error logs if needed

## Additional Notes

- All fixes are client-side validation improvements
- No database changes required
- No API changes required
- Should work with existing data
- Backward compatible with previous overrides

## Support Information

If you encounter any issues:

1. Check browser console for errors
2. Check Vercel logs for server errors
3. Verify data in database has valid CUID format
4. Review EVENT_RULES_FIXES_SUMMARY.md for implementation details









