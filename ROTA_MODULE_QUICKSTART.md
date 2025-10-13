# Rota Module - Quick Start for Next Agent

**Mission:** Transform the generic rota system into a specialized **Workforce Management (WFM) module** for frontline shift workers—warehouse teams, bakery staff, factory floors, retail stores, healthcare units.

---

## ✅ What's Been Completed

### Phase 1: Visibility Fixes (DEPLOYED)
**Problem:** Dropdown options were invisible (white text on white background).

**Fixed Files:**
- ✅ `components/rota/CreateShiftModal.tsx` - All dropdowns now visible
- ✅ `components/rota/EditShiftModal.tsx` - All dropdowns now visible
- ✅ `app/(withSidebar)/rota/page.tsx` - Filter dropdowns now visible

**Technical Details:** All dropdowns changed from `bg-white/5` to `bg-gray-800` with proper borders and option styling. System is now usable.

### Documentation Created
- ✅ `ROTA_REDESIGN_SUMMARY.md` - Full problem analysis and solution overview
- ✅ `ROTA_GROUPS_IMPLEMENTATION.md` - Complete technical implementation guide
- ✅ `PEOPLECORE_UNIFIED_VISION.md` - Strategic positioning document
- ✅ `prisma/migrations/add_rota_groups.sql` - Production-ready database migration

---

## 🎯 Core Concept: Location → Roles → People Workflow

### The Problem
Current system treats all employees equally. A warehouse manager scheduling night shift pickers has to scroll through 200+ employees including office staff, executives, and people from other sites.

### The Solution: Rota Groups (Scheduling Pools)
**Think of it as "stations" or "teams" in real shift work environments:**

#### Warehouse Example
```
Location: Distribution Center #3 (Atlanta)
  └─ Rota Group: Night Shift (22:00-06:00)
      └─ Roles:
          ├─ Picker (need 8 per night)
          ├─ Packer (need 6 per night)
          ├─ Forklift Operator (need 2 per night, requires cert)
          └─ Shift Supervisor (need 1 per night)
      └─ Required Skills:
          ├─ Inventory Management System
          ├─ RF Scanner Operation
          └─ Safety Training
      └─ Optional Certifications:
          ├─ Forklift License
          ├─ Hazmat Certification
          └─ First Aid

  └─ Rota Group: Day Shift (06:00-14:00)
      └─ [Similar role structure]
```

#### Bakery Example
```
Location: Artisan Bakery - Downtown
  └─ Rota Group: Production Team (03:00-11:00)
      └─ Roles:
          ├─ Baker (need 4 per shift)
          ├─ Pastry Chef (need 2 per shift)
          ├─ Dough Mixer (need 1 per shift)
          └─ Production Lead (need 1 per shift)
      └─ Required Skills:
          ├─ Food Safety Certification
          ├─ Dough Preparation
          └─ Oven Operation
      └─ Optional Certifications:
          ├─ Allergen Awareness
          └─ Advanced Pastry Techniques

  └─ Rota Group: Front of House (07:00-15:00)
      └─ Roles:
          ├─ Counter Staff (need 3 per shift)
          ├─ Barista (need 2 per shift)
          └─ Shift Manager (need 1 per shift)
```

#### Factory Floor Example
```
Location: Manufacturing Plant - Building A
  └─ Rota Group: Assembly Line 1 (Morning)
      └─ Roles:
          ├─ Line Operator (need 12 per shift)
          ├─ Quality Inspector (need 2 per shift)
          ├─ Machine Technician (need 1 per shift)
          └─ Line Supervisor (need 1 per shift)
      └─ Required Skills:
          ├─ Machine Operation
          ├─ Safety Protocols
          └─ Quality Standards
      └─ Optional Certifications:
          ├─ Welding Certification
          ├─ Electrical Systems
          └─ Lean Manufacturing
```

---

## 🏗️ Implementation Workflow (For New Agent)

### **STEP 1: Database Migration** (1 day)
**Read:** `ROTA_GROUPS_IMPLEMENTATION.md` → Phase 2

1. Review the Prisma schema additions (3 new models):
   - `RotaGroup` - The location/team/pool container
   - `RotaGroupMember` - Links employees to groups with their roles
   - `ShiftRequirement` - Defines staffing needs (e.g., "Need 3 Baristas Mon 07:00")

2. Run migration:
```bash
# Copy the SQL to proper migrations folder
cp prisma/migrations/add_rota_groups.sql prisma/migrations/20250113000000_add_rota_groups/migration.sql

# Or run Prisma migrate
npx prisma migrate dev --name add_rota_groups

# Generate client
npx prisma generate
```

