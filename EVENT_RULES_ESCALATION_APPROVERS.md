# Event Rules - Escalation Approvers Feature

## Overview

When a leave request exceeds the staffing density threshold and "Require Additional Approval" is selected, the system needs to know WHO should provide that additional approval. This feature allows you to specify the escalation approver.

## The Problem We Solved

**Before:**
- Override says "Require Additional Approval"
- But who approves? Nobody knows!
- Confusing for users and administrators

**After:**
- Clear selection of who provides approval
- Three escalation options to choose from
- Visual indication in UI of escalation path

## Escalation Approver Types

### 1. Manager's Manager (Auto-Escalate)

**How it works:**
- Automatically routes to the employee's manager's manager
- Dynamic based on organizational hierarchy
- No manual configuration needed

**Best for:**
- Standard organizational escalation
- Clear reporting structure
- Automatic resolution based on org chart

**Example:**
```
Employee → Manager (normal approval)
↓ (if density exceeded)
Manager's Manager → Additional approval required
```

**Use Case:**
> Your Support team has a 20% density threshold. When Jane requests leave that would exceed this, it goes to her manager Sarah for normal approval, then automatically escalates to Sarah's manager (Director of Support) for the density override approval.

### 2. HR/Admin (Any Admin User)

**How it works:**
- Routes to any user with Admin role
- First available admin can approve
- Distributed approval workload

**Best for:**
- HR oversight required
- Multiple admins available
- Centralized policy enforcement

**Example:**
```
Employee → Manager (normal approval)
↓ (if density exceeded)
Any HR Admin → Additional approval required
```

**Use Case:**
> Your Engineering team has a 30% density limit. Any request that exceeds this must be reviewed by HR to ensure business continuity. Any admin user can approve these escalated requests.

### 3. Specific User

**How it works:**
- Routes to one specific user you select
- That person must approve
- Direct assignment

**Best for:**
- Department heads
- Specific senior manager
- Policy owner

**Example:**
```
Employee → Manager (normal approval)
↓ (if density exceeded)
John Smith (VP of Operations) → Additional approval required
```

**Use Case:**
> Your Sales team has a 25% density threshold. The VP of Sales specifically wants to review all requests that would exceed this limit. You select the VP as the specific approver.

## UI Workflow

### Creating an Override with Escalation

1. **Navigate to Settings > Event Rules**
2. **Go to Overrides tab**
3. **Click "Create Override"**
4. **Go to "Staffing Density" tab**
5. **Enable staffing density** (toggle on)
6. **Set threshold** (e.g., 30%)
7. **Select "Require additional approval"**
8. **🆕 Orange box appears: "Who approves when density threshold is exceeded?"**
9. **Select escalation approver type:**
   - Manager's Manager (default)
   - HR/Admin
   - Specific User
10. **If "Specific User" selected:**
    - Dropdown appears showing managers and admins
    - Select the person
    - Field is required (red border if empty)
11. **Create Override**

### Visual Indicators

