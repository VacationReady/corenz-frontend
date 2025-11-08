# New Zealand Overtime Calculation Rules

## Part 1: NZ Employment Law Requirements

### 1.1 Standard Overtime Threshold
According to NZ Employment Relations Act 2000:
- **No statutory overtime rate** - overtime must be agreed in employment agreement
- **Common thresholds:**
  - Daily: 8 hours per day (full-time)
  - Weekly: 40 hours per week (full-time)
  - Pattern-based: Hours exceeding contracted working pattern

### 1.2 Overtime Multipliers
- **Time and a half (1.5x):** Standard overtime rate
- **Double time (2.0x):** Common for extended overtime or tier 2
- **Public holiday rate:** Typically 2.0x or higher (per Holidays Act 2003)
- **Sunday premium:** Optional, often 1.5x-2.0x

### 1.3 Public Holiday Rules (Holidays Act 2003)
- **Otherwise working day (OWD):** Employee must be paid if public holiday falls on their regular work day
- **Working on public holiday:** Minimum time and a half (1.5x), but commonly double time (2.0x)
- **Regional variations:** Anniversary days apply to specific regions (Auckland, Wellington, etc.)
- **Mondayisation:** If public holiday falls on weekend, observed on Monday
- **Alternative days:** Can be granted if employee works the public holiday

### 1.4 Combined Multipliers
When overtime occurs on a public holiday:
- **Option A:** Apply highest multiplier (public holiday 2.0x)
- **Option B:** Compound multipliers (1.5x OT × 2.0x PH = 3.0x)
- Most NZ employers use **Option A** for simplicity

### 1.5 Part-Time Workers
- Pro-rata calculation based on contracted hours
- If contracted 20h/week, threshold is 20h not 40h
- Public holiday rates apply if it's their otherwise working day

### 1.6 Record Keeping (s130 ERA 2000)
- Must maintain accurate records of all hours worked
- Separate regular and overtime hours
- Retain records for 6 years
- Must be accessible to employees

## Part 2: PeopleCore Implementation Rules

### 2.1 Calculation Modes

#### DAILY Mode
```
IF hours_worked_today > daily_threshold THEN
  overtime_hours = hours_worked_today - daily_threshold
  regular_hours = daily_threshold
END IF
```

**Threshold sources (priority order):**
1. Working pattern expected hours for the day
2. Employee override threshold
3. Company daily threshold
4. Default: 8.0 hours

#### WEEKLY Mode (Pattern-Aware)
```
week_total = SUM(hours for all days in week)
IF week_total > weekly_threshold THEN
  week_overtime = week_total - weekly_threshold
  entry_overtime = (entry_hours / week_total) × week_overtime
  entry_regular = entry_hours - entry_overtime
END IF
```

**Threshold sources (priority order):**
1. Working pattern expected hours for the week in cycle
2. Employee override threshold
3. Company weekly threshold
4. Default: 40.0 hours

**Multi-week pattern support:**
- Calculates which week in the cycle (e.g., week 1 of 2-week pattern)
- Uses correct week's threshold (e.g., 30h week vs 40h week)
- Pattern starts from `effectiveDate`

#### MONTHLY Mode
```
month_total = SUM(hours for all days in month)
IF month_total > monthly_threshold THEN
  month_overtime = month_total - monthly_threshold
  entry_overtime = (entry_hours / month_total) × month_overtime
  entry_regular = entry_hours - entry_overtime
END IF
```

**Default threshold:** 173.33 hours (40h/week × 52 weeks / 12 months)

#### PATTERN_BASED Mode (Recommended)
Most accurate for NZ compliance as it respects contractual hours.

```
1. Check daily pattern:
   IF hours_today > pattern_expected_hours_today THEN
     overtime = hours_today - pattern_expected_hours_today
   END IF

2. Also check weekly pattern:
   IF week_total > pattern_expected_hours_week THEN
     week_overtime = week_total - pattern_expected_hours_week
     Distribute overtime proportionally
   END IF
```

### 2.2 Multiplier Priority

```
1. Check if public holiday:
   IF isNZPublicHoliday(date, companyId) THEN
     multiplier = publicHolidayMultiplier (e.g., 2.0x)
   
2. Else check if Sunday:
   ELSE IF isSunday(date) AND sundayMultiplier EXISTS THEN
     multiplier = sundayMultiplier (e.g., 1.5x)
   
3. Else use base overtime rate:
   ELSE
     multiplier = overtimeMultiplier (e.g., 1.5x)
   END IF

4. Check for tier 2:
   IF overtime_hours > overtimeThresholdTier2 THEN
     multiplier = overtimeMultiplierTier2 (e.g., 2.0x)
   END IF
```

