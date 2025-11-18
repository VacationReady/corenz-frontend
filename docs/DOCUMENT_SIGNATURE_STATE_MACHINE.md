# Document Signature Workflow State Machine

## Overview

This document describes the state machine for document uploads with signature requirements, ensuring that no signer is left un-notified and that field placement is properly managed.

## State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     UPLOAD DOCUMENT FORM                         │
│  - requiresSignature: boolean                                    │
│  - canViewAdmin/Manager/Employee: boolean (configurable)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Submit Upload    │
                    └──────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │ requiresSignature│          │ Normal Upload        │
    │ = true           │          │ (no signature req)   │
    └──────────────────┘          └──────────────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │ UPLOAD TO SERVER │          │ Send Notifications   │
    │ deferNotifications│         │ Immediately          │
    │ = true           │          └──────────────────────┘
    └──────────────────┘                      │
              │                               ▼
              ▼                      ┌──────────────────┐
    ┌──────────────────┐             │ COMPLETE         │
    │ PLACEMENT PENDING│             └──────────────────┘
    │ State            │
    └──────────────────┘
              │
              ▼
    ┌──────────────────────┐
    │ FIELD PLACEMENT MODAL│
    │ (User must place     │
    │  signature fields)   │
    └──────────────────────┘
              │
      ┌───────┴──────────┐
      ▼                  ▼
┌──────────┐      ┌──────────────┐
│ Cancel   │      │ Save & Send  │
│          │      │ Notifications│
└──────────┘      └──────────────┘
      │                  │
      ▼                  ▼
┌──────────────┐  ┌────────────────────┐
│ Warning Toast│  │ SEND NOTIFICATIONS │
│ + Close Modal│  │ API Call           │
└──────────────┘  └────────────────────┘
      │                  │
      ▼           ┌──────┴──────┐
