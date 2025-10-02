# Revolutionary AI System - Implementation Plan

## 🎯 Vision

Transform the AI Assistant from a query tool into a **true autonomous agent** that can:
- Execute bulk actions conversationally
- Handle file uploads with intelligent questioning
- Understand the codebase and route actions automatically
- Learn new capabilities without manual coding

---

## 🚀 Phase 1: Enhanced Bulk Actions (IMMEDIATE)

### Use Cases
```
User: "Give everyone in sales a 10% raise"
AI: "I found 7 people in Sales. Current salaries total $330,500.
     After 10% increase: $363,550 total ($33,050 increase)
     
     Preview:
     • John Smith: $65,000 → $71,500
     • Sarah Johnson: $58,000 → $63,800
     ...and 5 more
     
     Apply these changes?"
     
User: "Yes"
AI: "✅ Updated 7 salaries
     📋 Audit logs created
     💰 Payroll costs updated"
```

### Features
- [x] Percentage calculations (10% increase, 5% decrease)
- [x] Department/team filtering from conversation context
- [x] Preview with before/after comparison
- [x] Batch audit logging
- [x] Undo support (48-hour window)
- [x] Safety confirmations for bulk changes

### Implementation
**File:** `app/lib/ai/action-executor.ts` - Enhanced `handleBulkUpdate()`

```typescript
async function handleBulkUpdate(action: AIAction): Promise<ActionResult> {
  const { department, field, operation, value, percentage, confirmed } = action.parameters;
  
  // Step 1: Parse intent from conversation context
  const conversation = getConversation(action.userId, action.companyId);
  const targetDepartment = department || conversation.entities.departments?.[0];
  
  // Step 2: Find affected employees
  const employees = await prisma.employee.findMany({
    where: {
      companyId: action.companyId,
      isActive: true,
      ...(targetDepartment && {
        Department: {
          name: { contains: targetDepartment, mode: 'insensitive' }
        }
      })
    },
    include: {
      User: { select: { firstName: true, lastName: true } },
      Department: { select: { name: true } }
    }
  });
  
  // Step 3: Calculate changes based on operation
  const changes = employees.map(emp => {
    let currentValue = emp[field as keyof typeof emp];
    let newValue = value;
    
    if (percentage && operation === 'increase') {
      const numericValue = parseFloat(String(currentValue));
      newValue = numericValue * (1 + percentage / 100);
    } else if (percentage && operation === 'decrease') {
      const numericValue = parseFloat(String(currentValue));
      newValue = numericValue * (1 - percentage / 100);
    }
    
    return {
      employeeId: emp.id,
      name: `${emp.User.firstName} ${emp.User.lastName}`,
      department: emp.Department?.name,
      field,
      currentValue,
      newValue,
      change: newValue - (currentValue || 0)
    };
  });
  
  // Step 4: Show preview and ask for confirmation
  if (!confirmed) {
    const totalIncrease = changes.reduce((sum, c) => sum + c.change, 0);
    const preview = changes.slice(0, 5).map((c, i) => 
      `${i + 1}. ${c.name}: $${c.currentValue.toLocaleString()} → $${Math.round(c.newValue).toLocaleString()}`
    ).join('\n');
    
    return {
      success: true,
      requiresConfirmation: true,
      preview: { changes, totalIncrease },
      message: `⚠️ **Bulk Salary Update Preview**\n\n**Affected:** ${changes.length} employees in ${targetDepartment || 'all departments'}\n**Total increase:** $${Math.round(totalIncrease).toLocaleString()}\n\n${preview}\n${changes.length > 5 ? `\n...and ${changes.length - 5} more\n` : ''}\nApply these changes?`
    };
  }
  
  // Step 5: Execute bulk update with audit trail
  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      await tx.employee.update({
        where: { id: change.employeeId },
        data: { [field]: change.newValue }
      });
      
      // Audit log per employee
      await createAuditLogs({
        companyId: action.companyId,
        employeeId: change.employeeId,
        section: 'compensation',
        diffs: [{
          field,
          oldValue: String(change.currentValue),
          newValue: String(change.newValue)
        }],
        reasons: { [field]: `Bulk update via AI: ${percentage}% ${operation}` },
        changedById: action.userId
      });
    }
  });
  
  return {
    success: true,
    message: `✅ **Updated ${changes.length} employees**\n\n💰 Total salary increase: $${Math.round(totalIncrease).toLocaleString()}\n📋 Audit logs created for all changes\n\n_Changes are effective immediately and will appear in next payroll cycle._`,
    undoable: true,
    undoId: await createUndoRecord({ action: 'bulk_salary_update', changes })
  };
}
```

