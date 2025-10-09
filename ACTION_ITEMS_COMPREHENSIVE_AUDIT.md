# 🎯 ACTION ITEMS COMPREHENSIVE AUDIT & IMPLEMENTATION PLAN

**Date**: January 9, 2025  
**Status**: Analysis Complete - Implementation Required

---

## 📊 **CURRENT STATE ANALYSIS**

### **What's Already Integrated** ✅

Based on the codebase audit, the following workflows ARE currently integrated with Action Items:

1. **Onboarding Tasks** ✅
   - Onboarding step instances show as action items
   - Can be completed from dashboard
   - Navigate to `/onboarding` on action

2. **Document Acknowledgements** ✅
   - Documents requiring acknowledgement appear as action items
   - Documents requiring signatures appear as action items
   - Preview and acknowledge inline

3. **Transactional Change Requests** ✅
   - Employee data change requests show in action items
   - Approve/decline functionality
   - Shows proposed changes with diffs

4. **Leave Approvals** (Managers) ✅
   - Pending leave requests show for managers
   - Approve/decline with comments
   - Shows employee details and dates

5. **AI Bulk Update Approvals** ✅
   - AI-generated bulk changes require approval
   - Shows affected employees and changes
   - Approve/decline with reasoning

6. **Survey Completion** ✅
   - Assigned surveys show as action items
   - Direct link to survey completion
   - Due date tracking with urgency

7. **Workflow-Generated Tasks** ✅
   - Generic tasks from automation workflows
   - Completion tracking
   - Related employee context

---

## ❌ **CRITICAL GAPS IDENTIFIED**

### **1. Performance Reviews** ❌ **CRITICAL**

**Current State**: Performance review templates exist, but NO action item integration

**Missing Functionality**:
- ❌ No action items created when review cycles are launched
- ❌ No reminders for overdue reviews
- ❌ No tracking of pending self-reviews, peer reviews, manager reviews
- ❌ No admin visibility of review completion status
- ❌ 360° reviews don't generate action items for multiple reviewers
- ❌ No escalation when reviews are overdue

**Impact**: 
- Reviews can be forgotten
- No central tracking for HR/managers
- Missing performance cycle deadlines
- Poor user experience

---

### **2. Time Off / Leave Requests** ❌ **HIGH PRIORITY**

**Current State**: Leave requests exist but only managers see them in action items

**Missing Functionality**:
- ❌ Employees don't see "Pending Manager Approval" status in their action items
- ❌ No tracking when HR needs to review/approve
- ❌ No reminders for managers when leave requests are overdue for approval
- ❌ No action items for employees to provide additional info if requested
- ❌ Multi-stage approvals don't create action items for each stage

---

### **3. Offboarding Workflows** ❌ **HIGH PRIORITY**

**Current State**: Offboarding model exists, NO action item integration

**Missing Functionality**:
- ❌ Exit interview scheduling doesn't create action items
- ❌ Equipment return reminders not in action items
- ❌ Access revocation tasks not tracked
- ❌ Final payroll/documentation review not in action items
- ❌ Manager handover tasks not tracked
- ❌ HR checklist items not visible in action items

---

### **4. Performance 1-2-1 Meetings** ❌ **MEDIUM PRIORITY**

**Current State**: Performance meetings exist but NO action item integration

**Missing Functionality**:
- ❌ Scheduled 1-2-1s don't create action items for attendees
- ❌ Meeting preparation reminders not in action items
- ❌ Action items from meetings not tracked in unified action items
- ❌ Follow-up tasks from meetings not visible
- ❌ Overdue meeting notes don't show as action items

---

### **5. Form Assignments** ❌ **MEDIUM PRIORITY**

**Current State**: Custom forms exist, but only surveys integrated

**Missing Functionality**:
- ❌ General form assignments (not surveys) don't create action items
- ❌ Performance review forms not integrated
- ❌ Probation review forms not tracked
- ❌ Custom HR forms not visible in action items

---

### **6. Document Uploads (Employee-Required)** ❌ **MEDIUM PRIORITY**

**Current State**: Document acknowledgement works, but document upload requests don't

**Missing Functionality**:
- ❌ When HR requests a document (passport, visa, certificate), no action item created
- ❌ Employees don't see "Upload Requested Documents" in action items
- ❌ Overdue document uploads not tracked
- ❌ No reminder escalation for missing documents

