# Rota Groups Implementation Guide

**Status:** ✅ Phase 1 Complete (Visibility Fixed)  
**Next:** Phase 2-5 (Rota Groups Feature)

---

## ✅ PHASE 1: VISIBILITY FIXES (COMPLETED)

### Fixed Components
1. **CreateShiftModal.tsx** - All dropdowns now visible with proper contrast
2. **EditShiftModal.tsx** - All dropdowns now visible with proper contrast  
3. **Rota Page** - Filter dropdowns now visible

### Changes Applied
- Changed `bg-white/5` → `bg-gray-800` (solid dark background)
- Changed `border-white/20` → `border-gray-600` (visible borders)
- Added `className="bg-gray-800 text-white"` to all `<option>` elements
- Added `placeholder-gray-400` for input placeholders
- Added `focus:border-blue-500` for better focus states

**Testing:** Dropdowns should now be clearly visible with white text on dark gray backgrounds.

---

## 🚀 PHASE 2: DATABASE SCHEMA (1-2 Days)

### Step 1: Update Prisma Schema

Add these models to `prisma/schema.prisma`:

```prisma
model RotaGroup {
  id              String   @id @default(cuid())
  companyId       String
  name            String   // "Store #21 – Front of House"
  description     String?
  locationId      String?
  departmentId    String?
  roles           String[] @default([]) // ["Cashier", "Supervisor"]
  requiredSkills  String[] @default([]) // ["POS System"]
  optionalTags    String[] @default([]) // ["Key Holder", "Forklift"]
  color           String?  // "#3B82F6"
  icon            String?  // "🏪"
  isActive        Boolean  @default(true)
  displayOrder    Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Location        Location?         @relation(fields: [locationId], references: [id])
  Department      Department?       @relation(fields: [departmentId], references: [id])
  Members         RotaGroupMember[]
  ShiftTemplates  ShiftTemplate[]
  ShiftRequirements ShiftRequirement[]
  Shifts          Shift[]
  
  @@unique([companyId, name])
  @@index([companyId, isActive])
  @@index([locationId])
  @@index([departmentId])
}

model RotaGroupMember {
  id            String   @id @default(cuid())
  rotaGroupId   String
  employeeId    String
  assignedRoles String[] @default([]) // Roles employee can fill in this group
  isActive      Boolean  @default(true)
  addedAt       DateTime @default(now())
  addedBy       String?
  
  RotaGroup     RotaGroup @relation(fields: [rotaGroupId], references: [id], onDelete: Cascade)
  Employee      Employee  @relation("RotaGroupMembers", fields: [employeeId], references: [id], onDelete: Cascade)
  
  @@unique([rotaGroupId, employeeId])
  @@index([rotaGroupId])
  @@index([employeeId])
  @@index([isActive])
}

model ShiftRequirement {
  id            String   @id @default(cuid())
  companyId     String
  rotaGroupId   String
  dayOfWeek     Int      // 0=Sunday, 6=Saturday
  startTime     String   // "07:00"
  endTime       String   // "15:00"
  role          String   // "Barista"
  quantity      Int      @default(1) // Number needed
  priority      ShiftPriority @default(NORMAL)
  breakDuration Int      @default(30)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  RotaGroup     RotaGroup @relation(fields: [rotaGroupId], references: [id], onDelete: Cascade)
  
  @@index([rotaGroupId])
  @@index([companyId, isActive])
  @@index([dayOfWeek])
}

enum ShiftPriority {
  CRITICAL
  HIGH
  NORMAL
  LOW
}
```

### Step 2: Update Existing Models

Add to `Shift` model:
```prisma
model Shift {
  // ... existing fields
  rotaGroupId     String?
  RotaGroup       RotaGroup? @relation(fields: [rotaGroupId], references: [id], onDelete: SetNull)
  
  @@index([rotaGroupId])
}
```

Add to `ShiftTemplate` model:
```prisma
model ShiftTemplate {
  // ... existing fields
  rotaGroupId     String?
  RotaGroup       RotaGroup? @relation(fields: [rotaGroupId], references: [id], onDelete: SetNull)
  
  @@index([rotaGroupId])
}
```

Add to `Employee` model:
```prisma
model Employee {
  // ... existing fields
  RotaGroupMemberships RotaGroupMember[] @relation("RotaGroupMembers")
}
```

### Step 3: Run Migration

```bash
# Create migration
npx prisma migrate dev --name add_rota_groups

# Or apply SQL directly
psql -d your_database -f prisma/migrations/add_rota_groups.sql

# Generate Prisma client
npx prisma generate
```

---

## 🎨 PHASE 3: ROTA GROUP MANAGEMENT UI (2-3 Days)

### Step 1: Create Rota Group List Page