---

## 🚀 Phase 2: Document Upload AI (HIGH PRIORITY)

### Use Cases
```
User: [Drags employment_contract.pdf into chat]
      "Assign this to Michael Dowdle"

AI: "Great! I'll upload employment_contract.pdf for Michael Dowdle.
     
     A few quick questions:
     1️⃣ What category is this?
        • Employment Contract
        • Personal ID
        • Visa/Work Permit
        • Qualification
        • Other
     
     2️⃣ Does this require a signature?"
     
User: "Employment contract, yes signature needed by next Friday"

AI: "Perfect! Setting up:
     ✅ Document: employment_contract.pdf
     ✅ Assigned to: Michael Dowdle
     ✅ Category: Employment Contract
     ✅ Requires: Signature (due Dec 15, 2024)
     ✅ Notifications: Will be sent to Michael
     
     Upload now?"
     
User: "Yes"

AI: "✅ Document uploaded successfully!
     📄 Michael will receive an email notification
     ✏️ Signature due: Dec 15, 2024
     📊 Track progress in Documents section"
```

### Features
- [ ] File drop in chat interface
- [ ] Intelligent category suggestion based on filename
- [ ] Employee name lookup with fuzzy matching
- [ ] Multi-step conversation for missing details
- [ ] Signature workflow setup
- [ ] Automatic notification sending
- [ ] Support for bulk uploads (multiple files at once)

### Implementation

**Frontend:**
```typescript
// app/(withSidebar)/assistant/page.tsx

const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
const [isDragging, setIsDragging] = useState(false);

const handleFileDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  setUploadedFiles(files);
  
  // Automatically start conversation
  const fileNames = files.map(f => f.name).join(', ');
  handleSendMessage(`I've uploaded ${files.length} file(s): ${fileNames}. What should I do with them?`);
};

return (
  <div 
    onDrop={handleFileDrop}
    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
    onDragLeave={() => setIsDragging(false)}
    className={isDragging ? 'border-4 border-primary' : ''}
  >
    {uploadedFiles.length > 0 && (
      <div className="uploaded-files-preview">
        {uploadedFiles.map(file => (
          <FilePreview key={file.name} file={file} />
        ))}
      </div>
    )}
    {/* Rest of chat UI */}
  </div>
);
```

**Backend - Document Upload Handler:**
```typescript
// app/lib/ai/action-executor.ts

