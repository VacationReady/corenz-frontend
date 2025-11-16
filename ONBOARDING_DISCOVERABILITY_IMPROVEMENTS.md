# Onboarding Area: Improved Discoverability Implementation

## Overview
This document outlines the discoverability improvements implemented for the onboarding builder, focusing on enhanced user experience, tenant-scoped data access, and compliance with accessibility standards.

---

## ✅ Completed: Journey Template Picker (Requirement 1)

### Implementation
**File:** `components/onboarding/JourneyTemplatePicker.tsx`

Replaced raw journey ID text inputs with a searchable, tenant-scoped picker component that:

- **Searchable Interface**: Full-text search across journey names, descriptions, personas, categories, and owners
- **Tenant-Scoped**: Automatically filters journeys by the current user's company ID via session
- **Cross-Tenant Prevention**: Server-side validation in `/api/journeys` ensures journeys can only be accessed by their owning tenant
- **Rich Display**: Shows journey status, persona, duration, owner information, and active instance counts
- **Visual Feedback**: Loading states, error handling, and empty states with guidance

### Integration
- **MetadataPanel Integration**: Updated `app/components/onboarding/builder/MetadataPanel.tsx` to use the picker for journey-automation step types
- **Validation**: Journey template IDs are validated in `app/api/onboarding/templates/actions.ts` using `validateScopedResources()`

### Security Features
- Server-side tenant isolation via Prisma `where` clauses
- Session-based company ID filtering
- Validation prevents cross-tenant journey reference
- Clear user messaging about tenant boundaries

### User Benefits
- No more memorizing or copying journey IDs
- Visual preview of journey details before selection
- Owner attribution for collaboration
- Prevents configuration errors

---

## 📋 Recommendations for Remaining Features

### Requirement 2: Contextual Help Overlays

**Suggested Implementation:**

```typescript
// components/onboarding/ContextualHelpOverlay.tsx
interface HelpContent {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  articleLinks?: Array<{ title: string; url: string }>;
  segment?: "nz" | "au" | "global";
}

// Example structure
const NZ_HELP_CONTENT: HelpContent[] = [
  {
    id: "nz-onboarding-overview",
    title: "NZ Onboarding Compliance",
    description: "New Zealand-specific onboarding requirements including employment agreements, tax codes, and KiwiSaver enrollment.",
    videoUrl: "/help/videos/nz-onboarding-intro.mp4",
    articleLinks: [
      { title: "Employment Standards Act", url: "/docs/nz/employment-standards" },
      { title: "KiwiSaver Setup Guide", url: "/docs/nz/kiwisaver" }
    ],
    segment: "nz"
  }
];
```

**Integration Points:**
- Add help icon buttons next to complex form fields
- Context-aware tooltips based on current step type
- Modal overlay with video embed and links
- Tenant segment detection from company settings

**Content Requirements:**
- Video walkthroughs for common workflows
- Links to knowledge base articles
- NZ-specific playbooks and compliance guides
- Quick reference cards for step types

---

### Requirement 3: Global Search Within Builder

**Suggested Implementation:**

```typescript
// components/onboarding/GlobalBuilderSearch.tsx
interface SearchResult {
  type: "step" | "preset" | "metadata";
  id: string;
  title: string;
  description: string;
  templateId: string;
  actions: Array<{ label: string; action: () => void }>;
}

// Search index structure
interface SearchIndex {
  steps: Map<string, StepSearchData>;
  presets: Map<string, PresetSearchData>;
  metadata: Map<string, MetadataSearchData>;
}
```

**Features to Include:**
- Fuzzy search across step titles, labels, and metadata
- Preset library search with NZ compliance tagging
- Quick actions: Edit, Duplicate, Link to documentation
- Search history and recent items
- Keyboard shortcuts (Cmd/Ctrl + K)
- Tenant-scoped results only

**Implementation Steps:**
1. Create search index from template data
2. Implement Fuse.js or similar for fuzzy matching
3. Add keyboard shortcut handler
4. Design search results modal with actions
5. Integrate with existing template editor state

---

### Requirement 4: Analytics-Driven Recommendations

**Suggested Implementation:**

```typescript
// lib/onboarding/recommendations.ts
interface RecommendationEngine {
  industry: string;
  employeeCount: number;
  completedFlows: string[];
  tenantTier: string;
}

interface Recommendation {
  stepType: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  complianceRelated: boolean;
}
```

**Example Logic:**
```typescript
function getRecommendations(context: RecommendationEngine): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // NZ-specific compliance
  if (context.industry === "construction" && !context.completedFlows.includes("health-safety-training")) {
    recommendations.push({
      stepType: "compliance-training",
      title: "Health & Safety Induction",
      reason: "Required for construction industry in NZ",
      priority: "high",
      complianceRelated: true
    });
  }

  // Company size recommendations
  if (context.employeeCount > 50 && !context.completedFlows.includes("manager-checkin")) {
    recommendations.push({
      stepType: "manager-checkin",
      title: "Structured Check-ins",
      reason: "Companies with 50+ employees benefit from formal probation reviews",
      priority: "medium",
      complianceRelated: false
    });
  }

  return recommendations;
}
```