**File:** `app/(withSidebar)/admin/rota-groups/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Building2, Users, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function RotaGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const response = await fetch('/api/rota-groups');
    const data = await response.json();
    setGroups(data.rotaGroups || []);
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Rota Groups</h1>
          <p className="text-gray-400 mt-1">Manage scheduling pools and shift teams</p>
        </div>
        <Link
          href="/admin/rota-groups/create"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group: any) => (
          <Card key={group.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="text-4xl p-3 rounded-lg" 
                  style={{ backgroundColor: `${group.color}20` }}
                >
                  {group.icon || '📋'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-400">{group.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  {group.location?.name || group.department?.name || 'No location'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="w-4 h-4 text-green-400" />
                  {group._count?.Members || 0} employees
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {group.roles?.slice(0, 3).map((role: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                    {role}
                  </span>
                ))}
                {(group.roles?.length || 0) > 3 && (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                    +{group.roles.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <Link
                  href={`/rota?groupId=${group.id}`}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium text-center transition-all"
                >
                  View Rota
                </Link>
                <Link
                  href={`/admin/rota-groups/${group.id}/edit`}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Create Rota Group Form

**File:** `app/(withSidebar)/admin/rota-groups/[id]/edit/page.tsx` and `create/page.tsx`

Use a shared form component that handles:
- Group name, description
- Location/Department selection
- Roles (multi-input)
- Required skills (multi-input)
- Optional tags (multi-input with autocomplete)
- Color picker
- Icon selector
- Member assignment

### Step 3: Create API Routes

**File:** `app/api/rota-groups/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rotaGroups = await prisma.rotaGroup.findMany({
    where: {
      companyId: session.user.companyId,
      isActive: true,
    },
    include: {
      Location: { select: { id: true, name: true } },
      Department: { select: { id: true, name: true } },
      _count: {
        select: {
          Members: true,
          Shifts: true,
        },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  return NextResponse.json({ rotaGroups });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  
  const rotaGroup = await prisma.rotaGroup.create({
    data: {
      ...body,
      companyId: session.user.companyId,
    },
  });

  return NextResponse.json({ rotaGroup });
}
```

---

## 🔧 PHASE 4: ENHANCED SHIFT CREATION (2 Days)

### Update CreateShiftModal

**File:** `components/rota/CreateShiftModal.tsx`

Add group selection and auto-filtering:

```tsx
// Add to state
const [selectedGroupId, setSelectedGroupId] = useState('');
const [rotaGroups, setRotaGroups] = useState([]);
const [groupMembers, setGroupMembers] = useState([]);

// Fetch rota groups
useEffect(() => {
  if (isOpen) {
    fetchRotaGroups();
  }
}, [isOpen]);

// When group changes, fetch filtered employees
useEffect(() => {
  if (selectedGroupId) {
    fetchGroupMembers(selectedGroupId);
  } else {
    fetchEmployees(); // All employees
  }
}, [selectedGroupId]);

// Add to form
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Rota Group (Optional)
  </label>
  <select
    value={selectedGroupId}
    onChange={(e) => setSelectedGroupId(e.target.value)}
    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="" className="bg-gray-800 text-white">All Employees</option>
    {rotaGroups.map((group) => (
      <option key={group.id} value={group.id} className="bg-gray-800 text-white">
        {group.icon} {group.name} ({group._count.Members} employees)
      </option>
    ))}
  </select>
  <p className="text-xs text-gray-400 mt-1">
    Select a group to only show relevant employees for this shift
  </p>
</div>
```

---

## 📊 PHASE 5: COVERAGE DASHBOARD (2 Days)

### Create Coverage View

**File:** `app/(withSidebar)/rota/coverage/page.tsx`

Shows:
- Requirements vs actual staffing per day/time slot
- Gap detection (red = understaffed, green = filled)
- AI suggestions for filling gaps
- One-click "Fill from template" buttons

Example layout:
```
Mon 07:00-15:00
  Barista:     ✅ 3/3 filled
  Supervisor:  ⚠️ 0/1 needed → [Suggest employees]

Tue 07:00-15:00
  Barista:     ⚠️ 2/3 needed → [Auto-fill]
  Supervisor:  ✅ 1/1 filled
```

---

## 🎯 QUICK WINS & UX IMPROVEMENTS

### 1. Template Quick Actions
Add to rota calendar page:
```tsx
<button className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
  Fill Week from Template
</button>
```

### 2. Smart Employee Badges
Show in employee dropdowns:
```tsx
<option>
  🟢 Sarah Chen - Available • POS Certified • 4.8★
</option>
<option>
  🟡 Mike Torres - Available • OT Risk (38h this week)
</option>
<option>
  🔴 Emma Wilson - Unavailable (on leave)
</option>
```

### 3. Role-Based Filtering
Add role selector before employee selector:
```tsx
<select>
  <option>Select Role First</option>
  <option>Barista (8 qualified)</option>
  <option>Supervisor (3 qualified)</option>
</select>
```

---

## 📱 NAVIGATION UPDATES

Update sidebar to include:
```tsx
// Under "Workforce" section
<NavItem href="/admin/rota-groups" icon={Users}>
  Rota Groups
</NavItem>
<NavItem href="/rota" icon={Calendar}>
  Shift Scheduling
</NavItem>
<NavItem href="/rota/coverage" icon={BarChart}>
  Coverage Dashboard
</NavItem>
```

---

## 🧪 TESTING CHECKLIST

- [ ] Visibility: All dropdowns readable
- [ ] Rota Groups: Create, edit, delete
- [ ] Member Assignment: Add/remove employees from groups
- [ ] Shift Creation: Filter by group
- [ ] Requirements: Define staffing needs
- [ ] Coverage: View gaps and suggestions
- [ ] Templates: Apply to week
- [ ] Conflicts: Detection still works with groups

---

## 📈 SUCCESS METRICS

After implementation:
- **Time to schedule**: < 50% reduction (from selecting 200+ employees to 10-15)
- **Errors**: Fewer scheduling conflicts due to pre-filtered employees
- **User satisfaction**: Clearer mental model, less cognitive load
- **Scalability**: Supports multi-site, multi-department organizations

---

## 🚀 DEPLOYMENT NOTES

1. **Backward Compatible**: Existing shifts without `rotaGroupId` continue to work
2. **Migration Strategy**: Can gradually assign shifts to groups over time
3. **Feature Flag**: Consider adding feature toggle for gradual rollout
4. **Training**: Update help docs and tooltips to explain rota groups

---

This implementation creates a **modern, enterprise-grade WFM system** that properly segments shift workers from salaried staff while providing powerful scheduling tools that scale.
