# Rota System UX/UI Redesign - Executive Summary

## 🔴 CRITICAL ISSUES IDENTIFIED

### 1. **Visibility Problems**
- **Dropdowns**: White text on white background (browser defaults) makes options invisible
- **Low Contrast**: `bg-white/5` backgrounds with `text-white` barely visible
- **Dark UI Issues**: Gray-on-gray text throughout (`text-gray-300` on `bg-gray-900`)

### 2. **Mental Model Mismatch**
- Current: Generic "create shift" → pick from 100s of employees
- Needed: **Rota Groups** → "Store #21 Front of House" → auto-filtered employees
- Missing: Clear separation between shift workers and salaried staff

### 3. **Missing WFM Concepts**
- No shift templates
- No demand forecasting/requirements
- No staffing pools
- No role-based scheduling

---

## 🎯 REDESIGN SOLUTION: ROTA GROUPS

### Concept: Scheduling Pools
**Rota Groups encapsulate**:
- Site/Location
- Department
- Role/Skill Level
- Optional Tags (certifications, clearances)

**Examples**:
- `Store #21 – Front of House (Cashier, Supervisor)`
- `Warehouse – Night Pickers (Forklift Certified)`
- `ICU – RN Band 5 (ACLS, Trauma)`
- `Corporate – IT Help Desk (L1, L2 Support)`

### Benefits:
✅ Auto-filter 100s of employees to relevant 10-15  
✅ Pre-configured templates per pool  
✅ Role-based demand forecasting  
✅ Clear shift worker vs salaried segmentation  
✅ Compliance tags (licenses, certs) built-in

---

## 📊 NEW DATABASE SCHEMA

```prisma
model RotaGroup {
  id              String   @id @default(cuid())
  companyId       String
  name            String   // "Store #21 – Front of House"
  description     String?
  locationId      String?
  departmentId    String?
  roles           String[] // ["Cashier", "Supervisor", "Barista"]
  requiredSkills  String[] // ["POS System", "Cash Handling"]
  optionalTags    String[] // ["Key Holder", "Forklift", "ACLS"]
  color           String?  // For calendar display
  icon            String?  // Visual identifier
  isActive        Boolean  @default(true)
  
  ShiftTemplates  ShiftTemplate[]
  ShiftRequirements ShiftRequirement[]
  Shifts          Shift[]
  RotaGroupMembers RotaGroupMember[]
}

model RotaGroupMember {
  rotaGroupId  String
  employeeId   String
  assignedRoles String[] // Subset of group roles this employee can fill
  
  @@id([rotaGroupId, employeeId])
}

model ShiftRequirement {
  id           String @id @default(cuid())
  rotaGroupId  String
  dayOfWeek    Int    // 0-6
  startTime    String // "07:00"
  endTime      String // "15:00"
  role         String // "Barista"
  quantity     Int    // 3 (need 3 baristas)
  priority     String @default("NORMAL") // CRITICAL, HIGH, NORMAL, LOW
  
  RotaGroup    RotaGroup @relation(fields: [rotaGroupId], references: [id])
}
```

---

## 🎨 UI REDESIGN

### Page 1: Rota Group Selector
```
┌─────────────────────────────────────────────────────────────┐
│ My Rota Groups                            🔍 Search  [+ New] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📍 Store #21 – Front of House                             │
│     Cashiers • Supervisors • Baristas                       │
│     12 employees • 38 shifts this week                      │
│     [View Rota →]                                           │
│                                                              │
│  🏭 Warehouse – Night Shift (22:00-06:00)                  │
│     Pickers • Packers • Forklift Operators                  │
│     8 employees • 24 shifts this week                       │
│     ⚠️ 2 unfilled shifts                                     │
│     [View Rota →]                                           │
│                                                              │
│  🏥 ICU – Registered Nurses Band 5                         │
│     RN • Charge Nurse                                       │
│     15 employees • 84 shifts this week                      │
│     [View Rota →]                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Page 2: Rota Calendar (Group-Filtered)
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back  Store #21 – Front of House      Week: Nov 4-10      │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions:                                               │
│ [Fill from Template] [Check Coverage] [Publish Week]        │
├─────────────────────────────────────────────────────────────┤
│         Mon    Tue    Wed    Thu    Fri    Sat    Sun      │
│ 07:00   ✅3/3  ✅3/3  ⚠️2/3  ✅3/3  ✅3/3  ⚠️1/3  ✅2/2     │
│ Barista ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│ 15:00   ✅1/1  ✅1/1  ✅1/1  ✅1/1  ✅1/1  ⚠️0/1  ✅1/1     │
│ Super-                                                       │
│ visor   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                              │
│ ⚠️ Gaps Detected:                                            │
│ • Wed 07:00 – 1 Barista needed                              │
│ • Sat 07:00 – 2 Baristas + 1 Supervisor needed              │
│                                                              │
│ 💡 AI Suggestion: Sarah is available Wed & Sat              │
│    [Auto-fill gaps →]                                        │
└─────────────────────────────────────────────────────────────┘
```

### Create Shift Modal (REDESIGNED)
```
┌──────────────────────────────────────────┐
│ Create Shift                         [×] │
├──────────────────────────────────────────┤
│ Rota Group: Store #21 – Front of House  │
│                                           │
│ Role: [Barista ▼]                        │
│       └─ 12 qualified employees          │
│                                           │
│ Template: [Morning Shift (07:00-15:00)] │
│          or [Custom times]               │
│                                           │
│ Date: [Nov 6, 2025]                      │
│                                           │
│ Employee:                                 │
│ ┌─────────────────────────────────────┐  │
│ │ 🟢 Sarah Chen                       │  │
│ │    ✅ POS Certified • Avg 4.8★      │  │
│ │    Available • No conflicts         │  │
│ ├─────────────────────────────────────┤  │
│ │ 🟢 Mike Torres                      │  │
│ │    ✅ POS Certified • Avg 4.6★      │  │
│ │    Available • No conflicts         │  │
│ ├─────────────────────────────────────┤  │
│ │ 🟡 Emma Wilson                      │  │
│ │    ⚠️ Works 6h already (OT risk)     │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ [Cancel]  [Create Shift]                 │
└──────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTATION PHASES

### Phase 1: Fix Visibility (IMMEDIATE - 2 hours)
- Fix dropdown styling with proper contrast
- Add dark `className="bg-gray-800"` to `<option>` elements
- Increase contrast throughout UI
- Test with screenshot analysis

### Phase 2: Database Schema (1 day)
- Add `RotaGroup`, `RotaGroupMember`, `ShiftRequirement` models
- Migration with backward compatibility
- Seed data for demo

### Phase 3: Rota Group UI (2 days)
- Group selector page
- Group management (create/edit)
- Member assignment interface

### Phase 4: Enhanced Shift Creation (2 days)
- Group-filtered employee lists
- Template integration
- Smart suggestions based on requirements

### Phase 5: Coverage Dashboard (2 days)
- Requirement vs actual visualization
- Gap detection
- AI-powered fill suggestions

---

## 📈 BUSINESS IMPACT

### For Shift Workers
- ✅ Faster scheduling (12 employees vs 200+)
- ✅ Relevant shifts only
- ✅ Clear role expectations
- ✅ Fair distribution visibility

### For Managers
- ✅ Coverage at a glance
- ✅ Template-based efficiency
- ✅ Compliance tracking (certs/licenses)
- ✅ Cost control per pool

### For HR/Admins
- ✅ Clear segmentation (shift vs salaried)
- ✅ Multi-site management
- ✅ Audit trail per pool
- ✅ Scalable to enterprise