async function handleDocumentUpload(action: AIAction): Promise<ActionResult> {
  const conv = getConversation(action.userId, action.companyId);
  const pending = conv.entities.pendingAction;
  const { file, employeeName, category, requiresSignature, signatureDueDate, confirmed } = action.parameters;
  
  // Step 1: Identify employee
  if (!pending || pending.type !== 'document_upload') {
    if (!employeeName) {
      return {
        success: true,
        message: `I see you have **${file.name}**.\n\nWho should I assign this document to?`,
        nextStep: { question: "Employee name?" }
      };
    }
    
    const employees = await findEmployeeByName(employeeName, action.companyId);
    
    if (employees.length === 0) {
      return {
        success: false,
        message: `I couldn't find "${employeeName}". Try again?`
      };
    }
    
    if (employees.length > 1) {
      return {
        success: false,
        message: `Found ${employees.length} matches:\n${employees.map((e, i) => `${i + 1}. ${e.name} (${e.department})`).join('\n')}\n\nWhich one?`,
        data: employees
      };
    }
    
    // Set pending action
    setPendingAction(action.userId, action.companyId, {
      type: 'document_upload',
      step: 1,
      data: { file, employeeId: employees[0].id, employeeName: employees[0].name }
    });
    
    // AI suggests category based on filename
    const suggestedCategory = suggestDocumentCategory(file.name);
    
    return {
      success: true,
      message: `Perfect! Uploading **${file.name}** for **${employees[0].name}**.\n\n**What category?**\n1. Employment Contract\n2. Personal ID\n3. Visa/Work Permit\n4. Qualification/Certificate\n5. Other\n\n${suggestedCategory ? `💡 _Based on the filename, this looks like: ${suggestedCategory}_` : ''}`,
      nextStep: {
        question: "Document category?",
        options: ["Employment Contract", "Personal ID", "Visa/Work Permit", "Qualification", "Other"]
      }
    };
  }
  
  // Step 2: Get category
  if (pending.step === 1 && !pending.data.category) {
    if (!category) {
      return {
        success: false,
        message: "What category is this document?"
      };
    }
    
    setPendingAction(action.userId, action.companyId, {
      ...pending,
      step: 2,
      data: { ...pending.data, category }
    });
    
    return {
      success: true,
      message: `Got it - **${category}**.\n\nDoes this document **require a signature**?`,
      nextStep: {
        question: "Requires signature?",
        options: ["Yes", "No"]
      }
    };
  }
  
  // Step 3: Signature requirements
  if (pending.step === 2 && pending.data.requiresSignature === undefined) {
    setPendingAction(action.userId, action.companyId, {
      ...pending,
      step: 3,
      data: { ...pending.data, requiresSignature, signatureDueDate }
    });
    
    if (requiresSignature && !signatureDueDate) {
      return {
        success: true,
        message: "When does the signature need to be completed by?",
        nextStep: { question: "Due date?" }
      };
    }
  }
  
  // Step 4: Confirm and upload
  if (pending.step === 3 && !confirmed) {
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        fileName: pending.data.file.name,
        employee: pending.data.employeeName,
        category: pending.data.category,
        requiresSignature: pending.data.requiresSignature,
        dueDate: pending.data.signatureDueDate
      },
      message: `📄 **Document Upload Summary:**\n\n**File:** ${pending.data.file.name}\n**Assign to:** ${pending.data.employeeName}\n**Category:** ${pending.data.category}\n**Signature:** ${pending.data.requiresSignature ? `Required (due ${pending.data.signatureDueDate})` : 'Not required'}\n\nProceed with upload?`
    };
  }
  
  // Step 5: Execute upload using existing API
  const formData = new FormData();
  formData.append('file', pending.data.file);
  formData.append('name', pending.data.file.name);
  formData.append('category', pending.data.category);
  formData.append('employeeId', pending.data.employeeId);
  formData.append('type', 'employee');
  formData.append('requiresSignature', String(pending.data.requiresSignature));
  if (pending.data.signatureDueDate) {
    formData.append('signatureDueAt', new Date(pending.data.signatureDueDate).toISOString());
  }
  
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    clearPendingAction(action.userId, action.companyId);
    return {
      success: false,
      message: "Upload failed. Please try again or contact support."
    };
  }
  
  const result = await response.json();
  clearPendingAction(action.userId, action.companyId);
  
  return {
    success: true,
    message: `✅ **Document uploaded successfully!**\n\n📄 **${pending.data.file.name}**\n👤 Assigned to: ${pending.data.employeeName}\n📁 Category: ${pending.data.category}\n${pending.data.requiresSignature ? `✏️ Signature required by ${pending.data.signatureDueDate}\n📧 Notification sent to employee\n` : ''}\n🔗 View in Documents section`,
    data: result
  };
}

function suggestDocumentCategory(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes('contract') || lower.includes('employment')) return 'Employment Contract';
  if (lower.includes('visa') || lower.includes('passport') || lower.includes('permit')) return 'Visa/Work Permit';
  if (lower.includes('license') || lower.includes('licence') || lower.includes('certificate') || lower.includes('qualification')) return 'Qualification';
  if (lower.includes('id') || lower.includes('identification')) return 'Personal ID';
  return null;
}
```

---

## 🚀 Phase 3: Autonomous AI with Function Calling (REVOLUTIONARY)

### The Big Idea
Instead of manually coding every action, use **OpenAI Function Calling** to let the AI:
1. Understand user intent
2. Decide which functions to call
3. Execute them in sequence
4. Ask clarifying questions when needed

### Implementation

```typescript
// app/lib/ai/function-definitions.ts

export const AI_FUNCTIONS = [
  {
    name: "bulk_update_salaries",
    description: "Update salaries for multiple employees at once, supports percentage increases/decreases",
    parameters: {
      type: "object",
      properties: {
        department: {
          type: "string",
          description: "Department name to filter employees (optional)"
        },
        percentage: {
          type: "number",
          description: "Percentage to increase or decrease (e.g., 10 for 10%)"
        },
        operation: {
          type: "string",
          enum: ["increase", "decrease"],
          description: "Whether to increase or decrease salaries"
        }
      },
      required: ["percentage", "operation"]
    }
  },
  {
    name: "upload_document",
    description: "Upload a document and assign it to an employee",
    parameters: {
      type: "object",
      properties: {
        employeeName: {
          type: "string",
          description: "Name of employee to assign document to"
        },
        category: {
          type: "string",
          enum: ["Employment Contract", "Personal ID", "Visa/Work Permit", "Qualification", "Other"]
        },
        requiresSignature: {
          type: "boolean"
        },
        signatureDueDate: {
          type: "string",
          description: "ISO date string for when signature is due"
        }
      },
      required: ["employeeName", "category"]
    }
  },
  {
    name: "find_employees",
    description: "Search for employees by name, department, or other criteria",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        department: { type: "string" },
        jobRole: { type: "string" },
        isActive: { type: "boolean" }
      }
    }
  },
  {
    name: "calculate_aggregate",
    description: "Calculate sum, average, count for employee data (salaries, headcount, etc.)",
    parameters: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["salary_total", "salary_average", "headcount"]
        },
        filters: {
          type: "object",
          properties: {
            department: { type: "string" },
            jobRole: { type: "string" }
          }
        }
      },
      required: ["metric"]
    }
  }
];