---

### **7. Employment Checks** ❌ **LOW PRIORITY**

**Current State**: Employment checks model exists, NO action item integration

**Missing Functionality**:
- ❌ Reference checks not in action items
- ❌ Background verification tasks not tracked
- ❌ Expiring visa/work permit checks not flagged
- ❌ Right-to-work verification not in action items

---

### **8. Admin Action Items Dashboard** ❌ **CRITICAL**

**Current State**: Action items are per-user, NO global admin view

**Missing Functionality**:
- ❌ No admin dashboard showing ALL outstanding action items across company
- ❌ No filtering by type (reviews, approvals, documents, etc.)
- ❌ No visibility of overdue items by team/department
- ❌ No reporting on action item completion rates
- ❌ No escalation view for stuck items
- ❌ No summary metrics (total pending, total overdue, by priority)

**This is CRITICAL for admin oversight!**

---

## 🎯 **IMPLEMENTATION PLAN**

### **Phase 1: Critical Performance Review Integration** 🚀

#### **Step 1: Create Action Items on Review Cycle Launch**

When a performance review cycle is created:
1. For each employee in scope (based on audienceFilters):
   - **Self-Review Action Item** (if self-review enabled)
     - Type: `PERFORMANCE_SELF_REVIEW`
     - Assigned to: Employee
     - Due date: Cycle start + self-review offset days
     - Priority: HIGH if < 3 days to due date
   
   - **Manager Review Action Item** (if manager review enabled)
     - Type: `PERFORMANCE_MANAGER_REVIEW`
     - Assigned to: Employee's manager
     - Due date: Cycle start + manager review offset days
     - Priority: HIGH if < 3 days to due date
   
   - **Peer Review Action Items** (if peer reviews enabled)
     - Type: `PERFORMANCE_PEER_REVIEW`
     - Assigned to: Each selected peer (min/max reviewers logic)
     - Due date: Cycle start + peer review offset days
     - Multiple action items (one per peer reviewer)
   
   - **360° Reviews**
     - Create action items for all configured reviewer roles
     - Track each submission separately

#### **Step 2: Update Action Item Status Based on Review Submission**

When a review is submitted:
- Mark the corresponding action item as `COMPLETED`
- Set `completedAt` timestamp
- Remove from pending action items list

#### **Step 3: Escalation & Reminders**

- **3 days before due**: Send reminder notification
- **On due date**: Send urgent reminder + mark as HIGH priority
- **After due date**: Mark as OVERDUE, show in red, send escalation to admin

---

### **Phase 2: Admin Global Action Items Dashboard** 🎯

#### **New Page: `/admin/action-items`**

**Features**:
- **Summary Cards**:
  - Total Pending Action Items
  - Total Overdue Action Items
  - Items Due Today
  - Items Due This Week
  
- **Filter Panel**:
  - By Type (Performance Reviews, Leave Approvals, Documents, Surveys, etc.)
  - By Status (Pending, Overdue, Completed)
  - By Priority (High, Medium, Low)
  - By Department
  - By Assignee

- **Action Items Table**:
  - Columns: Type, Title, Assigned To, Employee, Due Date, Priority, Status, Actions
  - Sortable by all columns
  - Bulk actions (Reassign, Cancel, etc.)
  - Export to CSV

- **Overdue Items Section**:
  - Highlight overdue reviews, approvals, documents
  - Escalation actions (Reassign, Send Reminder, Cancel)
  - Shows days overdue

- **Department/Team View**:
  - Group by department
  - Show completion rates
  - Identify bottlenecks

---

### **Phase 3: Other Workflow Integrations** 📋

