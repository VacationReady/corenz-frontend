# Performance Template Builder - Implementation Summary

## ✅ **Completed (Step 1 & 2)**

### 1. **Database Schema Updates**
- ✅ Extended `TemplateType` enum with `REVIEW_CYCLE` and `THREE_SIXTY`
- ✅ Added JSON fields to `PerformanceTemplate`:
  - `audienceFilters` - locations, departments, jobRoles filtering
  - `reviewerAssignments` - reviewer roles with due date offsets
  - `bestPracticePackIds` - array of curated content pack IDs
- ✅ Created migration: `20250109090000_extend_performance_templates`
- ✅ `ReviewerRole` enum already exists with all required roles

### 2. **UI Entry Point Updates**
- ✅ Added "Add Template" button to `/performance` page (admin/manager only)
- ✅ Split tabs:
  - "Review Cycles" - for cadence-based programs
  - "360 Reviews" - for multi-rater feedback
- ✅ Added router navigation to wizard with type pre-selection

### 3. **TypeScript Types Created**
- ✅ `types/performance-templates.ts` with comprehensive types:
  - `TemplateType`, `ReviewerRole`, `AudienceFilters`
  - `ReviewerAssignment`, `PerformanceTemplate`
  - `TemplateSection`, `TemplateQuestion`, `BestPracticePack`
  - `TemplateWizardState` for multi-step wizard
  - `TEMPLATE_TYPE_INFO` with metadata for all 9 template types
  - `REVIEWER_ROLE_INFO` with tips and descriptions

### 4. **Wizard Page Created**
- ✅ `/performance/templates/new/page.tsx`:
  - 5-step wizard with progress tracking
  - Step indicators with completion status
  - Permission checks (admin/manager only)
  - Navigation between steps with validation
  - Save handler with API integration

### 5. **Wizard Components Started**
- ✅ `TemplateTypeSelector` - Radio card selection for 9 template types
  - Featured templates (Most Popular): 1-2-1, Review Cycle, 360°
  - Other templates: Annual, Quarterly, etc.
  - Visual icons and "when to use" guidance
  - Shows default reviewers per type

---

## 🔄 **Remaining Work (Steps 3-6)**

### Step 1: Audience Filter Step Component
**File**: `components/performance/wizard/AudienceFilterStep.tsx`

**Features Needed**:
- Multi-select for Locations (fetch from `/api/locations`)
- Multi-select for Departments (fetch from `/api/departments`)
- Multi-select for Job Roles (fetch from `/api/job-roles`)
- Checkbox UI similar to CSV import gradual rollout
- Optional filters (can skip this step)
- Preview of selected audience

### Step 2: Reviewer Assignment Step Component
**File**: `components/performance/wizard/ReviewerAssignmentStep.tsx`

**Features Needed**:
- List of reviewer roles with add/remove
- Due date offset configuration (e.g., "Self review due 5 days before manager")
- Min/max reviewers for peer/direct report roles
- Required vs optional toggle
- Helper tips from `REVIEWER_ROLE_INFO`
- Auto-populate defaults based on template type

### Step 3: Best Practice Pack Step Component
**File**: `components/performance/wizard/BestPracticePackStep.tsx`

**Features Needed**:
- Card grid of curated packs per template type
- Preview sections/questions in each pack
- Multi-select with visual indication
- Import to builder with edit option
- Create best-practice pack seed data

### Step 4: Template Builder Step Component
**File**: `components/performance/wizard/TemplateBuilderStep.tsx`

**Features Needed**:
- Embed `FormBuilder` component
- Name and description fields
- Section management (add, remove, reorder)
- Question types: TEXT, TEXTAREA, RATING, MULTIPLE_CHOICE, etc.
- Import from best-practice packs
- Preview mode

### Step 5: API Route Updates
**File**: `app/api/performance/templates/route.ts`

**Endpoints to Create/Update**:
```typescript
// POST /api/performance/templates
- Accept new fields: audienceFilters, reviewerAssignments, bestPracticePackIds
- Validate with Zod schema
- Create template with sections
- Return created template

// GET /api/performance/templates
- Filter by type, isActive
- Include sections if requested
- Return with audience filters and reviewer info

// GET /api/performance/templates/[id]
- Load full template with all fields
- Include Creator info
- Return sections

// PUT /api/performance/templates/[id]
- Update template fields
- Handle section updates
- Version increment
```

### Step 6: Templates Listing & Edit Pages

**File**: `app/(withSidebar)/performance/templates/page.tsx`
- Table/cards of templates
- Filter by type, status
- Show audience filters, reviewer setup
- Quick actions (edit, clone, deactivate)

**File**: `app/(withSidebar)/performance/templates/[id]/page.tsx`
- Template details view
- Usage statistics
- Associated review cycles

**File**: `app/(withSidebar)/performance/templates/[id]/edit/page.tsx`
- Reuse wizard with prefilled data
- Update mode instead of create

### Step 7: Best Practice Packs Seed Data