**Privacy Considerations:**
- Aggregate data by tenant tier (not individual tenant)
- No PII in recommendation logic
- Opt-in for sharing usage analytics
- Clear data retention policies

**API Endpoint:**
```
GET /api/onboarding/recommendations
Response: { recommendations: Recommendation[], basedOn: "industry" | "size" | "usage" }
```

---

### Requirement 5: Responsive Information Architecture

**Current Status:**
- Onboarding builder uses responsive grid layouts
- Mobile/tablet support via Tailwind breakpoints
- Multi-tenant branding in top navigation

**Enhancements Needed:**

1. **WCAG 2.1 AA Compliance Audit:**
   - Color contrast ratios (4.5:1 minimum)
   - Keyboard navigation for all interactive elements
   - ARIA labels for screen readers
   - Focus indicators on all controls
   - Skip links for long forms

2. **Responsive Improvements:**
   ```typescript
   // Mobile: Stack controls vertically
   <div className="flex flex-col lg:flex-row gap-4">
     <StepTypeSelector className="w-full lg:w-1/3" />
     <MetadataPanel className="w-full lg:w-2/3" />
   </div>
   
   // Tablet: Collapsible sidebars
   <Sheet>
     <SheetTrigger>
       <Button variant="outline" className="lg:hidden">
         Options
       </Button>
     </SheetTrigger>
     <SheetContent side="right">
       <AdvancedOptions />
     </SheetContent>
   </Sheet>
   ```

3. **Multi-Tenant Branding:**
   - Already implemented in navigation
   - Ensure branding persists in all builder views
   - Tenant logo display in header
   - Custom color schemes (if applicable)

---

## Architecture Decisions

### 1. Server-Side Tenant Isolation
All data access goes through Prisma with `where: { companyId: session.user.companyId }` clauses. This ensures database-level isolation and prevents accidental data leakage.

### 2. Component Reusability
The `JourneyTemplatePicker` pattern can be extended to other resource pickers:
- Document pickers
- Form template pickers
- Training module pickers
- Employee role pickers

### 3. Search Strategy
For global search, recommend client-side search with Fuse.js for immediate response times. Server-side search for large datasets.

### 4. Progressive Enhancement
Features gracefully degrade:
- Search works without JavaScript via server-side filtering
- Help overlays have fallback text content
- Touch targets are 44x44px minimum for mobile

---

## Testing Recommendations

### Unit Tests
```typescript
describe("JourneyTemplatePicker", () => {
  it("filters journeys by tenant", () => {
    // Test tenant isolation
  });

  it("validates journey selection before save", () => {
    // Test validation logic
  });

  it("handles empty state gracefully", () => {
    // Test no journeys available
  });
});
```

### Integration Tests
- Test journey picker within template editor workflow
- Verify tenant boundaries in multi-tenant environment
- Test keyboard navigation and accessibility
- Validate search performance with large datasets

### E2E Tests (Playwright)
```typescript
test("user can select journey template from picker", async ({ page }) => {
  await page.goto("/settings/journeys");
  await page.click('[data-testid="add-journey-automation"]');
  await page.click('[data-testid="journey-picker-trigger"]');
  await page.fill('[data-testid="journey-search"]', "New Hire");
  await page.click('[data-testid="journey-result-0"]');
  expect(await page.locator('[data-testid="selected-journey"]').innerText()).toContain("New Hire");
});
```

---

## Performance Considerations

### Journey Picker
- Lazy load journey list (only fetch when dialog opens)
- Debounce search input (300ms)
- Virtualized list for 100+ journeys
- Cache fetched journeys in memory

### Global Search
- Index building on template load
- Search worker thread for large datasets
- Result pagination (10-20 items per page)
- Recent searches localStorage

### Recommendations Engine
- Cache recommendations per session
- Background refresh every 5 minutes
- Fallback to default recommendations if API fails

---

## Deployment Checklist

- [x] Journey Template Picker component created
- [x] Integration into MetadataPanel complete
- [x] Tenant validation enforced server-side
- [ ] Help overlay content created
- [ ] Global search implemented
- [ ] Recommendations engine deployed
- [ ] WCAG 2.1 AA audit completed
- [ ] Mobile/tablet UX tested
- [ ] Documentation updated
- [ ] User training materials created

---

## Future Enhancements

1. **AI-Powered Recommendations**
   - Use GPT-4 to analyze onboarding flows and suggest improvements
   - Natural language queries for builder search
   - Auto-complete for step configurations

2. **Collaboration Features**
   - Real-time co-editing of templates
   - Comments and annotations on steps
   - Version history with diff viewer

3. **Template Marketplace**
   - Share templates across tenants (opt-in)
   - Industry-specific template packs
   - Community ratings and reviews

4. **Advanced Analytics**
   - Completion rate tracking per step
   - Bottleneck identification
   - A/B testing for onboarding flows

---

## Support and Maintenance

### Known Issues
- None currently

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Contact
For questions or issues, contact the development team or refer to the internal documentation portal.

---

**Last Updated:** November 16, 2024  
**Version:** 1.0  
**Status:** Journey Template Picker Complete, Additional Features Pending