### 2.3 Proportional Distribution
For WEEKLY and MONTHLY modes, overtime is distributed across all entries in the period:

```
entry_proportion = entry_hours / period_total_hours
entry_overtime = period_overtime × entry_proportion
```

This ensures fair distribution and maintains hourly accuracy.

### 2.4 Employee Overrides
Employees can have individual settings:
- `overtimeEligible`: Boolean (if false, no overtime calculated)
- `overtimeThreshold`: Override company threshold
- `overtimeMultiplier`: Override company rate
- `overtimeCalculationMode`: Override company mode
- `maxOvertimeHoursPerWeek`: Safety cap

### 2.5 Edge Cases

#### Midnight Shift Spanning Two Days
- Each day segment calculated separately
- If Day 1 is public holiday and Day 2 is regular:
  - Day 1 hours: public holiday rate
  - Day 2 hours: regular rate

#### Break Time Deductions
- Breaks already deducted from total hours before overtime calculation
- Overtime calculated on net working hours

#### Zero Hours
- Returns all zeros, no error
- `overtimeType: 'NONE'`

#### Missing Working Pattern
- Falls back to threshold-based calculation
- Uses employee override or company defaults

## Part 3: Test Scenarios

### 3.1 Regular Day Tests
1. **8h worked, 8h threshold** → 0h overtime
2. **10h worked, 8h threshold** → 2h overtime @ 1.5x
3. **12h worked, 8h threshold** → 4h overtime @ 1.5x
4. **7.5h worked, 8h threshold** → 0h overtime (under threshold)

### 3.2 Public Holiday Tests
1. **8h on public holiday** → 8h @ 2.0x (all hours at PH rate)
2. **10h on public holiday** → 10h @ 2.0x (use highest multiplier)
3. **Part-time 4h on public holiday** → 4h @ 2.0x
4. **Christmas Day** → 2.0x minimum
5. **Regional holiday (Auckland Anniversary)** → 2.0x for Auckland employees

### 3.3 Sunday Premium Tests
1. **8h on Sunday, 8h threshold** → 8h @ 1.5x Sunday premium
2. **10h on Sunday, 8h threshold** → 2h OT, but all 10h @ 1.5x Sunday premium

### 3.4 Tier 2 Tests
1. **15h overtime in week, 10h tier2 threshold** → First 10h @ 1.5x, remaining 5h @ 2.0x

### 3.5 Multi-Week Pattern Tests
1. **Week 1: 30h expected, 35h worked** → 5h overtime
2. **Week 2: 40h expected, 42h worked** → 2h overtime
3. **Verify correct week in cycle**

### 3.6 Weekly Distribution Tests
1. **Mon-Fri: 8,8,8,8,8 (40h)** → No OT
2. **Mon-Fri: 10,10,10,10,10 (50h), 40h threshold** → 10h OT distributed proportionally
3. **Each day gets: 8h regular + 2h OT**

### 3.7 Error Cases
1. **Invalid date** → Graceful handling
2. **Negative hours** → Should be prevented at input validation
3. **Missing employee data** → Falls back to defaults
4. **Missing working pattern** → Falls back to threshold mode
5. **Database unavailable** → Graceful degradation

### 3.8 Edge Cases
1. **Midnight shift: 22:00-06:00**
   - Day 1 (regular): 2h @ 1.0x
   - Day 2 (public holiday): 6h @ 2.0x
   
2. **Part-time worker: 20h/week contract, 25h worked** → 5h overtime

3. **Casual worker: No fixed hours** → Use daily threshold only

4. **Employee not eligible for overtime** → All hours @ 1.0x regular rate

## Part 4: Compliance Checklist

### Required for NZ Compliance
- [x] Accurate hour tracking (regular vs overtime)
- [x] Separate recording of overtime hours
- [x] Overtime rate tracking (multiplier)
- [x] Reason for overtime recorded
- [x] Public holiday detection
- [x] Working pattern integration
- [x] Manager amendment capability
- [x] Complete audit trail
- [x] 6-year data retention
- [x] Employee access to records

### Best Practices
- Use **PATTERN_BASED** mode for most accurate compliance
- Set up working patterns with exact contracted hours
- Regular audit log reviews
- Clear communication of overtime policy
- Manager training on amendment process
- Employee training on time tracking

## References
- [Employment Relations Act 2000](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM58317.html)
- [Holidays Act 2003](https://www.legislation.govt.nz/act/public/2003/0129/latest/DLM236787.html)
- [Employment New Zealand - Overtime](https://www.employment.govt.nz/hours-and-wages/pay/types-of-pay/overtime-pay/)
- [Employment New Zealand - Record Keeping](https://www.employment.govt.nz/starting-employment/employment-agreements/keeping-employee-records/)