**File**: `prisma/seed-best-practice-packs.ts`
- Create curated packs for each template type:
  - **1-2-1 Packs**: "Career Development", "Project Check-in", "Wellbeing"
  - **360 Packs**: "Leadership Skills", "Communication", "Team Collaboration"
  - **Review Cycle Packs**: "Goal Setting", "Performance Assessment", "Development Planning"
  - **Annual Review Packs**: "Compensation Discussion", "Promotion Criteria"

---

## 📊 **Data Model**

### Template with New Fields Example:
```json
{
  "id": "uuid",
  "name": "Engineering 360° Review",
  "type": "THREE_SIXTY",
  "audienceFilters": {
    "departments": ["0fb269ce-..."],
    "jobRoles": ["e472d6ff-..."]
  },
  "reviewerAssignments": [
    { "role": "SELF", "dueOffsetDays": 0, "isRequired": true },
    { "role": "MANAGER", "dueOffsetDays": 7, "isRequired": true },
    { "role": "PEER", "dueOffsetDays": 7, "minReviewers": 2, "maxReviewers": 5 },
    { "role": "DIRECT_REPORT", "dueOffsetDays": 7, "minReviewers": 1 }
  ],
  "bestPracticePackIds": ["leadership-pack", "communication-pack"],
  "sections": [...]
}
```

---

## 🎨 **UX Highlights**

### **Wizard Flow**:
1. **Step 1 - Type Selection**: Visual cards with icons, descriptions, "when to use" guidance
2. **Step 2 - Audience**: Optional filters with multi-select, "Apply to all" option
3. **Step 3 - Reviewers**: Drag-to-reorder roles, due date timeline visualization
4. **Step 4 - Best Practices**: Preview pack contents, one-click import
5. **Step 5 - Builder**: Full form builder with imported content editable

### **Design Principles**:
- ✅ Minimalist, clean interface (following Journey Designer UX improvements)
- ✅ Progress tracking with visual step indicators
- ✅ Contextual help tips at each step
- ✅ Can skip optional steps
- ✅ Mobile responsive
- ✅ Validation only when needed (not blocking)

---

## 🔌 **Integration Points**

### **Existing APIs to Use**:
- `/api/locations` - for audience filters
- `/api/departments` - for audience filters
- `/api/job-roles` - for audience filters
- `/api/performance/templates` - CRUD operations

### **New APIs to Create**:
- `/api/performance/best-practice-packs` - List available packs
- `/api/performance/best-practice-packs/[id]` - Get pack details

---

## 🧪 **Testing Checklist**

- [ ] Template type selection and navigation
- [ ] Audience filter multi-select (all APIs respond)
- [ ] Reviewer assignment add/remove
- [ ] Best practice pack import
- [ ] Form builder integration
- [ ] Save template with all fields
- [ ] Edit existing template
- [ ] Permission checks (admin/manager only)
- [ ] Mobile responsiveness
- [ ] Validation at each step

---

## 📈 **Analytics Events to Track**

```typescript
// Template creation flow
- "performance_template.wizard_started" { type }
- "performance_template.step_completed" { step, type }
- "performance_template.created" { 
    type, 
    hasAudienceFilters, 
    reviewerCount, 
    bestPracticePacksUsed,
    sectionCount 
  }
- "performance_template.best_practice_imported" { packId, type }
```

---

## 🚀 **Deployment Checklist**

1. ✅ Run Prisma migration: `npx prisma migrate deploy`
2. ✅ Generate Prisma client: `npx prisma generate`
3. ⏳ Seed best-practice packs
4. ⏳ Update TypeScript types
5. ⏳ Build wizard components
6. ⏳ Create/update API routes
7. ⏳ Add analytics tracking
8. ⏳ Test end-to-end flow
9. ⏳ Deploy to staging
10. ⏳ User acceptance testing

---

## 💡 **Future Enhancements**

### **Phase 2 Features**:
- Template versioning with changelog
- Template library sharing between companies
- AI-powered template suggestions
- Template usage analytics (which templates are most effective)
- Template cloning and forking
- Template approval workflows
- Integration with review cycle automation

### **Phase 3 Features**:
- Smart scheduling based on reviewer workload
- Automated reminder sequences
- Template marketplace
- Custom branding per template
- Multi-language support
- Advanced logic/branching in templates

---

## 📝 **Current Status**

**Implementation Progress**: 40% Complete

✅ **Completed**:
- Database schema and migration
- TypeScript types
- Performance page updates
- Wizard page structure
- Template type selector component

⏳ **In Progress**:
- Wizard step components

🔜 **Next Steps**:
1. Build remaining wizard components (Audience, Reviewers, Best Practices, Builder)
2. Update API routes to handle new fields
3. Create templates listing page
4. Seed best-practice packs
5. End-to-end testing

---

**Ready for Testing**: ❌ NO  
**Migration Required**: ✅ YES (run `npx prisma migrate deploy`)  
**Estimated Completion**: 60-70% more work needed