#### **A. Leave Requests**
```typescript
// When leave request is created
await createActionItem({
  type: "LEAVE_APPROVAL",
  title: `Approve leave request for ${employee.name}`,
  assignedToId: managerId,
  relatedEmployeeId: employeeId,
  dueDate: addDays(new Date(), 3), // 3 days to review
  priority: "MEDIUM",
  metadata: { leaveRequestId, startDate, endDate, type }
});

// When employee awaits HR approval (multi-stage)
await createActionItem({
  type: "LEAVE_HR_APPROVAL",
  title: `HR review required for ${employee.name}'s leave`,
  assignedToId: hrManagerId,
  metadata: { leaveRequestId }
});
```

#### **B. Offboarding**
```typescript
// When offboarding is initiated
const offboardingTasks = [
  { type: "EXIT_INTERVIEW", assignedTo: hrManager, dueOffset: 7 },
  { type: "EQUIPMENT_RETURN", assignedTo: employee, dueOffset: 0 },
  { type: "ACCESS_REVOCATION", assignedTo: itAdmin, dueOffset: 1 },
  { type: "FINAL_PAYROLL", assignedTo: payrollAdmin, dueOffset: 14 },
  { type: "HANDOVER_TASKS", assignedTo: manager, dueOffset: 7 },
];

offboardingTasks.forEach(task => createActionItem({...}));
```

#### **C. 1-2-1 Meetings**
```typescript
// 24 hours before meeting
await createActionItem({
  type: "MEETING_PREPARATION",
  title: `Prepare for 1-2-1 with ${otherPerson.name}`,
  assignedToId: userId,
  dueDate: subHours(meetingTime, 24),
  metadata: { meetingId }
});