┌──────────────┐  ▼             ▼
│ PLACEMENT    │ Success      Failure
│ INCOMPLETE   │  │             │
│ (doc uploaded│  ▼             ▼
│ but no notify│ ┌─────┐   ┌────────────┐
└──────────────┘ │DONE │   │Error Toast │
                 └─────┘   │+ Retry Info│
                           └────────────┘
                                 │
                                 ▼
                           ┌────────────┐
                           │ PLACEMENT  │
                           │ INCOMPLETE │
                           └────────────┘
```

## States

### 1. UPLOAD FORM
- **Description**: Initial state where admin configures document upload
- **Fields**:
  - `requiresSignature`: Whether document requires signatures
  - `canViewAdmin`, `canViewManager`, `canViewEmployee`: Access permissions (now configurable)
  - `signatureDueAt`: Optional due date for signatures
  - Departments and job roles selection

### 2. UPLOAD TO SERVER
- **Description**: Document is uploaded with `deferNotifications=true` if `requiresSignature=true`
- **Actions**:
  - Upload file to Supabase storage
  - Create document record in database
  - If `requiresSignature=true`: DO NOT send notifications yet
  - If `requiresSignature=false`: Send notifications immediately

### 3. PLACEMENT PENDING
- **Description**: Document uploaded but signature field placement required before notifications
- **State Variables**:
  - `placementPendingDocId`: ID of document awaiting placement
  - `placementPendingDocName`: Name of document for display
- **User Actions**:
  - Admin MUST complete field placement OR explicitly cancel
  - Modal cannot be dismissed without choosing one of these paths

### 4. FIELD PLACEMENT MODAL
- **Description**: Modal for placing signature fields on document
- **Actions**:
  - Display PDF preview
  - Allow dragging signature/name/job role fields
  - Assign fields to specific employees (optional)
- **Exit Paths**:
  1. **Cancel**: Closes modal with warning, no notifications sent
  2. **Save & Send Notifications**: Saves fields AND triggers notification API

### 5. SEND NOTIFICATIONS
- **Description**: API call to `/api/documents/send-notifications`
- **Actions**:
  - Determine recipients based on departments/job roles
  - Send email notifications via Resend
  - Return count of emails sent
- **Error Handling**:
  - Network failures: Display error toast with retry instructions
  - Partial failures: Log errors but continue with successful sends
  - Complete failure: Display error and inform admin to retry later

### 6. COMPLETION STATES

#### COMPLETE (Success)
- All notifications sent successfully
- Document ready for signing
- Upload flow closed

#### PLACEMENT INCOMPLETE (Warning State)
- Document exists in system
- No notifications sent to signers
- Admin can complete placement later via:
  - Document actions menu → "Place Signature Fields"
  - Then manually trigger send via same menu

## API Endpoints

### POST /api/documents/upload
**Purpose**: Upload document with optional deferred notifications

**Request**:
```typescript
FormData {
  file: File
  name: string
  category?: string
  canViewAdmin: boolean  // Now configurable
  canViewManager: boolean  // Now configurable
  canViewEmployee: boolean  // Now configurable
  requiresAck: boolean
  requiresSignature: boolean
  signatureDueAt?: Date
  deferNotifications: boolean  // true if requiresSignature
  departments: string[]  // JSON array
  jobRoles: string[]  // JSON array
}
```

**Response**:
```typescript
{
  Document: {
    id: string
    url: string
    name: string
    // ... other fields
  }
}
```

### POST /api/documents/send-notifications
**Purpose**: Send deferred notifications for uploaded document

**Request**:
```typescript
{
  documentId: string
}
```

**Response**:
```typescript
{
  success: boolean
  emailsSent: number
  message: string
}
```

**Errors**:
- 401: Unauthorized
- 404: Document not found
- 500: Server error (includes details in response)

### POST /api/documents/signature-fields/{documentId}
**Purpose**: Save signature field placements

**Request**:
```typescript
Field[] = [
  {
    pageNumber: number
    x: number  // 0-1 normalized
    y: number  // 0-1 normalized
    width: number  // 0-1 normalized
    height: number  // 0-1 normalized
    label?: string
    assignedEmployeeId?: string
  }
]
```

## Component Props

### DocumentsPageClient

**New State**:
```typescript
// Access permissions (configurable in upload modal)
const [canViewAdmin, setCanViewAdmin] = useState(true);
const [canViewManager, setCanViewManager] = useState(true);
const [canViewEmployee, setCanViewEmployee] = useState(true);

// Placement pending state
const [placementPendingDocId, setPlacementPendingDocId] = useState<string | null>(null);
const [placementPendingDocName, setPlacementPendingDocName] = useState<string | null>(null);
const [sendingNotifications, setSendingNotifications] = useState(false);
```

**Key Functions**:
- `handleUpload`: Uploads document, sets placement pending if `requiresSignature=true`
- `handlePlacementComplete`: Sends notifications after field placement
- `handlePlacementCancel`: Handles cancellation with warning toast
- `resetUploadForm`: Resets all form state including access permissions

### FieldPlacementModal

**Props**:
```typescript
{
  isOpen: boolean
  onClose: () => void
  documentId: string
  url: string
  saveMode?: "server" | "local"  // default: "server"
  onSaveFields?: (fields: Field[]) => void  // for local mode
  onSaveComplete?: () => Promise<void>  // triggered after save
  sendingNotifications?: boolean  // shows loading state
}
```

**Behavior**:
- When `onSaveComplete` is provided:
  - Button text: "Save & Send Notifications"
  - After saving fields, calls `onSaveComplete()`
  - Shows loading state during notification send
- When `onSaveComplete` is NOT provided:
  - Button text: "Save"
  - Simply saves and closes

## Edge Cases Handled

### 1. Network Failure During Upload
- **Scenario**: Upload request fails
- **Handling**: Error toast with clear message, form remains open for retry
- **User Action**: Fix network issue and retry upload

### 2. Network Failure During Notification Send
- **Scenario**: `/api/documents/send-notifications` fails
- **Handling**: 
  - Error toast with message
  - Document remains in "placement incomplete" state
  - Admin can retry from document actions menu
- **Recovery**: Admin uses "Place Signature Fields" action to retry

### 3. Admin Closes Placement Modal Without Saving
- **Scenario**: Admin clicks Cancel or X button on placement modal
- **Handling**:
  - Warning toast (6 second duration) explaining:
    - Document is uploaded
    - Notifications NOT sent
    - Can complete placement later
  - Modal closes, upload modal closes
  - Document appears in list but no notifications sent
- **Recovery**: Admin can complete placement later via document actions

### 4. Partial Notification Failure
- **Scenario**: Some emails send, others fail (e.g., invalid email addresses)
- **Handling**:
  - Individual email failures logged to console
  - Success count returned to client
  - Toast shows number of successful sends
- **Note**: This is acceptable as invalid emails are data quality issues

### 5. User Session Expires During Process
- **Scenario**: Session expires between upload and notification send
- **Handling**:
  - Upload succeeds (session was valid)
  - Notification send returns 401
  - Error toast prompts re-authentication
  - After re-auth, admin can complete placement from document list
- **Recovery**: Standard session renewal flow

## User Experience

### Success Flow (Happy Path)
1. Admin uploads document with `requiresSignature=true`
2. Access permissions configured via switches (defaults: all true)
3. Success toast: "Document uploaded successfully!"
4. Field placement modal opens automatically
5. Admin places signature fields
6. Clicks "Save & Send Notifications"
7. Loading state: "Sending notifications..."
8. Success toast: "Notifications sent to X recipient(s)"
9. Modal closes, document list refreshes

### Cancellation Flow
1. Admin uploads document with `requiresSignature=true`
2. Access permissions configured
3. Success toast: "Document uploaded successfully!"
4. Field placement modal opens
5. Admin clicks "Cancel"
6. Warning toast (6s): "Field placement not completed. The document is uploaded but notifications have not been sent. You can complete placement later from the document actions menu."
7. Modal closes, upload modal closes
8. Document appears in list with signature requirement
9. Later: Admin can use dropdown menu → "Place Signature Fields" → Save to send notifications

## Testing Scenarios

### Required Tests

1. **Normal Upload Without Signature**
   - Upload document with `requiresSignature=false`
   - Verify notifications sent immediately
   - Verify access permissions respected

2. **Upload With Signature - Complete Flow**
   - Upload document with `requiresSignature=true`
   - Verify placement modal opens
   - Place fields and save
   - Verify notifications sent
   - Verify document ready for signing

3. **Upload With Signature - Cancellation**
   - Upload document with `requiresSignature=true`
   - Cancel placement modal
   - Verify warning toast appears
   - Verify document exists but no notifications sent
   - Complete placement later from actions menu
   - Verify notifications sent on retry

4. **Network Failure - Upload**
   - Simulate upload API failure
   - Verify error toast
   - Verify form remains open
   - Retry after fixing issue

5. **Network Failure - Notifications**
   - Upload succeeds
   - Simulate notification API failure
   - Verify error toast with recovery instructions
   - Verify can retry from actions menu

6. **Access Permission Configuration**
   - Upload document with custom access permissions
   - Verify switches work correctly
   - Verify permissions saved to database
   - Verify document visibility respects permissions

## Migration Notes

### Backward Compatibility
- Access permissions default to `true` (same as hardcoded behavior)
- Existing documents unaffected
- New switch UI is additive, doesn't break existing flows

### Database Schema
No schema changes required. Existing columns used:
- `Document.canViewAdmin`
- `Document.canViewManager`
- `Document.canViewEmployee`
- `Document.requiresSignature`

## Security Considerations

1. **Authorization**: All API endpoints check user role (admin/super_admin only)
2. **Company Isolation**: Documents scoped to user's `companyId`
3. **Signed URLs**: Document URLs are time-limited signed URLs from Supabase
4. **Email Validation**: Only send to users with valid email addresses
5. **Input Validation**: FormData validated via Zod schema

## Performance Notes

- Notification emails sent in chunks of 50 to avoid rate limits
- Field placement uses `requestAnimationFrame` for smooth dragging
- Document preview uses embedded PDF viewer (browser-native)
- Modal state managed in parent to avoid prop drilling

## Future Enhancements

1. **Reminder System**: Automated reminders for incomplete placement
2. **Bulk Field Placement**: Place fields on multiple pages at once
3. **Field Templates**: Save common field layouts for reuse
4. **Analytics**: Track completion rates and time-to-sign metrics
5. **Audit Trail**: Log all placement and notification events
