# 🔄 AI Assistant - Workflow Builder Guide

**Build powerful HR automations using natural language**

The AI Assistant understands your workflow builder and can create complex automations through simple conversations.

---

## 🎯 **How It Works**

The AI asks you friendly, non-technical questions to build workflows step-by-step.

### **Basic Workflow Structure**

Every workflow has three parts:

1. **Trigger** (When?) - What starts the workflow
2. **Conditions** (Who?) - Filters to apply (optional)
3. **Actions** (What?) - What happens

---

## 💬 **Conversational Building**

### **Example 1: Contract Expiry Alerts**

```
You: "Create a workflow that alerts HR before contracts expire"

AI: "Great! When should we check for expiring contracts?"

You: "Check daily"

AI: "How far in advance should we alert? (e.g., 30 days, 60 days)"

You: "60 days before"

AI: "Who should receive the alert?"

You: "Email the HR team"

AI: "✅ Workflow Generated!

     Name: Contract Expiry Alerts
     Category: Custom (AI-generated)
     
     Steps:
     1. Check daily for expiring contracts
     2. If contract ends within 60 days
     3. Send email to HR team with employee details
     
     To save: Say 'Save this workflow'
     To modify: Tell me what to change"
```

### **Example 2: New Hire Onboarding**

```
You: "I want to automate new hire onboarding"

AI: "When should this workflow start?"

You: "When a new employee is created"

AI: "What should happen first?"

You: "Send them a welcome email"

AI: "Great! Should this be for all new employees or specific departments?"

You: "Only for full-time employees"

AI: "Anything else you'd like to add?"

You: "Also create a task to assign them a buddy"

AI: "✅ Workflow Generated!

     Name: New Hire Onboarding
     Category: Custom (AI-generated)
     
     Steps:
     1. Trigger: When employee is created
     2. Check: Only if employment type is Full Time
     3. Action: Send welcome email
     4. Action: Create task to assign buddy
     
     Ready to save?"
```

---

## 🎨 **Available Components**

### **1. TRIGGERS (When should this start?)**

The AI will ask: *"When should this workflow start?"*

**Available options:**

| Trigger | When It Happens | Example |
|---------|----------------|---------|
| **New Employee** | When someone is hired | "When a new employee joins" |
| **Start Date** | On employee's first day | "On their start date" |
| **Contract Expiring** | Before contract ends | "60 days before contract expires" |
| **Document Expiring** | Before docs expire | "When passports are about to expire" |
| **Probation Ending** | Near end of probation | "2 weeks before probation ends" |
| **Leave Request** | When leave is requested | "When someone requests holiday" |
| **Form Submitted** | After form completion | "When induction form is done" |
| **Scheduled** | At specific times | "Every Monday at 9am" |
| **Manual** | When someone triggers it | "When I manually start it" |

**AI understands phrases like:**
- "When a new employee joins"
- "Every Monday"
- "Before contracts expire"
- "On their start date"
- "When someone requests leave"

---

### **2. CONDITIONS (Who should this apply to?)**

The AI will ask: *"Should this only apply to certain people?"*

**Available filters:**

| Condition | Checks | Example |
|-----------|--------|---------|
| **Department** | Employee's department | "Only for Sales team" |
| **Job Role** | Employee's role | "Only for Managers" |
| **Contract Type** | Type of employment | "Only full-time employees" |
| **Contract Date** | Contract timing | "Contracts ending this year" |
| **Probation** | Probation status | "Employees in probation" |
| **Leave Balance** | Days remaining | "Less than 5 days remaining" |
| **Tenure** | How long employed | "Employees here over 1 year" |
| **Salary** | Salary range | "Salary above $80,000" |
| **Location** | Office location | "Only Auckland office" |
| **Manager** | Who they report to | "Reports to Sarah Johnson" |

**AI understands phrases like:**
- "Only for the Sales department"
- "Just managers"
- "Full-time employees only"
- "People who've been here over a year"
- "If salary is above $70,000"

---

### **3. ACTIONS (What should happen?)**

The AI will ask: *"What should happen?"* or *"What would you like to do?"*

**Available actions:**

