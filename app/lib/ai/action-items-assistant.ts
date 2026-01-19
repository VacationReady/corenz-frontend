/**
 * Action Items Assistant
 * Specialized AI assistant for managing action items system
 * Helps HR admins understand capabilities, track progress, and manage workflows
 */

import { openai, AI_CONFIG } from "./openai-client";

export interface ActionItemsAssistantParams {
  userMessage: string;
  companyId: string;
  userId: string;
  intent?: any;
}

export async function handleActionItemsRequest(params: ActionItemsAssistantParams) {
  const { userMessage, companyId, userId, intent } = params;

  // Route to specific handler based on request type
  if (isCapabilitiesQuestion(userMessage)) {
    return explainActionItemsCapabilities(userMessage);
  }

  if (isOverviewQuestion(userMessage)) {
    return provideActionItemsOverview(companyId);
  }

  if (isIntegrationQuestion(userMessage)) {
    return explainIntegrations(userMessage);
  }

  if (isPerformanceReviewQuestion(userMessage)) {
    return explainPerformanceReviewIntegration(userMessage);
  }

  if (isWorkflowQuestion(userMessage)) {
    return explainWorkflows(userMessage);
  }

  if (isAdminDashboardQuestion(userMessage)) {
    return explainAdminDashboard(userMessage);
  }

  // Default: Use AI to provide intelligent response
  return await provideIntelligentGuidance(userMessage, companyId, userId);
}

/**
 * Check if user is asking about action items capabilities
 */
