# Performance Review Question Permissions Guide

## Overview

The Performance Review system now supports **granular question-level permissions** that allow you to control:
- **Who can see** each question (visibility)
- **Who must answer** each question (required roles)
- **Hide questions from employees** (sensitive feedback)

This enables sophisticated review workflows where different reviewers answer different questions, with options for read-only visibility or complete hiding.

---

## Key Features

### 1. **Visible To Roles**
Define which reviewer roles can **see** a question (even if they can't edit it).

**Example:** A question about leadership effectiveness might be visible to managers, peers, and HR, but not to the employee.

### 2. **Required From Roles**
Specify which reviewer roles **must answer** a question (full edit access).

**Example:** A self-reflection question would be required from the employee (SELF role), while a manager effectiveness question would be required from the manager.

### 3. **Hide From Employee**
Completely hide a question from the employee, even if they have the SELF role.

**Example:** Sensitive questions about promotion readiness or compensation discussions that should only be visible to managers and HR.

---

## How It Works

### In the Template Builder

When creating or editing a performance review template:

1. **Navigate to the "Build" step** in the template wizard
2. **Add questions** to your sections as normal
3. **Click the "Permissions" button** on any question
4. **Configure permissions:**
   - Click a role once to make it **visible** (read-only)
   - Click a role twice to make it **required** (must answer)
   - Toggle "Hide from Employee" to completely hide from the employee

### Permission States

Each question can have one of three states for each reviewer role:

| State | Icon | Description |
|-------|------|-------------|
| **Not Visible** | ⭕ Circle | Role cannot see this question at all |
| **Read-Only** | 👁️ Eye | Role can view but not edit the answer |
| **Must Answer** | ✅ Check | Role must provide an answer |

---

## Example Scenarios

### Scenario 1: 360° Review with Manager-Only Questions

**Setup:**
- Template Type: `THREE_SIXTY`
- Reviewers: SELF, MANAGER, PEER, DIRECT_REPORT

**Question Configuration:**

| Question | Visible To | Required From | Hide From Employee |
|----------|------------|---------------|--------------------|
| "What are your key accomplishments?" | All | SELF | No |
| "How would you rate this person's leadership?" | MANAGER, PEER, HR | MANAGER | No |
| "Is this person ready for promotion?" | MANAGER, HR | MANAGER | **Yes** |
| "How effective is your manager at coaching?" | DIRECT_REPORT | DIRECT_REPORT | No |

**Result:**
- Employee sees and answers question 1 only
- Manager sees all questions, answers 2 & 3
- Peers see questions 1 & 2, answer 2
- Direct reports see questions 1 & 4, answer 4
- Question 3 is completely hidden from employee

### Scenario 2: Probation Review with Progressive Disclosure

**Setup:**
- Template Type: `PROBATION_REVIEW`
- Reviewers: SELF, MANAGER, HR

**Question Configuration:**

| Question | Visible To | Required From | Hide From Employee |
|----------|------------|---------------|--------------------|
| "How confident do you feel in your role?" | All | SELF | No |
| "Has the employee met probation expectations?" | MANAGER, HR | MANAGER | **Yes** |
| "Would you recommend permanent employment?" | MANAGER, HR | MANAGER, HR | **Yes** |
| "Any concerns about culture fit?" | HR | HR | **Yes** |

**Result:**
- Employee only sees self-assessment questions
- Manager sees and answers probation-specific questions
- HR sees everything and provides final sign-off
- Sensitive questions about employment decisions are hidden from employee

### Scenario 3: Self-Review with Manager Commentary

**Setup:**
- Template Type: `QUARTERLY_REVIEW`
- Reviewers: SELF, MANAGER

**Question Configuration:**

| Question | Visible To | Required From | Notes |
|----------|------------|---------------|-------|
| "What did you accomplish this quarter?" | SELF, MANAGER | SELF | Employee answers, manager can view |
| "Manager feedback on accomplishments" | SELF, MANAGER | MANAGER | Employee can read after manager answers |
| "Areas for improvement (your view)" | SELF, MANAGER | SELF | Transparent self-assessment |
| "Manager coaching feedback" | SELF, MANAGER | MANAGER | Employee sees manager's guidance |

**Result:**
- Transparent two-way conversation
- Employee provides self-assessment
- Manager adds commentary
- Both can see each other's answers (after submission)

---

## Technical Implementation

### Database Schema

```prisma
model TemplateQuestion {
  visibleToRoles      String[]  @default([])  // Roles that can see this question
  requiredFromRoles   String[]  @default([])  // Roles that must answer
  hideFromEmployee    Boolean   @default(false)  // Hide from employee
}
```

### Permission Checking Logic

The system uses the `checkQuestionPermission()` helper function:

```typescript
import { checkQuestionPermission } from "@/lib/performance-permissions";

const permissionCheck = checkQuestionPermission(
  question,
  userRole,      // e.g., "MANAGER"
  isEmployee     // true if user is the employee being reviewed
);

// Returns: { visibility: "editable" | "readonly" | "hidden", reason: string }
```

### Rendering Questions in Reviews

Use the `ReviewQuestionRenderer` component:

```typescript
import { ReviewQuestionRenderer } from "@/components/performance/ReviewQuestionRenderer";

<ReviewQuestionRenderer
  question={question}
  value={currentValue}
  onChange={(value) => handleChange(question.id, value)}
  userRole="MANAGER"
  isEmployee={false}
  showPermissionIndicator={true}
/>
```

---

## Best Practices

### 1. **Default to Transparency**
If no permissions are set, questions are visible to all reviewers by default. Only restrict when necessary.

### 2. **Use "Required" Sparingly**
Mark questions as required only for roles that should definitely answer. Read-only visibility promotes transparency.

### 3. **Hide Sensitive Topics**
Use "Hide from Employee" for:
- Promotion readiness discussions
- Compensation recommendations
- Performance improvement plans
- Sensitive peer feedback

### 4. **Test Your Template**
Before deploying, review your template from each role's perspective:
- What does the employee see?
- What does the manager see?
- Are sensitive questions properly hidden?

### 5. **Communicate Expectations**
Let reviewers know what they're expected to answer and what's optional.

---

## UI Components

### QuestionPermissionsControl

**Location:** `app/components/performance/QuestionPermissionsControl.tsx`

**Purpose:** Template builder UI for configuring question permissions

**Features:**
- Visual role selection with click-to-toggle
- "Select All" / "Clear All" quick actions
- Real-time permission summary badges
- Validation that required roles are also visible

### ReviewQuestionRenderer

**Location:** `app/components/performance/ReviewQuestionRenderer.tsx`

**Purpose:** Renders questions in review forms respecting permissions

**Features:**
- Automatic permission checking
- Read-only mode for visible-only questions
- Permission indicator badges
- Contextual help text
- Support for all question types (text, rating, multiple choice, etc.)

---

## API Changes

### Template Creation/Update

The `/api/performance/templates` endpoint now accepts permission fields:

```json
{
  "sections": [
    {
      "questions": [
        {
          "question": "Your question text",
          "type": "TEXTAREA",
          "visibleToRoles": ["SELF", "MANAGER", "HR"],
          "requiredFromRoles": ["MANAGER"],
          "hideFromEmployee": false
        }
      ]
    }
  ]
}
```

---

## Migration Notes

### Backward Compatibility

**Existing templates continue to work!** Questions without permission settings default to:
- `visibleToRoles: []` (visible to all)
- `requiredFromRoles: []` (no specific requirements)
- `hideFromEmployee: false` (not hidden)

### Database Migration

Run the migration to add new fields:

```sql
-- Already included in migration: 20250110000000_add_question_permissions
ALTER TABLE "TemplateQuestion" 
ADD COLUMN "visibleToRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiredFromRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "hideFromEmployee" BOOLEAN NOT NULL DEFAULT false;
```

---

## Troubleshooting

### Question Not Visible

**Problem:** A reviewer can't see a question they should see.

**Solution:**
1. Check that their role is in `visibleToRoles` OR `requiredFromRoles`
2. Verify `hideFromEmployee` is `false` if the reviewer is the employee
3. If arrays are empty, question should be visible (check for errors)

### Can't Edit But Should Be Able To

**Problem:** Question appears read-only but should be editable.

**Solution:**
1. Verify the reviewer's role is in `requiredFromRoles` (not just `visibleToRoles`)
2. Check that the correct role is being passed to the renderer

### Changes Not Saving

**Problem:** Permission changes in template builder don't save.

**Solution:**
1. Check browser console for API errors
2. Verify Prisma schema is up to date
3. Check that migration was applied successfully

---

## Future Enhancements

Potential features for future releases:

- **Conditional Permissions:** Show/hide based on other answers
- **Time-Based Permissions:** Unlock questions at specific stages
- **Department-Level Permissions:** Restrict by department, not just role
- **Question Dependencies:** Require certain questions before others
- **Bulk Permission Updates:** Apply permissions to multiple questions at once

---

## Support

For questions or issues with question permissions:

1. Check this guide first
2. Review the example scenarios
3. Test with different roles in a non-production template
4. Consult the code comments in the helper functions

---

## Summary

Question-level permissions give you fine-grained control over your performance review process. Use them to:

✅ Create sophisticated review workflows  
✅ Protect sensitive information  
✅ Enable transparent two-way feedback  
✅ Customize experiences by reviewer role  
✅ Build trust through appropriate disclosure  

**Happy reviewing! 🚀**

