# Performance Template Builder - Quick Start Guide

## 🚀 **Getting Started**

### **Step 1: Run Database Migration**

Before using the template builder, apply the schema changes:

```bash
npx prisma migrate deploy
npx prisma generate
```

This adds the new fields to the `PerformanceTemplate` model:
- `audienceFilters` (JSON) - Target specific departments, locations, job roles
- `reviewerAssignments` (JSON) - Configure reviewer roles and due dates
- `bestPracticePackIds` (String[]) - Import curated content packs
- New template types: `REVIEW_CYCLE` and `THREE_SIXTY`

---

## 📋 **Feature Overview**

### **9 Template Types**
1. **1-2-1 Meeting** - Weekly/bi-weekly check-ins
2. **Probation Review** - End-of-probation assessments
3. **Quarterly Review** - Performance check-ins every quarter
4. **Annual Review** - Comprehensive yearly evaluations
5. **Mid-Year Review** - Half-year progress checks
6. **Project Retrospective** - Post-project reflections
7. **Review Cycle** ⭐ NEW - Cadence-based review programs
8. **360° Review** ⭐ NEW - Multi-rater feedback
9. **Custom Template** - Build from scratch

### **Key Features**
- ✅ **Audience Targeting** - Filter by departments, locations, job roles
- ✅ **Reviewer Configuration** - Self, Manager, Peer, Direct Report, Skip-Level, HR
- ✅ **Best Practice Packs** - Pre-built question sets for quick setup
- ✅ **Full Form Builder** - Sections, questions, 7 question types
- ✅ **Template Versioning** - Track changes over time
- ✅ **Clone/Duplicate** - Reuse existing templates
- ✅ **Permission Gating** - Admin/Manager only

---

## 🎯 **User Flows**

### **Create a New Template**

1. Navigate to `/performance`
2. Click **"Add Template"** button (admin/manager only)
3. **Step 1: Choose Template Type**
   - Select from 9 template types
   - See "when to use" guidance
   - Review default reviewers

4. **Step 2: Define Target Audience** (Optional)
   - Select departments, locations, job roles
   - Or skip to apply company-wide

5. **Step 3: Configure Reviewers** (Optional)
   - Add reviewer roles (Self, Manager, Peer, etc.)
   - Set due date offsets (e.g., "Self due Day 0, Manager due Day 7")
   - Mark reviewers as required/optional
   - Set min/max reviewers for peer/direct report feedback

6. **Step 4: Import Best Practices** (Optional)
   - Browse curated question packs
   - Preview sections and questions
   - Import with one click
   - Edit in next step

7. **Step 5: Build Your Template**
   - Enter template name and description
   - Add sections (collapsible)
   - Add questions to each section
   - Choose question types: TEXT, TEXTAREA, RATING, MULTIPLE_CHOICE, YES_NO, DATE, NUMBER
   - Mark sections/questions as required
   - Drag to reorder (visual handles)

8. Click **"Create Template"** → Redirects to template detail page

---

### **View Templates**

1. Navigate to `/performance/templates`
2. **Filter by type**: All, 1-2-1, Review Cycles, 360°, etc.
3. **View template cards** showing:
   - Template name and type
   - Tags and status (Active/Inactive, Default)
   - Audience filter count
   - Reviewer configuration count
   - Created by

4. **Actions** (dropdown menu):
   - View Details
   - Edit
   - Clone
   - Delete

---

### **Edit Existing Template**

1. Navigate to `/performance/templates/{id}/edit`
2. **3 Tabs**:
   - **Template Builder** - Edit name, sections, questions
   - **Target Audience** - Modify filters
   - **Reviewers** - Update reviewer configuration

3. Click **"Save Changes"** → Version increments automatically

---

## 💡 **Example Use Cases**

### **Use Case 1: CEO Wants Quarterly 360° Reviews for Leadership**

**Setup:**
- Template Type: 360° Review
- Audience: Job Role = "Manager", "Senior Manager", "Director"
- Reviewers:
  - Self (Day 0, Required)
  - Manager (Day 7, Required)
  - Peer (Day 7, Min: 3, Max: 5)
  - Direct Report (Day 7, Min: 2)
- Best Practice Packs: "Leadership Skills", "Communication Skills"

**Result:** Leaders get comprehensive multi-rater feedback every quarter with specific timeline.

---

### **Use Case 2: HR Wants Probation Reviews for New Hires**

**Setup:**
- Template Type: Probation Review
- Audience: All (company-wide)
- Reviewers:
  - Self (Day 0, Required)
  - Manager (Day 5, Required)
  - HR (Day 10, Required)
- Custom sections: "Performance Goals", "Cultural Fit", "Recommendation"

**Result:** Standardized 3-month probation review process with self, manager, and HR input.

---

### **Use Case 3: Engineering Team Wants Weekly 1-2-1s**

**Setup:**
- Template Type: 1-2-1 Meeting
- Audience: Department = "Engineering"
- Reviewers:
  - Self (Day 0)
  - Manager (Day 0)
- Best Practice Pack: "Career Development", "Project Check-in"

**Result:** Consistent weekly check-in structure for all engineers with focus on growth and progress.

---

## 🎨 **UX Highlights**

### **Wizard Design**
- **Progress tracking** with visual step indicators
- **Validation** only when needed (not blocking)
- **Optional steps** can be skipped
- **Contextual help** at each step
- **Clean, minimalist** interface
- **Mobile responsive** throughout

### **Template Builder**
- **Collapsible sections** for better organization
- **Drag handles** for visual reordering (currently visual only)
- **Question type selector** with 7 types
- **Required field toggles** for sections and questions
- **Template summary** showing counts

