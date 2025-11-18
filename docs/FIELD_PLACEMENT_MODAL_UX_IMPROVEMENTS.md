# Field Placement Modal UX Improvements

## Overview
Enhanced the FieldPlacementModal component to prevent accidental data loss by implementing dirty-state tracking and a confirmation dialog when users attempt to close the modal with unsaved changes.

## Changes Made

### 1. Dirty State Tracking
- Added `initialFields` state to store the original field configuration when the modal opens
- Added `isDirty` state to track whether fields have been modified
- Added `showConfirmClose` state to control the confirmation dialog visibility
- Implemented deep comparison between current `fields` and `initialFields` to detect changes
- Changes are detected when:
  - Fields are added (via palette buttons)
  - Fields are removed (via X button)
  - Fields are dragged to new positions
  - Field labels are edited
  - Field assignees are changed

### 2. Confirmation Dialog
- Created a new confirmation dialog that appears when users try to close with unsaved changes
- Warning message: "You have unsaved signature field changes. If you close now, these fields will be lost and notifications will not be sent."
- Two action buttons:
  - **Keep Editing** (outline variant) - Returns user to the modal
  - **Discard Changes** (danger variant) - Confirms the close action
- Visual warning indicator with amber AlertTriangle icon

### 3. Smart Close Behavior
- Replaced direct `onClose` calls with `handleClose` function
- `handleClose` checks if there are unsaved changes before closing
- Silent close (no warning) when:
  - No changes have been made
  - Currently sending notifications (to avoid interrupting the process)
- Warning dialog appears when:
  - Fields have been modified
  - Not currently in the middle of sending notifications

### 4. Save Flow Updates
- After successful save, dirty state is reset
- `initialFields` is updated to match the saved state
- This allows users to continue editing after saving without triggering false warnings

## User Experience Flow

### Scenario 1: Upload Flow (Placement Before Send)
1. User uploads a document with "Requires Signature" enabled
2. FieldPlacementModal opens automatically
3. User adds/modifies signature fields
4. If user clicks Cancel or X:
   - Confirmation dialog appears
   - User can choose to keep editing or discard changes
5. If user clicks "Save & Send Notifications":
   - Fields are saved
   - Notifications are sent
   - Modal closes without warning

### Scenario 2: Reopening Placement Later
1. Admin opens "Place Signature Fields" from document actions menu
2. Modal loads existing fields (if any)
3. User modifies fields
4. If user tries to close:
   - Confirmation dialog appears if changes were made
   - No warning if no changes were made
5. If user saves:
   - Fields are saved
   - Modal closes without warning

### Scenario 3: No Changes Made
1. User opens FieldPlacementModal
2. User views existing fields but makes no changes
3. User clicks Cancel or X
4. Modal closes immediately without warning (silent close)

## Technical Implementation

### State Management
```typescript
const [initialFields, setInitialFields] = useState<Field[]>([]);
const [isDirty, setIsDirty] = useState(false);
const [showConfirmClose, setShowConfirmClose] = useState(false);
```

### Dirty Detection
```typescript
useEffect(() => {
  const hasChanged = JSON.stringify(fields) !== JSON.stringify(initialFields);
  setIsDirty(hasChanged);
}, [fields, initialFields]);
```

### Close Handler
```typescript
const handleClose = () => {
  if (isDirty && !sendingNotifications) {
    setShowConfirmClose(true);
  } else {
    onClose();
  }
};
```

## Integration Points

### DocumentsPageClient.tsx
The parent component already has two onClose handlers that work seamlessly with the new implementation:

1. **handlePlacementCancel** (line 538-549)
   - Used for the post-upload placement flow
   - Shows a toast warning if placement is incomplete
   - Now benefits from the confirmation dialog

2. **Direct close handler** (line 1145)
   - Used when reopening placement from document actions
   - Simple state setter that closes the modal
   - Now benefits from the confirmation dialog

Both handlers call the modal's `onClose` prop, which triggers the new `handleClose` logic.

## Benefits

1. **Prevents Data Loss**: Users are warned before accidentally discarding field placements
2. **Clear Communication**: The warning message explicitly mentions that notifications won't be sent
3. **Smart Behavior**: No annoying warnings when nothing has changed
4. **Consistent UX**: Works the same way in both upload flow and later editing
5. **Non-Blocking**: Doesn't interfere with the notification sending process

## Testing Recommendations

1. Test upload flow with signature fields:
   - Add fields, try to cancel → should show warning
   - Add fields, save → should close without warning
   - Open modal, don't change anything, cancel → should close silently

2. Test reopening placement:
   - Modify existing fields, try to close → should show warning
   - View fields without changes, close → should close silently

3. Test edge cases:
   - Try to close while notifications are sending → should close without warning
   - Save, then modify again, then close → should show warning
   - Save, then close without changes → should close silently

## Files Modified

- `app/components/documents/FieldPlacementModal.tsx` - Main implementation
- `docs/FIELD_PLACEMENT_MODAL_UX_IMPROVEMENTS.md` - This documentation

## Dependencies

- Existing `Dialog` components from `@/components/ui/dialog`
- `AlertTriangle` icon from `lucide-react`
- No new external dependencies added