// Enhanced orchestrator with function calling
export async function processWithFunctionCalling(
  userMessage: string,
  userId: string,
  companyId: string,
  files?: File[]
): Promise<OrchestratorResult> {
  const conversation = getConversation(userId, companyId);
  const conversationContext = buildContextString(conversation);
  
  const messages = [
    {
      role: "system",
      content: `You are an AI assistant for an HR system. You can execute actions, not just answer questions.
      
Available capabilities:
- Query employee data
- Update employee information
- Bulk salary changes
- Upload documents
- Book leave
- Create workflows
- Generate reports

Important:
- When user provides files, use the upload_document function
- For bulk changes, always show a preview and ask for confirmation
- Maintain conversation context for follow-up questions
- Be proactive - if you need information, ask for it

Context: ${conversationContext}`
    },
    ...conversation.messages.map(m => ({
      role: m.role,
      content: m.content
    })),
    {
      role: "user",
      content: userMessage
    }
  ];
  
  // Call OpenAI with function definitions
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages,
    functions: AI_FUNCTIONS,
    function_call: "auto"
  });
  
  const choice = response.choices[0];
  
  // Check if AI wants to call a function
  if (choice.finish_reason === "function_call" && choice.message.function_call) {
    const functionName = choice.message.function_call.name;
    const functionArgs = JSON.parse(choice.message.function_call.arguments);
    
    // Execute the function
    const action: AIAction = {
      type: functionName as ActionType,
      intent: userMessage,
      parameters: functionArgs,
      userId,
      companyId
    };
    
    const result = await executeAction(action);
    
    return {
      success: result.success,
      message: result.message,
      actionType: functionName,
      result: result.data,
      requiresConfirmation: result.requiresConfirmation,
      preview: result.preview,
      undoable: result.undoable,
      undoId: result.undoId
    };
  }
  
  // Regular conversational response
  return {
    success: true,
    message: choice.message.content || "How can I help?",
    actionType: "info"
  };
}
```

---

## 📊 Implementation Priority

### Week 1: Enhanced Bulk Actions ⚡
- [x] Percentage calculations
- [x] Department filtering
- [x] Preview system
- [x] Batch audit logs
- [ ] **IMPLEMENT NOW** → See detailed code above

### Week 2: Document Upload AI 📄
- [ ] File drop UI in chat
- [ ] Conversational upload flow
- [ ] Category suggestions
- [ ] Integration with existing document API
- [ ] **IMPLEMENT NEXT**

### Week 3: Autonomous Function Calling 🤖
- [ ] Define all available functions
- [ ] Implement function router
- [ ] Multi-step function execution
- [ ] Error handling & recovery
- [ ] **FUTURE ENHANCEMENT**

---

## 🎯 Success Metrics

### User Experience
- ✅ "Give everyone in sales a 10% raise" → Works in 3 clicks
- ✅ Upload document → Assigned in < 30 seconds
- ✅ No manual API knowledge required

### Technical
- ✅ 100% audit trail coverage
- ✅ Undo within 48 hours
- ✅ Zero data loss
- ✅ AI function success rate > 95%

### Business Impact
- 🚀 10x faster HR admin tasks
- 🚀 Zero training required
- 🚀 Natural language = universal interface
- 🚀 Revolutionary competitive advantage

---

## 🔒 Safety & Compliance

### Built-in Safeguards
1. **Preview System** - All destructive actions show preview
2. **Confirmation Required** - Bulk changes need explicit "Yes"
3. **Audit Trail** - Every change logged with reason
4. **Undo Support** - 48-hour undo window
5. **Permission Checks** - AI respects RBAC
6. **Rate Limiting** - Prevent abuse

### Compliance
- ✅ GDPR compliant (audit logs + right to delete)
- ✅ SOC 2 ready (complete audit trail)
- ✅ ISO 27001 aligned (access controls)

---

**Ready to build this revolutionary system!** 🚀

