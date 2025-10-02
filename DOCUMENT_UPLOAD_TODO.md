# Document Upload AI - Remaining Implementation

## ✅ What's Complete

### Frontend (100% Done)
- [x] Drag & drop UI with visual feedback
- [x] File preview cards with size display
- [x] Multiple file support
- [x] Remove file functionality
- [x] Drag overlay with animation
- [x] File metadata passed to API

### Backend Logic (95% Done)
- [x] Conversational flow (multi-step)
- [x] Employee name lookup
- [x] Category suggestions based on filename
- [x] Signature requirement questions
- [x] Due date handling
- [x] Preview generation
- [x] Pending action state management
- [x] Intent classification

## ❌ What Needs Implementation

### File Upload Integration (Backend)

**Location:** `app/lib/ai/action-executor.ts` - Line 969-984

**Current Code (Pseudocode):**
```typescript
// Step 6: Execute upload
if (confirmed && pending.step >= 3) {
  try {
    const data = pending.data;
    
    // Upload to Supabase storage
    const filePath = `${action.companyId}/${data.employeeId}/${crypto.randomUUID()}-${data.file.name}`;
    
    // Note: This is pseudocode - actual implementation needs proper file handling
    // For now, return success with instructions
    clearPendingAction(action.userId, action.companyId);

    return {
      success: true,
      message: `✅ Document uploaded...`,
      data: { filePath, employeeId: data.employeeId },
    };
  }
}
```

**Needs to Become:**
```typescript
// Step 6: Execute upload
if (confirmed && pending.step >= 3) {
  try {
    const data = pending.data;
    
    // ACTUAL Supabase upload
    import supabase from '@/lib/supabase-admin';
    
    const arrayBuffer = await data.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const path = `${action.companyId}/${data.employeeId}/${crypto.randomUUID()}-${data.file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, buffer, {
        contentType: data.file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create signed URL
    const { data: signed, error: signErr } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 31536000); // 1 year

    if (signErr) {
      throw new Error(`Failed to create signed URL: ${signErr.message}`);
    }

    // Create database record
    const document = await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        name: data.file.name,
        category: data.category,
        path,
        url: signed.signedUrl,
        size: data.file.size,
        type: data.file.type,
        uploaderId: action.userId,
        employeeId: data.employeeId,
        companyId: action.companyId,
        requiresSignature: data.requiresSignature || false,
        requiresAck: !data.requiresSignature, // If no signature, require acknowledgement
        signatureDueAt: data.signatureDueDate ? new Date(data.signatureDueDate) : null,
        canViewAdmin: true,
        canViewManager: true,
        canViewEmployee: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // Send notification if signature required
    if (data.requiresSignature) {
      // Use existing notification system
      import { resend } from '@/lib/resend';
      import { buildDocumentNotificationEmail } from '@/lib/email/documentNotifications';
      
      const employee = await prisma.employee.findUnique({
        where: { id: data.employeeId },
        include: { User: true }
      });

      if (employee?.User.email) {
        const emailHtml = buildDocumentNotificationEmail({
          employeeName: `${employee.User.firstName} ${employee.User.lastName}`,
          documentName: data.file.name,
          category: data.category,
          dueDate: data.signatureDueDate,
          actionRequired: 'signature',
          documentUrl: signed.signedUrl
        });

        await resend.emails.send({
          from: 'PeopleCore <noreply@peoplecore.co.nz>',
          to: employee.User.email,
          subject: `Signature Required: ${data.file.name}`,
          html: emailHtml
        });
      }
    }

    clearPendingAction(action.userId, action.companyId);

    return {
      success: true,
      message: `✅ **Document uploaded successfully!**\n\n📄 **${data.file.name}**\n👤 **Assigned to:** ${data.employeeName}\n📁 **Category:** ${data.category}\n${data.requiresSignature ? `✏️ **Signature required** by ${data.signatureDueDate}\n📧 **Notification sent** to employee\n` : '📋 **No action required** from employee\n'}\n🔗 **View in:** Documents section\n\n_The document is now in the system and ${data.requiresSignature ? 'awaiting signature' : 'available to view'}._`,
      data: { documentId: document.id, filePath, employeeId: data.employeeId },
    };
  } catch (error: any) {
    clearPendingAction(action.userId, action.companyId);
    return {
      success: false,
      message: `❌ **Upload failed:** ${error.message}\n\nPlease try again or upload manually through the Documents section.`,
    };
  }
}
```

---

## 🔧 Implementation Checklist

### Step 1: Add Imports
```typescript
// At top of app/lib/ai/action-executor.ts
import supabase from '@/lib/supabase-admin';
import { resend } from '@/lib/resend';
import { buildDocumentNotificationEmail } from '@/lib/email/documentNotifications';
import { Buffer } from 'buffer';
```

### Step 2: Handle File Object in API
**Problem**: File objects can't be JSON serialized

**Solution:** Store files temporarily in conversation memory or use different approach:

**Option A: Store in Memory**
```typescript
// In conversation-memory.ts
interface ConversationContext {
  ...
  temporaryFiles?: Map<string, File>;
}

// When file dropped
const fileId = crypto.randomUUID();
conv.temporaryFiles.set(fileId, file);

// Pass fileId in API call
payload.fileIds = [fileId];

// Retrieve in backend
const file = getTemporaryFile(fileId);
```

**Option B: Use FormData API** (Recommended)
```typescript
// In app/(withSidebar)/assistant/page.tsx