**In the Form:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ Who approves when density threshold is   │
│    exceeded?                                 │
│                                              │
│ Escalation Approver Type                    │
│ [Manager's Manager (auto-escalate)      ▼] │
│                                              │
│ ℹ️ Automatically routes to the employee's   │
│    manager's manager                         │
│                                              │
│ ℹ️ How it works: Normal leave requests...   │
└──────────────────────────────────────────────┘
```

**In the Override List:**
```
Annual Leave - Engineering
Staffing density: 30% - Require Approval
Escalates to: Manager's Manager
```

## Technical Implementation

### Frontend Fields

```typescript
interface EventRuleOverride {
  // ... existing fields
  escalationApproverId?: string;      // UUID of specific user
  escalationApproverType?: "USER" | "MANAGER_OF_MANAGER" | "HR_ADMIN";
}
```

### API Validation

```typescript
// POST /api/event-rule-overrides
escalationApproverId: z.string().uuid().optional()
escalationApproverType: z.enum(["USER", "MANAGER_OF_MANAGER", "HR_ADMIN"]).optional()
```

### Validation Rules

1. **If density enabled AND behavior is "REQUIRE_APPROVAL":**
   - escalationApproverType defaults to "MANAGER_OF_MANAGER"
   
2. **If escalationApproverType is "USER":**
   - escalationApproverId is REQUIRED
   - Shows red border and error message if missing
   - Cannot save without selecting a user

3. **If escalationApproverType is "MANAGER_OF_MANAGER" or "HR_ADMIN":**
   - escalationApproverId not needed
   - Resolved dynamically at runtime

### Database Storage

Currently stored in EventRuleOverride model (fields need to be added to schema if not exists):

```prisma
model EventRuleOverride {
  // ... existing fields
  escalationApproverId      String?
  escalationApproverType    String? // USER, MANAGER_OF_MANAGER, HR_ADMIN
}
```

## Integration with Approval Workflow

### How Approval Flow Works

#### Normal Request (No Density Issue)
```
1. Employee creates leave request
2. Routes to Manager
3. Manager approves
4. Request approved ✅
```

#### Density Exceeded with "DENY"
```
1. Employee creates leave request
2. System checks density: 35% (exceeds 30% threshold)
3. Request automatically denied ❌
4. Employee sees: "Denied due to staffing density constraints"
```

#### Density Exceeded with "REQUIRE_APPROVAL"
```
1. Employee creates leave request
2. System checks density: 35% (exceeds 30% threshold)
3. Routes to Manager (first approval)
4. Manager approves
5. ⭐ Additional stage created based on escalationApproverType:
   
   If MANAGER_OF_MANAGER:
   6. Routes to manager's manager
   7. Manager's manager approves
   8. Request approved ✅
   
   If HR_ADMIN:
   6. Routes to any admin
   7. Admin approves
   8. Request approved ✅
   
   If USER:
   6. Routes to specific user (from escalationApproverId)
   7. That user approves
   8. Request approved ✅
```

### Multi-Stage Workflow Integration

The system already has `ApprovalWorkflow` and `LeaveApprovalStage` models. When density threshold is exceeded:

1. **Create additional approval stage:**
```typescript
{
  name: "Staffing Density Approval",
  order: existingStages.length, // After normal approval
  mode: "FIRST_RESPONDER", // or "SEQUENTIAL"
  approvers: [
    // Based on escalationApproverType:
    { type: "USER", userId: escalationApproverId } // if USER
    // OR resolve dynamically for MANAGER_OF_MANAGER or HR_ADMIN
  ]
}
```

2. **Notify escalation approver(s)**
3. **Wait for approval**
4. **Complete request**

## Example Scenarios

### Scenario 1: Engineering Team - Manager Escalation

**Setup:**
```
Event Category: Annual Leave
Department: Engineering
Density Threshold: 30%
Behavior: Require Approval
Escalation Type: Manager's Manager
```

**Flow:**
1. Sarah (Engineer) requests leave June 1-5
2. Would make team 35% absent (exceeds 30%)
3. Request goes to Mike (Engineering Manager)
4. Mike approves
5. System checks: "Exceeds density, need escalation"
6. Looks up Mike's manager → Alice (VP Engineering)
7. Notification sent to Alice
8. Alice approves
9. Leave granted

### Scenario 2: Support Team - HR Oversight

**Setup:**
```
Event Category: Annual Leave
Department: Customer Support
Density Threshold: 20%
Behavior: Require Approval
Escalation Type: HR/Admin
```

**Flow:**
1. Tom (Support Agent) requests leave July 10-14
2. Would make team 25% absent (exceeds 20%)
3. Request goes to Lisa (Support Manager)
4. Lisa approves
5. System checks: "Exceeds density, need escalation"
6. Routes to HR Admin role
7. Notification sent to all admins
8. First admin (Jenny from HR) approves
9. Leave granted

### Scenario 3: Sales Team - VP Approval

**Setup:**
```
Event Category: Annual Leave
Department: Sales
Density Threshold: 25%
Behavior: Require Approval
Escalation Type: Specific User
Escalation Approver: David Chen (VP of Sales)
```

**Flow:**
1. Maria (Sales Rep) requests leave Aug 1-10
2. Would make team 30% absent (exceeds 25%)
3. Request goes to Robert (Sales Manager)
4. Robert approves
5. System checks: "Exceeds density, need escalation"
6. Routes to David Chen (specified user)
7. Notification sent to David
8. David reviews business impact
9. David approves (or denies if critical period)
10. Leave granted (or denied)

## User Dropdown Filter

When "Specific User" is selected, the dropdown shows:
- ✅ Users with role "ADMIN"
- ✅ Users with role "MANAGER"
- ❌ Regular employees (filtered out)

**Display format:**
```
John Smith (ADMIN)
Sarah Johnson (MANAGER)
Mike Wilson (ADMIN)
```

This ensures only people who can make escalation decisions are selectable.

## Benefits

### For HR/Admins
✅ **Clear accountability** - Know exactly who approves  
✅ **Flexible options** - Choose what works for your org  
✅ **Audit trail** - See who made density override decisions  
✅ **Policy enforcement** - Ensure critical decisions reviewed  

### For Managers
✅ **Understand escalation** - Know when requests go higher  
✅ **Appropriate involvement** - Right people make right decisions  
✅ **Clear communication** - Employees know the process  

### For Employees
✅ **Transparency** - Understand approval path  
✅ **Predictability** - Know who will review  
✅ **Faster resolution** - Clear routing, no confusion  

## Best Practices

### 1. Choose Right Escalation Type

**Use Manager's Manager when:**
- Standard org hierarchy applies
- Escalation follows reporting structure
- Manager's manager understands team needs

**Use HR/Admin when:**
- Policy compliance required
- Multiple admins available
- Centralized oversight needed

**Use Specific User when:**
- Department head wants control
- Subject matter expert needed
- Policy owner designated

### 2. Document Your Choice

Add notes to explain why certain escalation paths chosen:
- "VP approval required for all Sales density overrides per Q1 policy"
- "HR reviews all Support requests due to 24/7 coverage requirements"

### 3. Review Regularly

As organization changes:
- Update specific users if they change roles
- Adjust escalation types as needed
- Ensure org chart kept current (for manager's manager)

### 4. Communicate to Team

Let employees know:
- What the density threshold is
- When escalation approval needed
- Who the escalation approver is
- Why this policy exists

## Troubleshooting

### Issue: "Validation Error: Please select a specific approver"

**Cause:** Selected "Specific User" but didn't pick anyone  
**Solution:** Either select a user OR change to Manager's Manager / HR Admin

### Issue: Dropdown shows no users

**Cause:** No employees with ADMIN or MANAGER role  
**Solution:** Assign appropriate roles to users, or use different escalation type

### Issue: Manager's manager doesn't work

**Cause:** Manager doesn't have a manager assigned in org chart  
**Solution:** Update org chart OR use different escalation type

### Issue: HR/Admin approval not routing

**Cause:** No users with ADMIN role  
**Solution:** Assign ADMIN role to at least one user

## Migration Notes

### For Existing Overrides

**Before this feature:**
- Existing overrides with "REQUIRE_APPROVAL" had no escalation approver
- System would need default behavior

**After this feature:**
- Default to "MANAGER_OF_MANAGER" for existing overrides
- Can be edited to change escalation type
- No data loss, just enhancement

### Database Migration

If fields don't exist in schema:

```sql
ALTER TABLE "EventRuleOverride" 
ADD COLUMN "escalationApproverId" TEXT,
ADD COLUMN "escalationApproverType" TEXT;

-- Set default for existing records with REQUIRE_APPROVAL
UPDATE "EventRuleOverride"
SET "escalationApproverType" = 'MANAGER_OF_MANAGER'
WHERE "staffingDensityBehavior" = 'REQUIRE_APPROVAL'
AND "escalationApproverType" IS NULL;
```

## API Endpoint Updates

### POST /api/event-rule-overrides

**Request Body (NEW):**
```json
{
  "eventCategoryId": "uuid",
  "departmentId": "uuid",
  "staffingDensityEnabled": true,
  "staffingDensityThreshold": 0.3,
  "staffingDensityBehavior": "REQUIRE_APPROVAL",
  "escalationApproverType": "MANAGER_OF_MANAGER",
  "escalationApproverId": null
}
```

**Response:**
```json
{
  "id": "uuid",
  "eventCategoryId": "uuid",
  "departmentId": "uuid",
  "staffingDensityEnabled": true,
  "staffingDensityThreshold": 0.3,
  "staffingDensityBehavior": "REQUIRE_APPROVAL",
  "escalationApproverType": "MANAGER_OF_MANAGER",
  "escalationApproverId": null,
  "createdAt": "2025-11-23T...",
  "updatedAt": "2025-11-23T..."
}
```

## Summary

This feature transforms "Require Additional Approval" from a vague concept into a concrete, configurable workflow. Administrators can now precisely control who reviews density-exceeding leave requests, ensuring appropriate oversight while maintaining flexibility for different organizational structures.

**Key Takeaway:** No more guessing who approves. Clear, configurable escalation paths for every scenario.

---

**Status:** ✅ Implemented  
**Breaking Changes:** None (new optional fields)  
**Migration Required:** Optional (can add defaults for existing records)  
**User Training:** Minimal (UI is self-explanatory)



