3. Verify tables created:
   - RotaGroup
   - RotaGroupMember
   - ShiftRequirement
   - Shift (with new rotaGroupId column)

### **STEP 2: API Endpoints** (1 day)
**Read:** `ROTA_GROUPS_IMPLEMENTATION.md` → Phase 3, Step 3

Create these API routes in order of priority:

**Critical (Build First):**
```
POST   /api/rota-groups              - Create new group
GET    /api/rota-groups              - List all groups
GET    /api/rota-groups/[id]         - Get single group
PUT    /api/rota-groups/[id]         - Update group
DELETE /api/rota-groups/[id]         - Delete group
```

**Important (Build Second):**
```
POST   /api/rota-groups/[id]/members - Add employee to group
DELETE /api/rota-groups/[id]/members/[employeeId] - Remove employee
GET    /api/rota-groups/[id]/members - List members with their roles
```

**Nice to Have (Build Third):**
```
POST   /api/rota-groups/[id]/requirements - Set staffing requirements
GET    /api/rota-groups/[id]/requirements - Get requirements
GET    /api/rota-groups/[id]/coverage     - Gap analysis
```

**Authentication:** All endpoints must check `session.user.companyId` to ensure data isolation.

### **STEP 3: Admin UI - Rota Groups Management** (2 days)
**Read:** `ROTA_GROUPS_IMPLEMENTATION.md` → Phase 3, Steps 1-2

Build this flow thinking like a warehouse manager or bakery owner:

#### 3A. Groups List Page
**File:** `app/(withSidebar)/admin/rota-groups/page.tsx`

Show cards for each group:
```
┌─────────────────────────────────────────┐
│ 🏭 Distribution Center - Night Shift   │
│ Warehouse Floor • 22:00-06:00          │
│                                         │
│ 🔹 8 Pickers                           │
│ 🔹 6 Packers                           │
│ 🔹 2 Forklift Operators                │
│ 🔹 1 Supervisor                        │
│                                         │
│ 👥 17 employees assigned                │
│ 📅 156 shifts this month                │
│                                         │
│ [View Rota]  [Edit Group]  [⋮ More]    │
└─────────────────────────────────────────┘
```

**Key Features:**
- Visual cards with icons and colors
- Show member count and shift count
- Quick actions: View rota, Edit, Delete
- "Create New Group" button prominent

#### 3B. Create/Edit Group Form
**File:** `app/(withSidebar)/admin/rota-groups/create/page.tsx`

**Form Flow (Critical Order):**

**Step 1: Basic Info**
```
Group Name: [Distribution Center - Night Shift]
Description: [Warehouse operations during night hours]
Icon: [🏭] (emoji picker)
Color: [#8B5CF6] (color picker)
```

**Step 2: Location & Department**
```
Location: [Distribution Center #3 (Atlanta) ▼]
Department: [Warehouse Operations ▼] (optional)
```

**Step 3: Define Roles** ⭐ MOST IMPORTANT
```
Roles in this group:
┌─────────────────────────────────────────┐
│ 🔹 Picker                    [Remove]   │
│ 🔹 Packer                    [Remove]   │
│ 🔹 Forklift Operator         [Remove]   │
│ 🔹 Shift Supervisor          [Remove]   │
│                                         │
│ [+ Add Role]                            │
└─────────────────────────────────────────┘
```

**Step 4: Skills & Certifications**
```
Required Skills (everyone must have):
├─ Inventory Management System
├─ RF Scanner Operation
└─ Safety Training

Optional Certifications (role-specific):
├─ Forklift License (for Forklift Operator)
├─ Hazmat Certification
└─ First Aid Certification
```

**Step 5: Preview & Create**
Show summary before saving.

#### 3C. Member Assignment Interface
**File:** `app/(withSidebar)/admin/rota-groups/[id]/members/page.tsx`

**Left Panel: Available Employees**
```
┌───────────────────────────────────┐
│ 🔍 Search employees...           │
├───────────────────────────────────┤
│ Filter by:                        │
│ ☐ Has required skills             │
│ ☐ Has certifications              │
│ ☐ Available for night shift       │
├───────────────────────────────────┤
│                                   │
│ ☐ Sarah Chen                      │
│   ✅ RF Scanner • Forklift Cert   │
│   Available nights                │
│                                   │
│ ☐ Mike Torres                     │
│   ✅ RF Scanner • Inventory       │
│   Available nights                │
│                                   │
│ ☐ Emma Wilson                     │
│   ⚠️ Missing: Safety Training     │
│   Not available nights            │
│                                   │
│ [Add Selected to Group]           │
└───────────────────────────────────┘
```