| Action | What It Does | Example |
|--------|--------------|---------|
| **Send Email** | Email someone | "Email the employee" |
| **Create Task** | Make a to-do | "Create task for HR" |
| **Update Employee** | Change employee data | "Update probation status" |
| **Send Notification** | In-app notification | "Notify their manager" |
| **Assign Buddy** | Set onboarding buddy | "Assign a buddy from their team" |
| **Create Training** | Assign training | "Assign compliance training" |
| **Schedule Review** | Set up performance review | "Schedule 90-day review" |
| **Send Slack** | Slack message | "Post to #hr channel" |
| **Create Document** | Generate document | "Create contract letter" |
| **Update Leave** | Adjust leave balance | "Add 5 bonus days" |
| **Calendar Invite** | Send calendar event | "Invite to orientation" |
| **Webhook** | External integration | "Send data to payroll system" |

**AI understands phrases like:**
- "Send them an email"
- "Create a task for HR"
- "Notify their manager"
- "Assign training"
- "Schedule a review"

---

## 💡 **Real-World Examples**

### **Compliance Reminder**

```
You: "Remind employees to upload their IRD numbers"

AI: "When should we check? Weekly, monthly?"

You: "Weekly"

AI: "Who should we remind?"

You: "Only people who haven't uploaded one yet"

AI: "What should the reminder say?"

You: "Please upload your IRD number for payroll"

AI: ✅ Workflow created! Checks weekly, emails employees without IRD.
```

---

### **Birthday Messages**

```
You: "Send birthday messages to employees"

AI: "When should we send these?"

You: "On their birthday"

AI: "Who should send the message?"

You: "From their manager"

AI: "What should it say?"

You: "Happy birthday! The team wishes you a great day!"

AI: ✅ Workflow created! Sends automated birthday wishes.
```

---

### **Performance Review Schedule**

```
You: "Schedule performance reviews for all employees"

AI: "How often should reviews happen?"

You: "Every 6 months"

AI: "Who should be the reviewer?"

You: "Their direct manager"

AI: "How many days notice before the review?"

You: "14 days"

AI: ✅ Workflow created! Auto-schedules 6-monthly reviews.
```

---

### **Contract Renewal Process**

```
You: "Start contract renewal 90 days before contracts end"

AI: "Great! What should happen first?"

You: "Email the employee asking if they want to renew"

AI: "Should this be for all contract types?"

You: "Only fixed-term contracts"

AI: "What else should happen?"

You: "Create a task for HR to prepare new contract"

AI: ✅ Workflow created! Automates contract renewal process.
```

---

## 💾 **Saving Workflows**

After the AI generates a workflow:

### **1. Review the Workflow**

The AI shows you:
- Workflow name
- Category (always "custom" for AI workflows)
- Description
- Step-by-step breakdown

### **2. Save It**

```
You: "Save this workflow"

AI: "💾 Save Workflow?

     Name: Contract Expiry Alerts
     Description: Alerts HR 60 days before...
     Category: Custom (AI-generated)
     Steps: 3 workflow steps
     
     Note: Workflow will be saved but not activated.
     You can activate it in Settings > Automation Rules.
     
     Shall I save this workflow?"

You: "Yes"

AI: "✅ Workflow Saved!

     Name: Contract Expiry Alerts
     Category: Custom
     Status: Inactive (ready to activate)
     
     Find it in: Settings > Automation Rules > Custom
     
     To activate: Go to automation rules and toggle it on."
```

### **3. Activate in Settings**

1. Go to **Settings > Automation Rules**
2. Filter by **Custom** category
3. Find your AI-generated workflow
4. Toggle **Active** to turn it on

---

## 🔧 **Modifying Workflows**

### **After Generation**

```
You: "Add a condition to only include Sales"

AI: "✅ Updated! Now only applies to Sales department."
```

```
You: "Change the timing to 30 days instead"

AI: "✅ Updated! Now checks 30 days before expiry."
```

```
You: "Add an email to the manager too"

AI: "✅ Updated! Now emails both HR and manager."
```

### **After Saving**

To modify a saved workflow:
1. Go to Settings > Automation Rules > Custom
2. Edit the workflow in the visual builder
3. Or ask AI: "Create a new version with..."

---

## 📊 **Workflow Categories**

All AI-generated workflows are saved to the **Custom** category.

### **Why Custom?**

- ✅ Easy to find your AI workflows
- ✅ Separate from pre-built templates
- ✅ Clearly marked as custom-created
- ✅ Full control over activation

