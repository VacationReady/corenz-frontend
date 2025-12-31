# Holiday Entitlement Calculator - Discard Dialog Fix

## Problem
When clicking the "Calculate" button in the Holiday Entitlement Calculator modal, the "Discard unsaved changes?" dialog would appear incorrectly. After clicking "Continue Editing", any subsequent clicks would continue to trigger the discard dialog.

## Root Cause Analysis
The issue was caused by multiple factors:

1. **Event Bubbling**: Calculator modal buttons were not preventing event propagation
2. **Modal Interference**: The calculator modal was triggering the main modal's close handlers
3. **Defensive Handling Missing**: Main modal was responding to close events even when calculator was open

## Solution
Applied comprehensive fixes to isolate the calculator modal from the main form:

### 1. Enhanced Button Event Handling
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

### 3. Defensive Main Modal Handlers
```typescript
onOpenChange={(nextOpen) => {
  // Only handle explicit close requests when calculator is not open
  if (!nextOpen && !isCalculateModalOpen) {
    handleClose();
  }
}}

onEscapeKeyDown={(e) => {
  if (isDirty && !isSubmitting && !isCalculateModalOpen) {
    e.preventDefault();
    setShowDiscardDialog(true);
    setPendingClose(true);
  }
}}

onInteractOutside={(e) => {
  if (isDirty && !isSubmitting && !isCalculateModalOpen) {
    e.preventDefault();
    setShowDiscardDialog(true);
    setPendingClose(true);
  }
}}
```

### 4. Simplified Calculator Modal Logic
```typescript
onOpenChange={(open) => {
  // Only allow closing, not opening through this handler
  if (!open) {
    setIsCalculateModalOpen(false);
    setCalculatedEntitlement(0);
  }
}}
```

### 5. Isolated Calculator State
Ensured calculator state variables (`calculatedEntitlement`, `fullTimeEntitlement`, etc.) are completely separate from the main form's dirty state detection.

## Files Modified
- `app/components/employees/AddEmployeeModal.tsx`

## Testing Scenarios
✅ Calculator modal buttons no longer trigger the discard dialog  
✅ Calculator functionality works correctly (pro-rata calculations)  
✅ Main form dirty state detection remains unaffected  
✅ Escape key and outside clicks are properly handled  
✅ No regressions in existing functionality  

## Result
The calculator modal now works independently without interfering with the main form's unsaved changes detection. Users can calculate holiday entitlements without encountering false "discard changes" dialogs.