**Right Panel: Group Members**
```
┌───────────────────────────────────┐
│ Current Members (17)              │
├───────────────────────────────────┤
│                                   │
│ Sarah Chen                [Remove]│
│ Can work as:                      │
│ ✓ Picker                          │
│ ✓ Packer                          │
│ ✓ Forklift Operator               │
│                                   │
│ Mike Torres               [Remove]│
│ Can work as:                      │
│ ✓ Picker                          │
│ ✓ Packer                          │
│                                   │
└───────────────────────────────────┘
```

**Critical:** When adding someone, let manager select which roles they can fill from the group's role list.

### **STEP 4: Enhanced Shift Creation** (2 days)
**Read:** `ROTA_GROUPS_IMPLEMENTATION.md` → Phase 4

Update `components/rota/CreateShiftModal.tsx`:

**Add Group Selector at Top:**
```tsx
// Before employee selection
<div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
  <label className="block text-sm font-medium text-white mb-2">
    📍 Which team are you scheduling?
  </label>
  <select
    value={selectedGroupId}
    onChange={(e) => setSelectedGroupId(e.target.value)}
    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
  >
    <option value="">All Employees (No Filter)</option>
    <optgroup label="🏭 Warehouse">
      <option value="group-1">Night Shift (17 employees)</option>
      <option value="group-2">Day Shift (15 employees)</option>
    </optgroup>
    <optgroup label="🍞 Bakery">
      <option value="group-3">Production Team (8 employees)</option>
      <option value="group-4">Front of House (6 employees)</option>
    </optgroup>
  </select>
  <p className="text-xs text-gray-400 mt-2">
    💡 Select a team to only show qualified employees for this location/role
  </p>
</div>
```

**When Group Selected:**
1. Show role selector:
```tsx
<select className="...">
  <option value="">Select Role First</option>
  <option value="picker">Picker (8 qualified)</option>
  <option value="packer">Packer (6 qualified)</option>
  <option value="forklift">Forklift Operator (2 qualified)</option>
</select>
```

2. Filter employees to only those in group with that role:
```tsx
{filteredEmployees.map((emp) => (
  <option key={emp.id} value={emp.id} className="bg-gray-800 text-white">
    🟢 {emp.User.name} - Available • {emp.certifications}
  </option>
))}
```

**Show smart indicators:**
- 🟢 Available, qualified
- 🟡 Available, but OT risk (>38h this week)
- 🔴 Unavailable (on leave/unavailable pattern)
- ⚠️ Missing required certification

### **STEP 5: Staffing Requirements** (1 day)
**Read:** `ROTA_GROUPS_IMPLEMENTATION.md` → Phase 5

Create interface to define needs:
```
┌─────────────────────────────────────────┐
│ Staffing Requirements                   │
│ Distribution Center - Night Shift       │
├─────────────────────────────────────────┤
│                                         │
│ Monday 22:00-06:00                      │
│ ├─ Picker        Need: 8  Priority: HIGH│
│ ├─ Packer        Need: 6  Priority: HIGH│
│ ├─ Forklift      Need: 2  Priority: CRITICAL│
│ └─ Supervisor    Need: 1  Priority: CRITICAL│
│                                         │
│ Tuesday 22:00-06:00                     │
│ [Same pattern...]                       │
│                                         │
│ [+ Add Custom Requirement]              │
│ [Copy from Template]                    │
└─────────────────────────────────────────┘
```

### **STEP 6: Coverage Dashboard** (2 days)

Show managers at a glance where they're understaffed:

```
┌─────────────────────────────────────────────────────────┐
│ Coverage: Distribution Center - Night Shift             │
│ Week of Oct 13-19, 2025                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         Mon    Tue    Wed    Thu    Fri    Sat    Sun  │
│ Picker  ✅8/8  ✅8/8  ⚠️6/8  ✅8/8  ✅8/8  🔴4/8  ✅7/8 │
│ Packer  ✅6/6  ✅6/6  ✅6/6  🔴3/6  ✅6/6  ⚠️4/6  ✅6/6 │
│ Fork.   ✅2/2  ✅2/2  ✅2/2  ✅2/2  🔴1/2  ✅2/2  ✅2/2 │
│ Super.  ✅1/1  ✅1/1  ✅1/1  ✅1/1  ✅1/1  ✅1/1  ✅1/1 │
│                                                         │
│ ⚠️ GAPS DETECTED:                                       │
│ • Wed: Need 2 more Pickers                             │
│ • Thu: Need 3 more Packers                             │
│ • Sat: Need 4 Pickers + 2 Packers                      │
│ • Fri: Need 1 Forklift Operator (CRITICAL)             │
│                                                         │
│ 💡 AI SUGGESTIONS:                                      │
│ • Sarah Chen available Wed-Sat (Picker/Packer)         │
│ • Mike Torres available Fri (Forklift certified)       │
│ • Consider overtime for Thu shortage                   │
│                                                         │
│ [Auto-fill Gaps] [View Details] [Notify Manager]       │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Principles

### 1. Location First, Then Roles, Then People
**ALWAYS follow this hierarchy:**
1. "Where is this shift?" → Select Location/Group
2. "What role needs filling?" → Select from group's roles
3. "Who can do it?" → Show only qualified people

### 2. Visual Clarity for Frontline Managers
These users aren't tech-savvy. Use:
- **Icons** for everything (🏭 📦 🍞 🏥 👷)
- **Colors** for status (🟢 available, 🟡 caution, 🔴 problem)
- **Big touch targets** (they use tablets in warehouses)
- **Clear language** ("Need 3 more Pickers" not "Understaffed 37.5%")

### 3. Certification/Skill Enforcement
Never let someone be scheduled for a role they can't do:
- Forklift operator? Must have cert.
- Food handler? Must have food safety cert.
- RN Band 5? Must have nursing license.

**System should prevent, not just warn.**

### 4. Mobile-First for Frontline
Warehouse managers use tablets. Bakery owners use phones. Build responsive from the start.

---

## 📊 Success Criteria

**You'll know it's working when:**

1. **A warehouse manager can:**
   - Create "Night Shift" group in 2 minutes
   - Add 17 employees with their roles in 5 minutes
   - Schedule an entire week in 10 minutes (vs 45 minutes currently)
   - See coverage gaps instantly

2. **A bakery owner can:**
   - Separate "Production Team" from "Front of House"
   - Only see relevant employees when scheduling
   - Know immediately if someone lacks food safety cert

3. **An HR admin can:**
   - Set up 10 different rota groups across 5 locations
   - Generate reports by group/location/role
   - Track certification expiration dates

4. **The system prevents:**
   - Scheduling office workers to warehouse shifts
   - Assigning uncertified people to regulated roles
   - Double-booking across different groups

---

## 🔗 Reference Documents

**Start Here:**
1. Read `PEOPLECORE_UNIFIED_VISION.md` for the "why"
2. Read `ROTA_REDESIGN_SUMMARY.md` for the problem analysis
3. Read `ROTA_GROUPS_IMPLEMENTATION.md` for detailed steps

**When Building:**
- Database: See `prisma/migrations/add_rota_groups.sql`
- APIs: See `ROTA_GROUPS_IMPLEMENTATION.md` Phase 3
- UI: See `ROTA_GROUPS_IMPLEMENTATION.md` Phases 4-5

**Existing Code to Study:**
- `components/rota/CreateShiftModal.tsx` - Already fixed, good starting point
- `app/(withSidebar)/rota/page.tsx` - Main rota view
- `app/api/shifts/route.ts` - Existing shift API patterns

---

## 🚀 Quick Wins for First Week

**Day 1:** Run migration, verify tables created  
**Day 2:** Build rota groups list API + basic UI  
**Day 3:** Build create group form (focus on roles!)  
**Day 4:** Add group selector to shift creation modal  
**Day 5:** Test end-to-end: Create group → Add members → Schedule shift  

**After Week 1:** You should be able to demo:
- Creating a warehouse night shift group
- Adding 5 employees with their roles
- Scheduling a shift filtered to just that group

---

## 💬 Mental Model for New Agent

**Think of Rota Groups like physical spaces in a building:**
- The warehouse night shift is like "Section A, Third Floor"
- Only certain people have access cards to that section
- Only certain roles exist in that section
- You wouldn't schedule someone from accounting to work the forklift
- The system should reflect this physical reality digitally

**Questions to ask yourself while building:**
- "Would a warehouse manager find this obvious?"
- "Could I explain this to a bakery owner in 30 seconds?"
- "Does the system prevent stupid mistakes or just warn?"
- "Can I schedule an entire week without scrolling?"

---

## 🎯 The End Goal

When done, Peoplecore will be the **only HR platform** that:
- Handles office workers AND shift workers seamlessly
- Doesn't require separate WFM software
- Scales from 10 employees to 10,000
- Actually understands frontline workforce management

**Build with pride.** This module will differentiate us from every competitor. 💪
