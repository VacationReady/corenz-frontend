# Event Rules - Comprehensive Override System

## Overview

The Rule Override system allows you to customize event rules at the department or company-wide level, overriding the base rules defined for each event category.

## Key Concepts

### Base Rules vs Overrides

**Base Rules** (Event Rules tab)
- Defined per event category (Annual Leave, Sick Leave, etc.)
- Apply company-wide by default
- Set the default behavior for all employees

**Overrides** (Overrides tab)
- Customize base rules for specific departments
- Inherit from base rules by default
- Only override specific fields you want to change
- Can be company-wide (no department) for alternative rules

### Inheritance Model

Fields left blank in an override will **inherit** from the base rule.

**Example:**
- **Base Rule (Annual Leave):**
  - Notice Period: 7 days
  - Max Concurrent: 5
  - Max Length: 14 days
  - Mode: Hard Block

- **Override (Engineering Dept):**
  - Notice Period: 3 days ✅ (overridden)
  - Max Concurrent: (blank) → inherits 5
  - Max Length: 21 days ✅ (overridden)
  - Mode: (blank) → inherits Hard Block

**Result:** Engineering employees need only 3 days notice and can book up to 21 days, but still limited to 5 concurrent bookings.

## Override Fields Available

### 1. Basic Overrides Tab

#### Notice Period (days)
- **Purpose:** How many days in advance must an employee request
- **Example:** Engineering needs 3 days, Marketing needs 14 days
- **Inherited if:** Left blank
- **Use case:** Fast-moving teams need less notice

#### Max Concurrent Bookings
- **Purpose:** Maximum number of people from this department on leave at once
- **Example:** Support team limited to 2, Sales limited to 10
- **Inherited if:** Left blank
- **Use case:** Ensure minimum staffing levels

#### Max Booking Length (days)
- **Purpose:** Maximum consecutive days an employee can book off
- **Example:** Operations max 10 days, Executives max 30 days
- **Inherited if:** Left blank
- **Use case:** Prevent long absences in critical teams

#### Enforce Entitlement
- **Purpose:** Whether to check leave balance before approving
- **Checkbox:** Check to override this setting
- **Toggle:** On/Off when override enabled
- **Use case:** Allow some teams to go negative, restrict others

### 2. Enforcement Tab

#### Max Concurrent Mode
- **Hard Block:** Completely denies request if limit exceeded
- **Soft Gate:** Allows request but requires additional approval
- **Options:**
  - Inherit from base rule (default)
  - Hard Block (Deny)
  - Soft Gate (Require Approval)
- **Use case:** Some departments need strict control, others flexible approval

#### Max Booking Length Mode
- **Hard Block:** Completely denies request if exceeds max length
- **Soft Gate:** Allows request but requires additional approval
- **Options:**
  - Inherit from base rule (default)
  - Hard Block (Deny)
  - Soft Gate (Require Approval)
- **Use case:** Allow managers to approve exceptional long-term leave

### 3. Staffing Density Tab

#### Enable Staffing Density
- **Toggle:** On to enable percentage-based constraints
- **Default:** Off (not using density)
- **Use case:** Large teams where percentage makes more sense than fixed numbers

#### Density Threshold (%)
- **Range:** 0-100%
- **Example:** 30% = no more than 30% of department absent at once
- **Calculation:** Based on total employees in department
- **Use case:** Scales automatically with team size

#### Behavior When Threshold Exceeded
- **Deny (Hard Block):** Completely prevents the request
- **Require Approval:** Sends for additional approval
- **Use case:** Allow flexibility with oversight

## Visual Design

### Override Indicators

In the override list, fields show:
- **Black text:** Inherited from base rule
- **Blue bold text:** Overridden (custom value)

**Example Display:**
```
Notice Period: 3 days (blue - overridden)
Max Concurrent: Inherited (black - using base rule)
Max Length: 21 days (blue - overridden)
Enforcement: Inherited (black - using base rule)
```

### Base Rule Reference

When creating an override, the dialog shows the base rule values:
```
┌─────────────────────────────────────────┐
│ Base Rule: Notice: 7 days •            │
│ Max Concurrent: 5 • Max Length: 14 days│
│ Override values below to customize      │
└─────────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Engineering Team - Flexible Leave

**Requirements:**
- Less notice needed (agile team)
- Longer vacations allowed
- Keep concurrent limit

**Configuration:**
```
Event Category: Annual Leave
Department: Engineering
━━━━━━━━━━━━━━━━━━━━━━━━
Basic Overrides:
  Notice Period: 3 days ✓
  Max Concurrent: (blank - inherit 5)
  Max Length: 21 days ✓
  
Enforcement:
  (all inherited)
  
Staffing Density:
  Disabled
```

### Scenario 2: Customer Support - Strict Control

**Requirements:**
- Standard notice period
- Limited concurrent (always need coverage)
- Use density AND fixed limit
- Hard block everything

**Configuration:**
```
Event Category: Annual Leave
Department: Customer Support
━━━━━━━━━━━━━━━━━━━━━━━━
Basic Overrides:
  Notice Period: (blank - inherit 7 days)
  Max Concurrent: 2 ✓
  Max Length: (blank - inherit 14 days)
  