### **Templates Listing**
- **Filter by type** with counts
- **Visual type icons** from template metadata
- **Quick actions** in dropdown menu
- **Status badges** (Active, Inactive, Default)
- **Search and filtering** (type-based)

---

## 🔌 **API Endpoints**

### **Templates CRUD**

```typescript
// List all templates
GET /api/performance/templates
Query params: ?type=THREE_SIXTY&isActive=true&includeSections=true

// Get single template
GET /api/performance/templates/{id}

// Create template
POST /api/performance/templates
Body: {
  name: string,
  type: TemplateType,
  audienceFilters?: { locations, departments, jobRoles },
  reviewerAssignments?: [...],
  bestPracticePackIds?: [...],
  sections: [...]
}

// Update template
PUT /api/performance/templates/{id}
Body: { ...same as POST }

// Delete template
DELETE /api/performance/templates/{id}
```

---

## 📊 **Data Model**

### **Template with All Fields**

```json
{
  "id": "uuid",
  "companyId": "uuid",
  "name": "Engineering 360° Review",
  "description": "Comprehensive multi-rater feedback for engineering leaders",
  "type": "THREE_SIXTY",
  "icon": "Layers",
  "isDefault": false,
  "isActive": true,
  "version": 1,
  "tags": ["Leadership", "Engineering"],
  "visibility": "DEPARTMENT",
  "audienceFilters": {
    "departments": ["uuid-dept-1"],
    "jobRoles": ["uuid-role-1", "uuid-role-2"]
  },
  "reviewerAssignments": [
    {
      "role": "SELF",
      "dueOffsetDays": 0,
      "isRequired": true
    },
    {
      "role": "MANAGER",
      "dueOffsetDays": 7,
      "isRequired": true
    },
    {
      "role": "PEER",
      "dueOffsetDays": 7,
      "minReviewers": 3,
      "maxReviewers": 5,
      "isRequired": false
    },
    {
      "role": "DIRECT_REPORT",
      "dueOffsetDays": 7,
      "minReviewers": 2,
      "isRequired": false
    }
  ],
  "bestPracticePackIds": ["leadership-pack", "communication-pack"],
  "sections": [
    {
      "id": "uuid",
      "title": "Leadership Effectiveness",
      "description": "Assess leadership capabilities",
      "order": 0,
      "isRequired": true,
      "questions": [
        {
          "id": "uuid",
          "question": "How effectively does this person communicate vision?",
          "type": "RATING",
          "order": 0,
          "isRequired": true,
          "options": { "min": 1, "max": 5 }
        }
      ]
    }
  ],
  "createdBy": "uuid",
  "createdAt": "2025-01-09T10:00:00Z",
  "updatedAt": "2025-01-09T10:00:00Z"
}
```

---

## 🧪 **Testing Checklist**

- [ ] Create template with all 9 types
- [ ] Add audience filters (departments, locations, job roles)
- [ ] Configure reviewers with different roles and offsets
- [ ] Import best practice packs
- [ ] Build sections and questions
- [ ] Save template successfully
- [ ] View template in listing
- [ ] View template detail page
- [ ] Edit existing template
- [ ] Clone template
- [ ] Delete template
- [ ] Test permission gating (non-admin can't create)
- [ ] Mobile responsiveness
- [ ] Validation messages

---

## 🚦 **Deployment Steps**

1. **Run migration**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Build application**:
   ```bash
   npm run build
   ```

3. **Test in staging**:
   - Create a template
   - Edit and clone
   - Verify API responses
   - Test all 9 template types

4. **Deploy to production**

5. **User training**:
   - Share this quick start guide
   - Demo template creation flow
   - Highlight best practice packs

---

## 🎓 **Best Practices**

### **Template Design**
- Keep sections focused (3-5 questions per section)
- Use clear, concise questions
- Leverage rating scales for quantifiable data
- Include open-ended questions for context
- Mark only critical fields as required

### **Reviewer Configuration**
- Stagger due dates (e.g., Self → Manager → HR)
- Set realistic min/max for peer/direct report feedback
- Make self-review always first (Day 0)
- Consider workload when setting reviewer counts

### **Audience Targeting**
- Start broad, then refine
- Use job roles for role-specific templates
- Combine filters for precise targeting
- Document why filters were chosen

---

## 💡 **Tips & Tricks**

1. **Clone, don't rebuild** - Start from existing templates and customize
2. **Use best practice packs** - Save time with curated content
3. **Version control** - Templates auto-increment versions on edit
4. **Test with small audience** - Use audience filters to pilot
5. **Consistent naming** - Use clear naming conventions (e.g., "Q1 2025 Engineering 360°")

---

## 🆘 **Troubleshooting**

**Problem**: "Can't see Add Template button"  
**Solution**: Requires ADMIN, SUPER_ADMIN, MANAGER, or HR role

**Problem**: "Migration fails"  
**Solution**: Check existing data conflicts, backup database first

**Problem**: "Template not saving"  
**Solution**: Ensure at least one section with questions, name is required

**Problem**: "Best practice packs not showing"  
**Solution**: Packs are template-type specific (e.g., 360° packs only show for 360° templates)

---

## 📞 **Support**

For issues or questions:
- Check `PERFORMANCE_TEMPLATE_BUILDER_IMPLEMENTATION.md` for technical details
- Review API responses in network tab
- Check browser console for errors

---

**Version**: 1.0  
**Last Updated**: January 9, 2025  
**Status**: ✅ Production Ready
