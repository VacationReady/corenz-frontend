# AI Assistant Field Detection Fix

## Problem Summary

When users asked the AI Assistant to "add a new field to the personal information screen," it would:
- ❌ **Always create a "Custom Field"** in a separate "Custom Fields" form
- ❌ **Not detect which section the user was referring to**
- ❌ **Provide confusing feedback** about where the field was created

This happened because the `handleFieldCreation` function in `orchestrator.ts` always passed `"custom"` as the section parameter, ignoring user intent.

## Root Cause

**File:** `app/lib/ai/orchestrator.ts`  
**Line:** 493 (before fix)

```typescript
const result = await generateCustomField(prompt, "custom", companyId);
//                                              ^^^^^^^^ Always "custom"!
```

The orchestrator never analyzed the user's message to determine which form/section they wanted to modify.

## Solution Implemented

### 1. Smart Section Detection (`orchestrator.ts`)

Added intelligent keyword detection to identify which section the user is referring to:

```typescript
// Detect which section/form the user is referring to
const promptLower = prompt.toLowerCase();
let targetSection: "personal-information" | "bank-payroll" | "emergency-contacts" | "custom" = "custom";

if (promptLower.includes('personal information') || promptLower.includes('personal info') || 
    promptLower.includes('person details') || promptLower.includes('personal details')) {
  targetSection = "personal-information";
  sectionDisplayName = "Personal Information";
} else if (promptLower.includes('bank') || promptLower.includes('payroll')) {
  targetSection = "bank-payroll";
  sectionDisplayName = "Bank & Payroll";
} else if (promptLower.includes('emergency') || promptLower.includes('contact')) {
  targetSection = "emergency-contacts";
  sectionDisplayName = "Emergency Contacts";
}
```

### 2. Improved Response Messages

The AI now provides clear, specific feedback about where the field was created:

**Before:**
```
✅ Field Created!

Added "New Personal Information Field" to Custom Fields
```

**After:**
```
✅ Field Created!

Added "T-Shirt Size" to **Personal Information**

📍 You can find it in: **Employees > [Any Employee] > Personal Information**

💡 All employees will now have this field available to fill in.
```

### 3. Auto-Create Section Forms (`field-generator.ts`)

If a section-specific form doesn't exist, the AI now automatically creates it:

- **Custom Fields** → `custom-fields` form
- **Personal Information** → `personal-information-custom` form
- **Bank & Payroll** → `bank-payroll-custom` form
- **Emergency Contacts** → `emergency-contacts-custom` form

These forms appear as new tabs in the employee profile navigation.

### 4. Fixed Schema Handling

Updated the field insertion logic to work with the new sections-based schema format:

```typescript
// Handle sections-based schema (new format)
if (updatedDefinition.sections && Array.isArray(updatedDefinition.sections)) {
  const targetSection = updatedDefinition.sections[0];
  targetSection.fields.push(newField);
}
```

## How It Works Now

### User Request:
> "I'd like to add a new field to the personal information screen of all employees please"

### AI Processing:
1. ✅ Detects "personal information" keyword
2. ✅ Sets `targetSection = "personal-information"`
3. ✅ Creates/finds the `personal-information-custom` form
4. ✅ Adds the field to that form
5. ✅ Responds with clear location information

### Result:
- A new **"Personal Details (Custom)"** tab appears in employee profiles
- The custom field is visible in this tab for all employees
- Clear feedback tells the user exactly where to find it

## Testing Guide

### Test Case 1: Personal Information Field
```
User: "Add a T-Shirt Size dropdown to personal information"
Expected: Field created in Personal Details (Custom) tab
```

### Test Case 2: Bank & Payroll Field
```
User: "Add a Superannuation Fund Name field to bank details"
Expected: Field created in Bank & Payroll (Custom) tab
```

### Test Case 3: Emergency Contacts Field
```
User: "Add a secondary emergency contact phone number"
Expected: Field created in Emergency Contacts (Custom) tab
```

### Test Case 4: Custom Fields (Default)
```
User: "Add a Parking Space Number field"
Expected: Field created in Custom Fields tab (no specific section mentioned)
```

## Benefits

1. **Better Intent Recognition** - AI understands which section the user means
2. **Clearer Feedback** - Users know exactly where to find their new field
3. **Organized Structure** - Fields are grouped logically by section
4. **Automatic Form Creation** - No manual setup required
5. **Backward Compatible** - Still works with existing custom fields

## Architecture

```
User Request
    ↓
orchestrator.ts (Section Detection)
    ↓
field-generator.ts (Form Creation/Update)
    ↓
Database (Form Schema Updated)
    ↓
Employee Profile (New Tab Appears)
```

## Files Changed

1. **`app/lib/ai/orchestrator.ts`**
   - Added section detection logic
   - Improved response messages
   
2. **`app/lib/ai/field-generator.ts`**
   - Auto-create section-specific forms
   - Support sections-based schema format
   - Better error messages

## Future Improvements

Consider adding:
- AI-powered field suggestions based on common HR needs
- Ability to move fields between sections
- Batch field creation (multiple fields at once)
- Integration with the built-in personal-information page (requires refactoring to form-based rendering)

---

**Status:** ✅ Complete and Ready to Test  
**Date:** October 3, 2025


