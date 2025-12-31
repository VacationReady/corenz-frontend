# Holiday Entitlement Calculator - Discard Dialog Fix

## Problem
When clicking the "Calculate" button in the Holiday Entitlement Calculator modal, the "Discard unsaved changes?" dialog would appear incorrectly. After clicking "Continue Editing", any subsequent clicks would continue to trigger the discard dialog.

## Root Cause
The issue was caused by event bubbling and improper event handling in the calculator modal buttons. The buttons were:
1. Not preventing default form submission behavior
2. Not stopping event propagation to parent elements
3. Missing explicit `type="button"` attributes
4. Using complex modal close handlers that could interfere with the main form

## Solution
Applied the following fixes to the calculator modal buttons:

### 1. Added Proper Event Handling
```typescript
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  calculateEntitlement();
}}
```

### 2. Added Button Type Attributes
```typescript
<Button type="button" onClick={...}>
```

### 3. Simplified Modal Close Logic
Removed complex `handleCalculatorModalClose` function and used direct state updates:
```typescript
onOpenChange={(open) => {
  if (!open) {
    setIsCalculateModalOpen(false);
    setCalculatedEntitlement(0);
  }
}}
```

### 4. Isolated Calculator State
Ensured calculator state variables (`calculatedEntitlement`, `fullTimeEntitlement`, etc.) are completely separate from the main form's dirty state detection.

## Files Modified
- `app/components/employees/AddEmployeeModal.tsx`

## Testing
- Calculator modal buttons no longer trigger the discard dialog
- Calculator functionality works correctly (pro-rata calculations)
- Main form dirty state detection remains unaffected
- No regressions in existing functionality

## Result
✅ Calculator modal now works without interfering with the main form
✅ No more false "discard changes" dialogs
✅ Simplified and more reliable event handling
✅ Maintained all existing functionality