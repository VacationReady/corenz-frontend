# Event Rules Overrides - Quick Reference

## Creating an Override

1. Navigate to **Settings > Event Rules**
2. Go to **Overrides** tab
3. Click **"Create Override"**
4. Select **Event Category** (required)
5. Select **Department** (or leave as Company-wide)
6. Override desired fields across 3 tabs:
   - **Basic Overrides** - notice, concurrent, length
   - **Enforcement** - hard block vs soft gate
   - **Staffing Density** - percentage-based limits
7. Click **"Create Override"**

## Field Quick Reference

| Field | Tab | Purpose | Blank = | Example |
|-------|-----|---------|---------|---------|
| Notice Period | Basic | Days advance notice | Inherit | 3 days |
| Max Concurrent | Basic | Max people at once | Inherit | 5 people |
| Max Booking Length | Basic | Max consecutive days | Inherit | 21 days |
| Enforce Entitlement | Basic | Check balance | Inherit | On/Off |
| Max Concurrent Mode | Enforcement | Hard/Soft block | Inherit | Hard Block |
| Max Length Mode | Enforcement | Hard/Soft block | Inherit | Soft Gate |
| Staffing Density | Density | Enable % limits | Off | 30% |
| Density Behavior | Density | Deny or Approve | Deny | Require Approval |

## Visual Indicators

### In Override List
- **Inherited** - Black text (using base rule)
- **Overridden** - Blue bold text (custom value)

### Base Rule Display
When creating override, see base rule at top:
```
Base Rule: Notice: 7 days • Max Concurrent: 5 • Max Length: 14 days
Override values below to customize for this department
```

## Common Patterns

### Pattern 1: Less Notice for Agile Team
```
Notice Period: 3 days
Everything else: Blank (inherited)
```

### Pattern 2: Strict Coverage Team
```
Max Concurrent: 2
Max Concurrent Mode: Hard Block
Staffing Density: 20%, Deny
```

### Pattern 3: Executives - Long Leave with Approval
```
Max Booking Length: 45 days
Max Length Mode: Soft Gate
```

### Pattern 4: No Changes, Just Density
```
All fields: Blank (inherited)
Staffing Density: 25%, Require Approval
```

## Inheritance Rules

**Blank field** → Inherits from base rule  
**Set field** → Overrides base rule

You only override what needs to be different!

## Enforcement Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| **Hard Block** | Denies request | Strict rules, no exceptions |
| **Soft Gate** | Requires approval | Need flexibility with oversight |
| **Inherit** | Uses base rule mode | Base rule is fine |

## Density vs Concurrent

| Feature | Concurrent (Fixed) | Density (Percentage) |
|---------|-------------------|---------------------|
| Type | Number (e.g., 5) | Percent (e.g., 30%) |
| Best For | Small teams | Large teams |
| Scaling | Manual | Automatic |
| Example | "Max 3 people" | "Max 25%" |
| Can Combine | ✅ Yes | ✅ Yes |

**Using Both:** Apply whichever is MORE restrictive
- Team of 20, Max 5 AND 30% → Max 5 (more restrictive than 6)
- Team of 10, Max 5 AND 30% → Max 3 (more restrictive than 5)

## Tabs Explained

### Overrides Tab
- Shows **ALL** overrides (any type)
- Can see all fields at once
- Main management interface

### Staffing Density Tab
- Shows **ONLY** overrides with density enabled
- Filtered view of Overrides tab
- Quick access to density rules
- Same edit dialog, pre-focused on density

**They're the same data, different views!**

## Quick Scenarios

### Scenario A: "Engineering needs less notice"
```
Tab: Basic Overrides
Notice Period: 3
→ Create Override
```

### Scenario B: "Support max 2 people"
```
Tab: Basic Overrides
Max Concurrent: 2
Tab: Enforcement
Max Concurrent Mode: Hard Block
→ Create Override
```

### Scenario C: "Marketing 25% density"
```
Tab: Staffing Density
Enable: ✓
Threshold: 25
Behavior: Require Approval
→ Create Override
```

### Scenario D: "Executives longer with approval"
```
Tab: Basic Overrides
Max Booking Length: 45
Tab: Enforcement
Max Length Mode: Soft Gate
→ Create Override
```

## Validation

### Must Provide
- ✅ Event Category

### Can Leave Blank (to inherit)
- Notice Period
- Max Concurrent
- Max Booking Length
- All enforcement modes

### If Density Enabled
- ⚠️ Must set threshold (1-100%)
- ⚠️ Must choose behavior

## Troubleshooting

| Problem | Check | Solution |
|---------|-------|----------|
| Override not working | Employee's department | Assign to correct dept |
| Wrong values | Inherited vs overridden | Set field explicitly |
| Too restrictive | Hard block | Change to Soft Gate |
| Density not applying | Threshold set? | Enter 1-100% |
| Can't create | Event category? | Select from dropdown |

## API Notes

### Data Sent to API
Only sends fields that are set:
```json
{
  "eventCategoryId": "required",
  "departmentId": "optional",
  "noticePeriodDays": 3,  // if set
  "maxConcurrent": 5,     // if set
  // ... only overridden fields
}
```

### Blank Fields
Not sent to API → system uses base rule

## Pro Tips

1. **Start Simple** - Override one field at a time
2. **Use Inheritance** - Only override what needs changing
3. **Test First** - Use "Test Scenario" before going live
4. **Document** - Note why overrides exist
5. **Review Quarterly** - Team sizes change, update density
6. **Combine Wisely** - Density + Concurrent = layered protection
7. **Soft Gate** - Better UX than hard block in most cases
8. **Company-Wide** - Use for alternative default rules

## Keyboard Shortcuts

- `Tab` - Navigate between fields
- `Enter` - Open dropdown / Submit
- `Esc` - Close dialog
- `Space` - Toggle checkbox/switch

## Related Features

- **Event Rules** - Set base rules per category
- **Test Scenario** - Simulate rule application
- **Blackout Days** - Block specific dates
- **Working Patterns** - Define work schedules

## Quick Wins

### Win 1: Fast Setup for Common Cases
```
Engineering: Notice 3 days
Support: Max 2 concurrent
Sales: Density 35%
```
Three overrides, 5 minutes, done!

### Win 2: Gradual Rollout
```
Week 1: Create overrides
Week 2: Test with managers
Week 3: Go live
Week 4: Adjust based on feedback
```

### Win 3: Self-Service Exceptions
```
Use Soft Gate instead of Hard Block
→ Managers can approve exceptions
→ Less admin work
→ Happier employees
```

## Support

- Documentation: `EVENT_RULES_COMPREHENSIVE_OVERRIDES.md`
- Debugging: `EVENT_RULES_DEBUG_GUIDE.md`
- Original Fixes: `EVENT_RULES_FIXES_SUMMARY.md`

---

**Remember:** Blank fields inherit. Only override what's different!