// Modify handleSendMessage for file uploads
if (uploadedFiles.length > 0) {
  // Use multipart/form-data for actual file upload
  const formData = new FormData();
  formData.append('message', messageText);
  uploadedFiles.forEach((file, idx) => {
    formData.append(`file${idx}`, file);
  });

  const res = await fetch("/api/ai/chat", {
    method: "POST",
    body: formData, // No Content-Type header (browser sets it)
  });
} else {
  // Regular JSON for text-only messages
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageText }),
  });
}
```

**Backend Handling:**
```typescript
// In app/api/ai/chat/route.ts

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type');
  
  let message: string;
  let files: File[] = [];
  
  if (contentType?.includes('multipart/form-data')) {
    // File upload
    const formData = await req.formData();
    message = formData.get('message') as string;
    
    // Extract all files
    const fileKeys = Array.from(formData.keys()).filter(k => k.startsWith('file'));
    files = fileKeys.map(key => formData.get(key) as File);
  } else {
    // Regular JSON
    const body = await req.json();
    message = body.message;
  }
  
  // Store files in conversation for use in handleDocumentUpload
  if (files.length > 0) {
    const conv = getConversation(session.user.id, session.user.companyId);
    conv.entities.pendingFiles = files;
  }
  
  // Process message as normal
  const result = await processUserMessage(message, userId, companyId);
  ...
}
```

### Step 3: Test End-to-End
```typescript
// Test script: tests/ai/document-upload.test.ts

describe('AI Document Upload', () => {
  it('should upload document via conversation', async () => {
    const file = new File(['test'], 'contract.pdf', { type: 'application/pdf' });
    
    // Step 1: Drop file
    const step1 = await fetch('/api/ai/chat', {
      method: 'POST',
      body: createFormData({ message: "I've uploaded contract.pdf", file })
    });
    const data1 = await step1.json();
    expect(data1.message).toContain('Who should I assign');
    
    // Step 2: Specify employee
    const step2 = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: "Michael Dowdle" })
    });
    const data2 = await step2.json();
    expect(data2.message).toContain('category');
    
    // Step 3: Category
    const step3 = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: "Employment contract" })
    });
    const data3 = await step3.json();
    expect(data3.message).toContain('signature');
    
    // Step 4: Signature + confirm
    const step4 = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: "Yes, by next Friday" })
    });
    const data4 = await step4.json();
    expect(data4.message).toContain('Upload now');
    
    // Step 5: Confirm
    const step5 = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: "Yes" })
    });
    const data5 = await step5.json();
    expect(data5.success).toBe(true);
    expect(data5.message).toContain('uploaded successfully');
    
    // Verify document in DB
    const doc = await prisma.document.findFirst({
      where: { name: 'contract.pdf' }
    });
    expect(doc).toBeTruthy();
    expect(doc.requiresSignature).toBe(true);
  });
});
```

---

## 🎨 UI Polish Opportunities

### Add File Upload Button
```tsx
// In chat input area
<div className="flex gap-2">
  <input
    type="file"
    multiple
    ref={fileInputRef}
    onChange={(e) => {
      const files = Array.from(e.target.files || []);
      setUploadedFiles(prev => [...prev, ...files]);
    }}
    className="hidden"
  />
  <Button
    variant="ghost"
    size="sm"
    onClick={() => fileInputRef.current?.click()}
    className="text-muted-foreground"
  >
    <Upload className="w-4 h-4 mr-2" />
    Upload
  </Button>
  <input ... /> {/* main input */}
  <Button ... /> {/* send button */}
</div>
```

### Progress Indicator for Uploads
```tsx
{uploading && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>Uploading {uploadedFiles[0].name}...</span>
    <span className="text-xs">{uploadProgress}%</span>
  </div>
)}
```

---

## 🎓 Developer Notes

### Why This Architecture?
1. **Separation of Concerns**: Intent → Action → Execution
2. **Reusable**: Same action handlers work via UI or API
3. **Testable**: Each handler can be unit tested
4. **Extensible**: Add new actions without changing infrastructure
5. **Auditable**: Full trail through action-executor

### Adding New Bulk Actions
```typescript
// Example: Bulk department transfer

// 1. Add parameters to intent classifier
PARAMETER EXTRACTION:
- targetDepartment: New department name

// 2. Enhance handleBulkUpdate() to support department field
if (field === 'department' || field === 'departmentId') {
  // Look up department
  const newDept = await prisma.department.findFirst({
    where: {
      companyId: action.companyId,
      name: { contains: value, mode: 'insensitive' }
    }
  });
  
  if (!newDept) {
    return { success: false, message: "Department not found" };
  }
  
  newValue = newDept.id;
}

// 3. Test
"Move all sales to the marketing department"
→ Finds sales employees
→ Shows preview
→ Updates departmentId for all
→ Audit logs created
```

---

## 📚 Reference: Existing Upload Code

### From /api/documents/upload/route.ts
```typescript
// Lines 107-403 contain the full upload implementation

Key parts to reuse:
1. FormData parsing (lines 115-150)
2. Supabase upload (lines 155-165)
3. Signed URL creation (lines 167-175)
4. Document DB record (lines 177-250)
5. M:N relationships (departments, job roles, signers)
6. Notification sending (lines 300-380)
7. Error handling (lines 385-403)

Just adapt it to work with conversation context!
```

---

## 🚀 Quick Win: Test Bulk Actions Now

You don't need to wait for document upload! Bulk actions are **fully functional** right now:

```
1. Open /assistant
2. Type: "How many people on the sales team?"
3. Follow up: "Give them a 10% raise"
4. Review preview
5. Say "Yes"
6. ✅ All 7 employees updated!
```

Try it and see the magic happen! 🎉

---

**Estimated Time to Complete Document Upload: 2-3 hours**

*Most of the hard work is done. Just needs the file handling glue!*

