# Document Action Item Deletion Fix

## Problem Summary
When documents requiring read acknowledgments or signatures were deleted, the associated action items remained in the system, creating orphaned tasks that users could not complete.

## Root Cause Analysis
The document deletion process only removed:
- Document records
- Document signature artifacts  
- Document acknowledgements

But it did **not** delete the associated action items:
- `DOCUMENT_ACKNOWLEDGEMENT` action items
- `DOCUMENT_SIGNATURE` action items

## Files Modified

### 1. `app/api/documents/delete/route.ts`
**Changes Made:**
- Added deletion of `DOCUMENT_ACKNOWLEDGEMENT` action items before document deletion
- Added deletion of `DOCUMENT_SIGNATURE` action items before document deletion
- Both deletions use metadata query with `equals` to find action items with matching `documentId`

**Code Added:**
```typescript
// Delete action items for document acknowledgements
prisma.actionItem.deleteMany({
  where: {
    companyId: session.user.companyId,
    type: "DOCUMENT_ACKNOWLEDGEMENT",
    metadata: {
      path: ["documentId"],
      equals: doc.id,
    },
  },
}),
// Delete action items for document signatures
prisma.actionItem.deleteMany({
  where: {
    companyId: session.user.companyId,
    type: "DOCUMENT_SIGNATURE",
    metadata: {
      path: ["documentId"],
      equals: doc.id,
    },
  },
}),
```

### 2. `app/api/employees/[id]/route.ts`
**Changes Made:**
- Added action item deletion when employee-specific documents are deleted (lines 276-287)
- Added action item deletion when company-level documents are deleted as last resort (lines 346-357)
- Both scenarios properly clean up associated action items
- **IMPORTANT:** Uses individual loops for each document since Prisma doesn't support `in` operator for JSON metadata filters

**Code Added:**
```typescript
// Delete action items for these employee documents
const employeeDocIds = employeeDocs.map(doc => doc.id);
for (const docId of employeeDocIds) {
  await tx.actionItem.deleteMany({
    where: {
      companyId,
      type: { in: ["DOCUMENT_ACKNOWLEDGEMENT", "DOCUMENT_SIGNATURE"] },
      metadata: {
        path: ["documentId"],
        equals: docId,
      },
    },
  });
}
```

## TypeScript Compatibility Fix

### Issue Encountered
Initial implementation used `in` operator for JSON metadata filters:
```typescript
metadata: {
  path: ["documentId"],
  in: employeeDocIds, // ❌ TypeScript error - 'in' doesn't exist on JsonNullableFilter
}
```

### Resolution
Changed to individual document processing using `equals` operator:
```typescript
for (const docId of employeeDocIds) {
  await tx.actionItem.deleteMany({
    where: {
      companyId,
      type: { in: ["DOCUMENT_ACKNOWLEDGEMENT", "DOCUMENT_SIGNATURE"] },
      metadata: {
        path: ["documentId"],
        equals: docId, // ✅ TypeScript compatible
      },
    },
  });
}
```

## Action Item Creation Flow (For Reference)

### Document Acknowledgements
- **Created in:** `app/api/documents/upload/route.ts` (lines 328-370)
- **Type:** `DOCUMENT_ACKNOWLEDGEMENT`
- **Metadata contains:** `documentId`, `documentName`, `documentPath`, etc.

### Document Signatures  
- **Created in:** `app/api/documents/signature-fields/[documentId]/route.ts` (lines 171-192)
- **Type:** `DOCUMENT_SIGNATURE`
- **Metadata contains:** `documentId`, `documentName`, `documentPath`, etc.

## Database Schema Considerations

### Cascading Deletes
The following tables already have `onDelete: Cascade` with Document:
- `DocumentSignatureDepartment`
- `DocumentSignatureJobRole`
- `DocumentSignatureEmployee` 
- `DocumentSignatureField`

### Manual Cleanup Required
`ActionItem` table does not have a foreign key relationship with Document, so manual deletion is required using metadata queries.

## Testing

### Test Script Created
`test_document_action_item_deletion.js` - Comprehensive test covering:
1. Document deletion via documents API
2. Document deletion via employee deletion
3. Both employee-specific and company-level documents
4. Verification that all action items are properly cleaned up
5. Uses the same individual document approach as the production code

### Running the Test
```bash
node test_document_action_item_deletion.js
```

## Impact Assessment

### Before Fix
- ❌ Orphaned action items remained when documents deleted
- ❌ Users had incomplete/invalid action items in their dashboard
- ❌ Database contained unreferenced action item records
- ❌ TypeScript compilation errors

### After Fix  
- ✅ All document-related action items are deleted when document is deleted
- ✅ Clean dashboard experience with no orphaned tasks
- ✅ Database integrity maintained
- ✅ Works for both direct document deletion and employee deletion scenarios
- ✅ TypeScript compilation passes without errors

## Edge Cases Covered

1. **Employee-specific documents** - Deleted when employee is removed
2. **Company-level documents** - Deleted when uploader is removed (as last resort)
3. **Documents with both acknowledgments and signatures** - Both action item types cleaned up
4. **Documents with multiple assignees** - All related action items removed
5. **TypeScript compilation** - Uses compatible Prisma query syntax

## Performance Considerations

### Individual Document Processing
- **Why:** Prisma JSON filters don't support `in` operator
- **Impact:** Slightly more database queries but ensures type safety
- **Optimization:** Still uses transactions for atomicity
- **Scalability:** Acceptable for typical document deletion scenarios (usually < 100 docs per employee)

## Transaction Safety
All deletions are wrapped in database transactions to ensure:
- Atomicity - Either all related records are deleted or none
- Consistency - Database remains in valid state
- No orphaned records left behind

## Future Considerations

1. **Database Schema Enhancement** - Consider adding foreign key relationship from ActionItem to Document for automatic cascading
2. **Soft Delete Implementation** - If implementing soft deletes, ensure action items are also soft-deleted
3. **Audit Trail** - Consider logging when action items are deleted due to document removal
4. **Batch Optimization** - Consider using raw SQL for bulk deletions if performance becomes an issue

## Verification Steps

1. Upload a document requiring acknowledgment/signature
2. Verify action items are created in dashboard
3. Delete the document (or employee with attached documents)
4. Verify action items are removed from dashboard
5. Check database to confirm no orphaned action items exist
6. Run TypeScript compilation to ensure no type errors

The fix ensures complete cleanup of document-related action items in all deletion scenarios while maintaining TypeScript compatibility.