### **Finding Your Workflows**

**Settings > Automation Rules > Filter: Custom**

All workflows created by AI appear here with:
- 🤖 AI-generated tag
- Inactive status (until you activate)
- Full edit capability
- Visual workflow diagram

---

## 🎨 **AI Understanding**

The AI translates technical terms to friendly language:

| Technical | AI Says |
|-----------|---------|
| Trigger | "When should this start?" |
| Action | "What should happen?" |
| Condition | "Who should this apply to?" |
| Node | "Step" |
| Edge | "Connection" |
| Deploy | "Activate" |

**You can use either!**

✅ "Create a trigger for new employees"
✅ "Start when someone joins"

Both work! The AI understands both technical and natural language.

---

## 🚀 **Pro Tips**

### **1. Start Simple**

```
Start: "Create a workflow to welcome new employees"
Instead of: "Create a complex multi-branch workflow with 15 nodes..."
```

The AI will ask follow-up questions to build complexity.

### **2. Be Specific About Timing**

```
Good: "Check daily at 9am"
Good: "60 days before"
Good: "Every Monday"
```

### **3. Mention Recipients**

```
Good: "Email HR team"
Good: "Notify the employee's manager"
Good: "Send to all department heads"
```

### **4. Add Context**

```
Better: "Email new employees a welcome message with their start date and assigned buddy"
Good: "Email new employees"
```

More context = Better workflows!

### **5. Build Iteratively**

1. Create basic workflow
2. Review it
3. Add conditions: "Only for full-time"
4. Add more actions: "Also create a task"
5. Modify timing: "Change to 90 days"

---

## ❓ **Common Questions**

### **"Can I edit workflows after saving?"**

Yes! Go to Settings > Automation Rules > Custom, find your workflow, and edit it in the visual builder.

### **"Are workflows active immediately?"**

No. AI workflows are saved as **inactive**. You must activate them manually in Settings > Automation Rules.

### **"Can I create complex multi-branch workflows?"**

Yes! The AI supports:
- Branches (if/else logic)
- Multiple actions
- Multiple conditions
- Delays
- Loops

Just describe what you want!

### **"Can I see the workflow visually?"**

Yes! After generation, the workflow appears in the preview. After saving, view it in Settings > Automation Rules.

### **"What if I make a mistake?"**

No problem! Workflows start inactive. You can:
- Edit before saving
- Delete after saving
- Ask AI to create a new version

### **"Can AI modify existing workflows?"**

Currently, AI generates new workflows. To modify existing ones, use the visual builder or ask AI to create a new version.

---

## 🎓 **Learning Examples**

### **Start with These**

1. **Simple Email**
   - "Email new employees on their start date"
   
2. **With Condition**
   - "Email new Sales employees on their start date"
   
3. **Multiple Actions**
   - "Email new employees and create a task for HR"
   
4. **With Timing**
   - "Email employees 7 days before their contract ends"
   
5. **Complex**
   - "When a manager submits a leave request, if it's longer than 5 days, email the CEO for approval"

---

## 📞 **Need Help?**

Ask the AI:
- "What workflows can you create?"
- "Show me examples of workflows"
- "What triggers are available?"
- "What actions can workflows do?"

---

## ✨ **Best Practices**

### **Naming Workflows**

The AI generates names, but you can modify them:
- ✅ "Contract Expiry Alerts"
- ✅ "New Hire Welcome Sequence"
- ✅ "Birthday Messages"
- ❌ "Workflow 1"
- ❌ "Test"

### **Testing Workflows**

1. Save workflow (inactive)
2. Review in visual builder
3. Test with manual trigger
4. Activate when ready

### **Organizing**

All in Custom category:
- Use clear names
- Add descriptions
- Tag with relevant keywords

---

## 🎉 **Get Started**

Try these commands:

1. "Create a workflow to welcome new employees"
2. "Alert HR about expiring contracts"
3. "Remind employees about missing documents"
4. "Schedule performance reviews"
5. "Send birthday messages"

The AI will guide you through each step! 🚀

---

**Remember:** You can always say:
- "Save this workflow"
- "Start over"
- "Modify this"
- "Show me what you created"

---

*Document Version: 1.0*
*Last Updated: October 2024*