// After meeting, if action items were created
meetingActionItems.forEach(item => createActionItem({
  type: "MEETING_ACTION_ITEM",
  title: item.description,
  assignedToId: item.assigneeId,
  dueDate: item.dueDate,
  metadata: { meetingId, meetingActionItemId: item.id }
}));
```

#### **D. Document Upload Requests**
```typescript
// When HR requests document upload
await createActionItem({
  type: "DOCUMENT_UPLOAD_REQUEST",
  title: `Upload required: ${documentType}`,
  assignedToId: employeeUserId,
  dueDate: uploadDeadline,
  priority: "HIGH",
  metadata: { documentType, requestId }
});
```

---

## 🏗️ **TECHNICAL IMPLEMENTATION**

### **1. Database Schema (No Changes Needed)** ✅

The existing `ActionItem` model supports all required fields:
- `type` (string) - Can be any workflow type
- `status` (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `priority` (HIGH, MEDIUM, LOW)
- `dueDate` - For deadline tracking
- `assignedToId` - User assignment
- `relatedEmployeeId` - Context for employee-related actions
- `metadata` (JSON) - Flexible data storage

### **2. New API Endpoints Required**

#### **A. `/api/admin/action-items` (GET)**
- Fetch ALL action items across company
- Support filtering, pagination, sorting
- Include employee, assignee, and department info

#### **B. `/api/admin/action-items/stats` (GET)**
- Return summary statistics
- Overdue counts by type
- Completion rates
- Department breakdowns

#### **C. `/api/admin/action-items/[id]/reassign` (POST)**
- Admin can reassign action items
- Notify new assignee
- Log reassignment in audit trail

#### **D. `/api/performance/review-cycles/[id]/launch` (POST)**
- Launch review cycle
- Create action items for all participants
- Send notifications

#### **E. `/api/action-items/bulk` (POST)**
- Create multiple action items at once
- Used by review cycle launch
- Returns created items

### **3. Helper Functions**

#### **`createActionItem()`**
```typescript
export async function createActionItem({
  companyId,
  type,
  title,
  description,
  assignedToId,
  relatedEmployeeId,
  dueDate,
  priority = "MEDIUM",
  metadata = {}
}: CreateActionItemParams) {
  return await prisma.actionItem.create({
    data: {
      id: crypto.randomUUID(),
      companyId,
      type,
      title,
      description,
      assignedToId,
      relatedEmployeeId,
      dueDate,
      priority,
      status: "PENDING",
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
}
```

#### **`createReviewCycleActionItems()`**
```typescript
export async function createReviewCycleActionItems(
  cycleId: string,
  companyId: string
) {
  const cycle = await prisma.performanceReviewCycle.findUnique({
    where: { id: cycleId },
    include: { template: true }
  });

  const { audienceFilters, reviewerAssignments } = cycle.template;
  
  // Get employees in scope
  const employees = await getEmployeesInScope(companyId, audienceFilters);
  
  const actionItems = [];
  
  for (const employee of employees) {
    for (const reviewer of reviewerAssignments) {
      const assignedToId = getReviewerUserId(employee, reviewer.role);
      
      actionItems.push({
        companyId,
        type: `PERFORMANCE_${reviewer.role}_REVIEW`,
        title: `Complete ${reviewer.role} review for ${employee.name}`,
        assignedToId,
        relatedEmployeeId: employee.id,
        dueDate: addDays(cycle.startDate, reviewer.dueOffsetDays),
        priority: reviewer.isRequired ? "HIGH" : "MEDIUM",
        metadata: {
          cycleId,
          templateId: cycle.templateId,
          reviewerRole: reviewer.role,
          isRequired: reviewer.isRequired
        }
      });
    }
  }
  
  // Bulk create
  return await prisma.actionItem.createMany({ data: actionItems });
}
```

---

## 📈 **SUCCESS METRICS**

### **User Experience**
- ✅ All user actions consolidated in one place
- ✅ Zero forgotten reviews or approvals
- ✅ Clear visibility of pending work
- ✅ Automated reminders and escalations

### **Admin Oversight**
- ✅ Complete visibility of all outstanding work
- ✅ Identify bottlenecks and overdue items
- ✅ Department-level completion tracking
- ✅ Proactive intervention on stuck items

### **Business Impact**
- ✅ Faster approval cycles
- ✅ Higher review completion rates
- ✅ Reduced administrative overhead
- ✅ Better compliance (timely reviews, documents, etc.)

---

## 🚀 **ROLLOUT PLAN**

### **Week 1: Foundation**
1. Create admin action items dashboard UI
2. Build admin API endpoints
3. Test with existing action items

### **Week 2: Performance Reviews**
1. Implement review cycle action item creation
2. Add completion tracking
3. Build reminders and escalations
4. Test end-to-end review cycle

### **Week 3: Remaining Workflows**
1. Integrate leave requests
2. Integrate offboarding
3. Integrate 1-2-1 meetings
4. Integrate document requests

### **Week 4: Testing & Refinement**
1. End-to-end testing
2. User acceptance testing
3. Bug fixes and polish
4. Documentation

---

## ✅ **CONFIRMATION: PERFORMANCE REVIEWS**

**YES**, Performance Review Templates **WILL** be completed via Action Items:

1. **When a review cycle is launched**:
   - Action items are created for every reviewer role configured in the template
   - Employees see "Complete Self-Review" in their action items
   - Managers see "Complete Manager Review for [Employee]"
   - Peers see "Complete Peer Review for [Employee]"
   - 360° participants see their respective review tasks

2. **Review Submission**:
   - Clicking the action item takes user directly to the review form
   - Upon submission, action item is marked COMPLETED
   - Removed from pending list

3. **Admin Visibility**:
   - Admins see ALL pending reviews in global dashboard
   - Can see overdue reviews by department
   - Can send reminders or reassign stuck reviews

---

## 📋 **COMPLETE WORKFLOW COVERAGE**

### **Currently Integrated** ✅
1. Onboarding tasks
2. Document acknowledgements & signatures
3. Transactional change requests
4. Leave approvals (manager view)
5. AI bulk update approvals
6. Survey completion
7. Workflow-generated tasks

### **Will Be Integrated** 🚀
8. **Performance Reviews** (ALL TYPES)
9. **1-2-1 Meetings**
10. **Leave Requests** (employee + multi-stage)
11. **Offboarding Tasks**
12. **Form Assignments**
13. **Document Upload Requests**
14. **Employment Checks**
15. **Meeting Action Items**

### **Admin Global View** 🎯
- **New**: `/admin/action-items` dashboard
- Shows ALL outstanding work across the company
- Filterable by type, department, assignee, status
- Overdue escalation view
- Department completion tracking
- Bulk actions and reassignment

---

## 🎉 **EXPECTED OUTCOME**

After implementation:
- ✅ **100% workflow coverage** - Every user-facing task flows through action items
- ✅ **Zero duplicate systems** - One unified task management system
- ✅ **Complete admin visibility** - Global oversight dashboard
- ✅ **Proactive management** - Automated reminders and escalations
- ✅ **Better UX** - Users see all their work in one place
- ✅ **Compliance** - Nothing falls through the cracks

---

**Status**: Ready for Implementation  
**Priority**: CRITICAL - This is foundational infrastructure  
**Effort**: ~2 weeks (with proper testing)