Enforcement:
  Max Concurrent Mode: Hard Block ✓
  Max Length Mode: Hard Block ✓
  
Staffing Density:
  Enabled: Yes ✓
  Threshold: 20% ✓
  Behavior: Deny ✓
```

**Result:** Support can have maximum 2 people OR 20% of team (whichever is more restrictive), all hard blocked.

### Scenario 3: Executive Team - Flexible with Approval

**Requirements:**
- Same notice requirement
- Longer bookings allowed with approval
- Flexible on concurrency

**Configuration:**
```
Event Category: Annual Leave
Department: Executive
━━━━━━━━━━━━━━━━━━━━━━━━
Basic Overrides:
  Notice Period: (blank - inherit)
  Max Concurrent: (blank - inherit)
  Max Length: 45 days ✓
  
Enforcement:
  Max Concurrent Mode: (inherit)
  Max Length Mode: Soft Gate ✓
  
Staffing Density:
  Disabled
```

**Result:** Executives can request up to 45 days, but anything over base rule (14 days) requires approval.

### Scenario 4: Sick Leave - Department Flexibility

**Requirements:**
- No notice required (it's sick leave)
- But Marketing needs some notice for non-emergency
- Support needs no notice at all

**Base Rule:**
```
Event Category: Sick Leave
Notice Period: 0 days
Max Concurrent: Unlimited
```

**Marketing Override:**
```
Department: Marketing
Notice Period: 1 day ✓
(Marketing asks for 1 day notice for planned sick days)
```

**Support Override:**
```
Department: Support
(No overrides - inherit 0 days notice)
```

## How Rules are Applied

### Resolution Order

1. Check if override exists for employee's department + event category
2. If override exists:
   - Use overridden fields
   - Inherit non-overridden fields from base rule
3. If no override exists:
   - Use base rule entirely

### Multiple Overrides

You can create multiple overrides for the same event category:
- Annual Leave → Engineering
- Annual Leave → Marketing  
- Annual Leave → Support
- Annual Leave → Company-wide (no department)

Each department gets its own customized rules.

### Company-Wide Overrides

Setting department to "Company-wide" creates an alternative base rule that applies when no department-specific override exists.

**Use Case:** You want two different rule sets but don't want to create overrides for every single department.

## Density vs Concurrent: When to Use Each

### Use Fixed Concurrent When:
- Small, stable team sizes
- Absolute minimum coverage needed
- Simple to understand: "Max 3 people"

### Use Staffing Density When:
- Large teams (20+ people)
- Team size fluctuates
- Percentage makes more sense: "Max 25%"
- Want automatic scaling

### Use Both When:
- Need layered protection
- Example: "Max 30% AND max 10 people"
- Whichever is MORE restrictive applies

## Validation Rules

### Required Fields
- ✅ Event Category (must be selected)

### Optional Fields (all can be blank to inherit)
- Notice Period Days
- Max Concurrent
- Max Booking Length
- Enforce Entitlement
- Max Concurrent Mode
- Max Booking Length Mode

### Staffing Density (when enabled)
- ⚠️ Density Threshold required (1-100%)
- ⚠️ Behavior required (Deny or Require Approval)

### Duplicate Prevention
- Cannot create two overrides with same:
  - Event Category
  - Department
  - Team

## Best Practices

### 1. Start with Base Rules
Set sensible defaults in the Event Rules tab first. Most teams should use these.

### 2. Override Only What's Different
Don't override every field. Only override what needs to be different from the base rule.

### 3. Document Why
Use the Notes field in base rules to explain the reasoning. Helps future administrators understand.

### 4. Test with Scenarios
Use the "Test Scenario" feature to verify rules work as expected before going live.

### 5. Review Regularly
As teams grow/shrink, density thresholds may need adjustment. Review quarterly.

### 6. Communicate Changes
When creating overrides, inform department managers so they understand their teams have different rules.

## Troubleshooting

### Override Not Applying
- Check employee is in the correct department
- Verify override exists for that event category
- Check that fields are actually overridden (not blank)

### Inherited Values Wrong
- Check the base rule is set correctly
- Remember: blank fields inherit from base rule

### Density Not Working
- Ensure "Enable staffing density" is checked
- Threshold must be set (1-100%)
- Check department has enough employees for percentage to work

### Too Restrictive
- Consider using Soft Gate instead of Hard Block
- Allows manager override for exceptions
- Maintains control while allowing flexibility

## Migration from Old System

If you previously only had staffing density in overrides:

1. **Existing overrides preserved:** All current density overrides continue working
2. **New fields available:** You can now edit those overrides to add notice periods, etc.
3. **No action required:** System continues working as-is
4. **Gradual enhancement:** Add new override fields as needed

## Summary

The comprehensive override system gives you fine-grained control over leave rules while maintaining simplicity through inheritance. 

**Key Benefits:**
- ✅ Department-specific customization
- ✅ Inherits from base rules (don't repeat yourself)
- ✅ Visual indicators show what's overridden
- ✅ Supports all rule types (notice, concurrent, length, enforcement, density)
- ✅ Flexible enforcement modes (hard block vs soft gate)
- ✅ Scales from simple to complex needs

Start simple, add complexity only where needed!