function isCapabilitiesQuestion(message: string): boolean {
  const keywords = [
    "what can action items",
    "what do action items",
    "capabilities",
    "features",
    "what does action items",
    "action items do",
    "tell me about action items",
  ];
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Check if user wants overview/status
 */
function isOverviewQuestion(message: string): boolean {
  const keywords = [
    "overview",
    "status",
    "what's outstanding",
    "what's overdue",
    "show me action items",
    "pending action items",
    "how many action items",
  ];
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Check if asking about integrations
 */
function isIntegrationQuestion(message: string): boolean {
  const keywords = [
    "what integrates",
    "what's integrated",
    "what workflows",
    "integrated with",
    "action items integration",
  ];
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Check if asking about performance reviews
 */
function isPerformanceReviewQuestion(message: string): boolean {
  const keywords = [
    "performance review",
    "360 review",
    "review cycle",
    "manager review",
    "self review",
    "peer review",
  ];
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Check if asking about workflows
 */
function isWorkflowQuestion(message: string): boolean {
  const keywords = [
    "onboarding",
    "offboarding",
    "leave approval",
    "document acknowledgement",
    "survey completion",
  ];
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Check if asking about admin dashboard
 */
function isAdminDashboardQuestion(message: string): boolean {
  const keywords = [
    "admin dashboard",
    "global view",
    "see all action items",
    "track action items",
    "department breakdown",
    "export action items",
  ];
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Explain action items capabilities in detail
 */
async function explainActionItemsCapabilities(userMessage: string) {
  return {
    success: true,
    message: `# 🎯 **Action Items System - Complete Capabilities**

The Action Items system is your **unified task management hub** that integrates ALL user-facing workflows across the platform. Here's what it does:

## 🌟 **Core Capabilities**

### **1. Unified Task Hub**
- ✅ All employee tasks in ONE place
- ✅ Clear priorities (High, Medium, Low)
- ✅ Due date tracking with overdue alerts
- ✅ Status management (Pending, In Progress, Completed)

### **2. Performance Reviews** (FULL INTEGRATION)
- ✅ **Self-reviews** - Employees complete their own reviews
- ✅ **Manager reviews** - Managers review their direct reports
- ✅ **Peer reviews** - Colleagues provide feedback
- ✅ **360° reviews** - Multi-source feedback
- ✅ **Automatic creation** when review cycle launched
- ✅ **Due date tracking** based on template configuration
- ✅ **Overdue alerts** for late reviews

### **3. Leave Management**
- ✅ **Leave approvals** for managers
- ✅ **Pending requests** visibility
- ✅ **Automatic reminders** for overdue approvals

### **4. Document Management**
- ✅ **Document acknowledgements** (policies, handbooks)
- ✅ **Signature requests** (contracts, agreements)
- ✅ **Completion tracking**

### **5. Onboarding & Offboarding**
- ✅ **Onboarding task tracking** (setup accounts, training)
- ✅ **Offboarding tasks** (exit interviews, equipment return)
- ✅ **Step-by-step completion**

### **6. Surveys & Feedback**
- ✅ **Survey completion** reminders
- ✅ **Feedback requests**
- ✅ **Response tracking**

### **7. Workflow Automation**
- ✅ **Custom workflow tasks**
- ✅ **Approval workflows**
- ✅ **Automated assignments**

## 👨‍💼 **Admin Global Dashboard**

### **Overview Cards**
- 📊 Total Pending items
- 🔴 Total Overdue (with alert)
- 📅 Due Today count
- 📆 Due This Week count

### **Advanced Filtering**
- 🔍 Search by name or title
- 📝 Filter by status
- 🎯 Filter by type (Performance, Leave, Documents, etc.)
- ⚡ Filter by priority

### **Department Analytics**
- 📈 Breakdown by department
- 🎯 Identify bottleneck teams
- 📊 Completion rates by department

### **Bulk Actions**
- 📧 Send reminders to multiple users
- ❌ Cancel multiple items
- 🔄 Reassign tasks
- 📥 Export to CSV

### **Real-Time Updates**
- ⏱️ Auto-refresh every 30 seconds
- 🔄 Manual refresh button
- 🔴 Overdue items highlighted in red

## 💡 **Use Cases**

**Track Performance Reviews:**
"Show me all overdue performance reviews" → Filter by type and status

**Department Analysis:**
"Which department has the most pending items?" → Check department breakdown

**Send Reminders:**
"Remind everyone who hasn't completed their self-review" → Bulk remind action

**Export for Leadership:**
"Download CSV of all action items" → Export button

**Monitor Leave Approvals:**
"Show pending leave requests" → Filter by LEAVE_APPROVAL type

Want me to explain any specific capability in more detail?`,
    actionType: "action_items_capabilities",
  };
}

/**
 * Provide action items overview with stats
 */
async function provideActionItemsOverview(companyId: string) {
  return {
    success: true,
    message: `# 📊 **Action Items Overview**

To see your complete action items overview, go to:

**Admin Sidebar → Action Items**

This dashboard shows you:

## 🎯 **Quick Stats**
- Total pending action items across your company
- Overdue items (highlighted in red)
- Items due today
- Items due this week

## 📋 **Action Items Table**
- Full list of all action items
- Assignee names
- Related employees
- Departments
- Due dates
- Priority levels
- Quick actions (View, Remind)

## 🏢 **Department Breakdown**
- Pending items by department
- Identify which teams need support
- Track completion rates

## 🔧 **Available Actions**
- **Filter** - By status, type, priority, department
- **Search** - Find specific items or people
- **Export** - Download CSV for reporting
- **Remind** - Send notifications to assignees
- **View** - Navigate to item details

Would you like me to:
- Show you how to filter for specific items?
- Explain how to send reminders?
- Walk through the export process?`,
    actionType: "action_items_overview",
    suggestions: [
      "Show me how to filter action items",
      "How do I send reminders?",
      "How do I export to CSV?",
    ],
  };
}

/**
 * Explain what integrates with action items
 */
async function explainIntegrations(userMessage: string) {
  return {
    success: true,
    message: `# 🔗 **Action Items Integrations**

## ✅ **Fully Integrated Workflows**

### **1. Performance Reviews** 🌟
- **Self-reviews** assigned to employees
- **Manager reviews** assigned to managers
- **Peer reviews** for 360° feedback
- **Automatic creation** when cycle launched
- **Due dates** based on template settings

### **2. Onboarding**
- Task completion tracking
- Step-by-step onboarding journey
- Assignment to new hires and managers

### **3. Document Management**
- Policy acknowledgements
- Contract signatures
- Document uploads
- Automatic reminders for pending items

### **4. Leave Management**
- Leave request approvals (manager view)
- Pending approvals tracking
- Overdue approval alerts

### **5. Transactional Requests**
- Employee data change requests
- Bank detail updates
- Contact information changes

### **6. AI Bulk Updates**
- Approval workflows for AI-generated changes
- Bulk salary updates
- Bulk field changes

### **7. Surveys**
- Survey completion tasks
- Feedback requests
- Response tracking

### **8. Workflow Automation**
- Custom automation tasks
- Scheduled tasks
- Event-triggered tasks

## 🚀 **Coming Soon**

### **Offboarding** (Helper functions ready)
- Exit interview scheduling
- Equipment return tracking
- Access revocation

### **1-2-1 Meetings**
- Meeting preparation tasks
- Follow-up actions

### **Training**
- Training completion tracking
- Course assignments

## 🎯 **How It Works**

When you create or trigger any of these workflows:
1. Action items are **automatically created**
2. Assigned to the **right people**
3. Set with appropriate **due dates**
4. Tracked until **completion**
5. Visible in **admin dashboard**

Would you like details on any specific integration?`,
    actionType: "action_items_integrations",
    suggestions: [
      "Tell me more about performance review integration",
      "How does leave approval work?",
      "Explain document acknowledgement flow",
    ],
  };
}

/**
 * Explain performance review integration in detail
 */
async function explainPerformanceReviewIntegration(userMessage: string) {
  return {
    success: true,
    message: `# 🎯 **Performance Reviews → Action Items Integration**

## 🚀 **How It Works**

### **Step 1: Create Review Cycle**
1. Go to **Performance → Templates**
2. Create or select a template
3. Configure audience filters (departments, locations, roles)
4. Set up reviewer roles:
   - **SELF** - Employee reviews themselves
   - **MANAGER** - Manager reviews employee
   - **PEER** - Peer feedback
   - **360°** - Multi-source feedback

### **Step 2: Launch Review Cycle**
1. Admin clicks **"Launch Cycle"**
2. System automatically:
   - ✅ Gets all employees in scope (based on filters)
   - ✅ Creates action items for each reviewer role
   - ✅ Assigns to correct people
   - ✅ Sets due dates (based on template offset days)
   - ✅ Sets priorities (High for urgent, Medium for normal)

### **Step 3: Action Items Created**

**For 50 employees with SELF + MANAGER reviews:**
- 50 × "Complete self-review: Q4 2024 Review" → Assigned to employees
- 50 × "Complete manager review for [Name]" → Assigned to managers
- **Total: 100 action items created automatically**

### **Step 4: Employees & Managers See Tasks**

**Employee View:**
- Opens dashboard
- Sees: **"Complete self-review: Q4 2024 Review"**
- Due: 7 days
- Priority: MEDIUM
- Clicks → Taken to review form

**Manager View:**
- Opens dashboard
- Sees multiple: **"Complete manager review for John Smith"**
- Due: 14 days
- Priority: MEDIUM
- Clicks → Taken to review form for John

### **Step 5: Admin Tracks Everything**

**Admin Dashboard shows:**
- Total pending reviews: 100
- Completed: 75 (75% completion rate)
- Overdue: 5 (flagged in red)
- Due today: 10
- Due this week: 10

**Admin can:**
- Filter by "PERFORMANCE" type → See only reviews
- Filter by department → See which teams are behind
- Send bulk reminders → Remind everyone with overdue reviews
- Export CSV → Share with leadership

## 📊 **Example Workflow**

\`\`\`
Week 1: Launch "Q4 2024 Annual Review" cycle
        → 150 action items created (50 employees × 3 reviewers)

Week 2: Status Check
        → 100 completed (67%)
        → 40 pending (still on time)
        → 10 overdue (send reminders)

Week 3: Admin Actions
        → Send reminders to 10 overdue
        → Email department heads for lagging teams
        → Export progress report for CEO

Week 4: Completion
        → 145 completed (97%)
        → 5 still pending (follow up individually)
\`\`\`

## 🎯 **Key Features**

✅ **Automatic Creation** - No manual tracking needed
✅ **Smart Assignment** - Right person gets right task
✅ **Due Date Tracking** - Based on template configuration
✅ **Priority Setting** - Urgent items marked HIGH
✅ **Overdue Alerts** - Red highlighting for late reviews
✅ **Completion Tracking** - Real-time progress monitoring
✅ **Department Insights** - See which teams need support
✅ **Bulk Reminders** - Nudge multiple people at once

## 💡 **Pro Tips**

1. **Set realistic due dates** in your template (7-14 days for self-reviews, 14-21 for manager reviews)
2. **Use department filters** to find bottleneck teams
3. **Send reminders** 2 days before due date
4. **Export progress** weekly for stakeholder updates
5. **Check daily** for overdue items

Would you like me to:
- Walk through creating a review cycle?
- Show you how to check review progress?
- Explain how to send reminders?`,
    actionType: "performance_review_integration",
    suggestions: [
      "How do I create a review cycle?",
      "Show me how to track review progress",
      "How do I send reminders for overdue reviews?",
    ],
  };
}

/**
 * Explain workflows and how they create action items
 */
async function explainWorkflows(userMessage: string) {
  return {
    success: true,
    message: `# ⚙️ **Workflows & Action Items**

## 🎯 **How Workflows Create Action Items**

Every workflow in the system can automatically create action items for users. Here's how each works:

### **1. 🌱 Onboarding Workflow**

**When triggered:**
- New employee joins

**Action items created:**
- For employee: "Complete onboarding step 1: IT Setup"
- For manager: "Schedule welcome meeting with [Name]"
- For HR: "Verify documents for [Name]"

**Admin can see:**
- All onboarding tasks by employee
- Progress percentage
- Overdue onboarding steps

### **2. 🚪 Offboarding Workflow**

**When triggered:**
- Employee departure announced

**Action items created:**
- For employee: "Return company equipment"
- For HR: "Schedule exit interview with [Name]"
- For IT: "Revoke system access for [Name]"

**Due dates:**
- Exit interview: 7 days before last day
- Equipment return: On last working day
- Access revocation: 1 day after departure

### **3. 🏖️ Leave Approval Workflow**

**When triggered:**
- Employee submits leave request

**Action item created:**
- For manager: "Approve leave request for [Name]"
- Details: Dates, leave type, days count
- Due: 3 days from request

**Admin can:**
- See all pending leave approvals
- Identify managers with overdue approvals
- Send reminders

### **4. 📄 Document Acknowledgement**

**When triggered:**
- HR assigns document (policy, handbook)

**Action item created:**
- For employee: "Acknowledge [Document Name]"
- Priority: HIGH for compliance documents
- Due: Based on document settings

**Tracking:**
- Who has acknowledged
- Who hasn't (overdue)
- Department compliance rates

### **5. 📋 Survey Completion**

**When triggered:**
- Survey sent to employees

**Action item created:**
- For each employee: "Complete [Survey Name]"
- Due: Survey deadline
- Priority: Based on survey importance

**Admin insights:**
- Response rates
- Who hasn't responded
- Department participation

### **6. 🔧 Transactional Changes**

**When triggered:**
- Employee requests bank details update
- Employee requests personal info change

**Action item created:**
- For HR: "Approve change request for [Name]"
- Shows old vs new values
- Requires approval

### **7. 🤖 AI Bulk Updates**

**When triggered:**
- AI generates bulk changes
- Example: "Give sales team 10% raise"

**Action item created:**
- For admin: "Approve AI bulk update"
- Preview: All changes to be made
- Requires confirmation before execution

## 🎯 **Universal Workflow Patterns**

All workflows follow these patterns:

\`\`\`
1. Event happens → Workflow triggered
2. System creates action item(s)
3. Assigns to right person
4. Sets due date
5. Tracks until completion
6. Admin can monitor all
\`\`\`

## 📊 **Admin Visibility**

For ANY workflow, admin can:
- ✅ See all pending action items
- ✅ Filter by workflow type
- ✅ Track completion rates
- ✅ Identify overdue items
- ✅ Send reminders
- ✅ Reassign if needed
- ✅ Export for reporting

## 💡 **Pro Tips**

1. **Check daily** for overdue items
2. **Filter by type** to focus on specific workflows
3. **Send bulk reminders** for similar items
4. **Export weekly** for stakeholder reports
5. **Monitor department** breakdown to identify bottlenecks

Would you like details on a specific workflow?`,
    actionType: "workflows_explanation",
    suggestions: [
      "Tell me more about onboarding action items",
      "How do leave approvals work?",
      "Explain document acknowledgement flow",
    ],
  };
}

/**
 * Explain admin dashboard features
 */
async function explainAdminDashboard(userMessage: string) {
  return {
    success: true,
    message: `# 📊 **Admin Action Items Dashboard**

## 🎯 **Location**
**Admin Sidebar → Action Items**

## 🌟 **Dashboard Features**

### **📈 Summary Cards (Top Row)**

**1. Total Pending**
- Count of all pending action items
- Across entire company
- All types and departments

**2. Total Overdue** 🔴
- Items past due date
- Highlighted in red
- Requires immediate attention

**3. Due Today** 📅
- Items due within 24 hours
- Proactive management
- Send reminders today

**4. Due This Week** 📆
- Items due in next 7 days
- Plan ahead
- Prevent overdue items

---

### **🔍 Advanced Filtering**

**Search Bar:**
- Search by assignee name
- Search by related employee
- Search by title/description

**Status Filter:**
- Pending (default)
- In Progress
- Completed
- Cancelled

**Type Filter:**
- Performance Reviews (PERFORMANCE_SELF_REVIEW, PERFORMANCE_MANAGER_REVIEW)
- Leave Approvals (LEAVE_APPROVAL)
- Documents (DOCUMENT_ACKNOWLEDGEMENT, DOCUMENT_SIGNATURE)
- Surveys (SURVEY_COMPLETION)
- Onboarding (ONBOARDING_TASK)
- Offboarding (OFFBOARDING_TASK)
- Custom workflows

**Priority Filter:**
- HIGH (urgent items)
- MEDIUM (normal priority)
- LOW (non-urgent)

---

### **📋 Action Items Table**

**Columns:**
- **Title** - What needs to be done
- **Assignee** - Who is responsible
- **Related Employee** - Who it's about
- **Department** - Team/department
- **Due Date** - When it's due
- **Days Overdue** - If past due (red)
- **Priority** - Importance level
- **Actions** - View, Remind buttons

**Features:**
- Sort by any column
- Click row to see details
- Overdue rows highlighted in red
- Color-coded priority badges

---

### **🏢 Department Breakdown**

**Sidebar or Bottom Section:**

Shows pending action items grouped by department:
\`\`\`
Engineering: 15 pending
Sales: 8 pending
HR: 3 pending
Marketing: 12 pending
\`\`\`

**Benefits:**
- Identify bottleneck departments
- Target specific teams for support
- Track completion by team

---

### **🔧 Bulk Actions**

**Select Multiple Items:**
- Checkbox selection
- Select all option

**Available Actions:**

**1. Send Reminders**
- Email notification to assignees
- "You have pending action items"
- List of their items
- Due dates highlighted

**2. Cancel Items**
- Mark as cancelled
- Remove from active list
- Audit trail maintained

**3. Reassign**
- Change assignee
- Useful if person is out
- Maintains history

**4. Export to CSV** 📥
- Download all or filtered items
- Includes all fields
- Open in Excel
- Share with leadership

---

### **⏱️ Auto-Refresh**

**Real-Time Updates:**
- Auto-refreshes every 30 seconds
- Shows latest status
- See completions immediately
- No manual refresh needed

**Manual Refresh:**
- Click refresh button anytime
- Instant update
- See changes immediately

---

## 💡 **Common Use Cases**

### **1. Track Performance Reviews**
\`\`\`
1. Go to Action Items dashboard
2. Filter by "Type: Performance"
3. See all pending reviews
4. Check overdue count
5. Send bulk reminders to overdue reviewers
\`\`\`

### **2. Department Analysis**
\`\`\`
1. Look at department breakdown
2. Identify team with most pending items
3. Filter by that department
4. Review specific items
5. Contact department head
\`\`\`

### **3. Weekly Report**
\`\`\`
1. Filter for "Due This Week"
2. Export to CSV
3. Email to leadership
4. Show progress and risks
\`\`\`

### **4. Overdue Item Management**
\`\`\`
1. Click "Total Overdue" card
2. See all overdue items
3. Select all overdue
4. Send bulk reminders
5. Follow up with specific people
\`\`\`

### **5. Leave Approval Tracking**
\`\`\`
1. Filter by "Type: Leave Approval"
2. See all pending leave requests
3. Identify managers with overdue approvals
4. Send individual reminders
5. Escalate if needed
\`\`\`

---

## 🎯 **Best Practices**

**Daily:**
- ✅ Check overdue count
- ✅ Review items due today
- ✅ Send reminders for urgent items

**Weekly:**
- ✅ Export CSV for leadership report
- ✅ Review department breakdown
- ✅ Check items due this week
- ✅ Send proactive reminders

**Monthly:**
- ✅ Analyze completion trends
- ✅ Identify chronic bottlenecks
- ✅ Review process improvements

---

## 📊 **Example Dashboard View**

\`\`\`
╔══════════════════════════════════════════════════════════╗
║  [50] Pending   [12] Overdue   [5] Due Today   [18] This Week  ║
╚══════════════════════════════════════════════════════════╝

Search: [_________] 
Status: [Pending ▼]  Type: [All ▼]  Priority: [All ▼]

┌─────────────────────────────────────────────────────────┐
│ Title                  │ Assignee    │ Due      │ Days Over │
├─────────────────────────────────────────────────────────┤
│ Complete self-review   │ John Smith  │ 2 days   │ -      │🟡
│ Approve leave request  │ Jane Manager│ 3d over  │ 3 🔴   │🔴
│ Acknowledge IT Policy  │ Sarah Lee   │ Today    │ -      │🟡
│ Manager review for Tom │ Bob Manager │ 1 week   │ -      │🟢
└─────────────────────────────────────────────────────────┘

Department Breakdown:
Engineering: 15 pending
Sales: 8 pending
HR: 3 pending

[Export CSV] [Send Reminders] [Refresh]
\`\`\`

---

Want me to walk through any specific feature?`,
    actionType: "admin_dashboard_explanation",
    suggestions: [
      "How do I send reminders?",
      "How do I export to CSV?",
      "How do I filter for specific items?",
    ],
  };
}

/**
 * Provide intelligent guidance using AI
 */
async function provideIntelligentGuidance(
  userMessage: string,
  companyId: string,
  userId: string
) {
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const completion = await openai.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are an expert HR AI assistant specializing in the Action Items system.

# ACTION ITEMS SYSTEM KNOWLEDGE

## Core Capabilities:
1. **Unified Task Hub** - All employee tasks in one place
2. **Performance Reviews** - Full integration (self, manager, peer, 360°)
3. **Leave Management** - Approval workflows
4. **Document Management** - Acknowledgements and signatures
5. **Onboarding/Offboarding** - Task tracking
6. **Surveys** - Completion tracking
7. **Workflow Automation** - Custom tasks

## Admin Global Dashboard:
- Location: Admin Sidebar → Action Items
- Summary cards (Pending, Overdue, Due Today, Due This Week)
- Advanced filtering (status, type, priority, search)
- Action items table with full details
- Department breakdown for bottleneck analysis
- Bulk actions (remind, cancel, reassign, export CSV)
- Auto-refresh every 30 seconds

## Integrations:
- Performance reviews: Auto-created when cycle launched
- Onboarding: Tasks assigned to new hires and managers
- Leave: Approval tasks for managers
- Documents: Acknowledgement and signature tasks
- Surveys: Completion tasks
- Workflows: Custom automation tasks
- AI Bulk Updates: Approval tasks

## Performance Review Integration (KEY FEATURE):
- When admin launches review cycle:
  1. System gets employees in scope (based on audience filters)
  2. Creates action items for each reviewer role (SELF, MANAGER, PEER, etc.)
  3. Assigns to correct people
  4. Sets due dates based on template offset days
  5. Tracks until completion
- Example: 50 employees × 2 reviewers = 100 action items created automatically
- Admin can track progress, see overdue reviews, send reminders

## User's Question:
${userMessage}

Provide a helpful, detailed response focused on action items capabilities, usage, or guidance. Be specific and practical.`,
      },
    ],
  });

  const aiResponse = completion.choices[0]?.message?.content || "I can help with action items. What would you like to know?";

  return {
    success: true,
    message: aiResponse,
    actionType: "action_items_guidance",
  };
}
