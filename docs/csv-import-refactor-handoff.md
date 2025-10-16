# CSV Import Refactor Handoff

## Overview
- **Objective**: Complete the CSV import foundation refactor (Sprint 1) to deliver a modular, domain-driven UI that leverages shared configuration objects and reusable components.
- **Scope reference**: `docs/CSV_IMPORT_SCALABILITY_PLAN.md` and Sprint 1 tasks tracked in the shared TODO list.

## Completed Work
- **Domain configuration layer** (`lib/csv-import/domains/` & `lib/csv-import/types.ts`)
  - Established strongly typed configs for employees, departments, job roles, working patterns, payroll, and training.
  - Added `CSVImportIconName`, field group, template, and sub-template typings.
  - Exported registry helpers (`CSV_IMPORT_DOMAIN_CONFIGS`, `getDomainConfig`, `CSVImportDomainId`).
- **Shared UI component suite** (`app/(withSidebar)/settings/system/csv-import/components/`)
  - `components/icon-map.tsx`: Centralised Lucide icon rendering based on config icon keys.
  - `components/TemplateGuidance.tsx`: Renders key notes and field groups for the default template derived from config.
  - `components/ImportTypeSelector.tsx`: Card-based selector that lists domain options with icons and displays the selected template metadata.
  - **New this session**: Extracted `ActivationStatusCard`, `ImportInstructionsCard`, `FileUploadCard`, `ImportProgressCard`, `EmployeeActivationOptions`, and `EmployeeWelcomeRollout` to modularise activation dashboards, instructions, file uploads, and welcome-email rollout flows.
- **Main page integration** (`app/(withSidebar)/settings/system/csv-import/page.tsx`)
  - Replaced legacy `getImportTypeInfo` usage with `getDomainConfig(selectedImportType)` / `getDefaultTemplate` helpers.
  - Injected dynamic metadata into the UI (labels, descriptions, dependencies, template files).
  - Embedded `TemplateGuidance`, `ImportTypeSelector`, and the newly extracted component suite to consolidate template details and decouple complex sections.
  - Added local `types.ts` (co-located with the page) to hold import progress, activation, and welcome-email typings shared across the new component tree.
  - Removed duplicate “Template Field Blueprint” block that relied on stale structures.

## In-Flight / Next Tasks (Sprint 1 & Beyond)
- **Finalize component extraction**
  - Review the remaining inline blocks in `page.tsx` (e.g., detailed import results list, welcome email modal wiring) and continue relocating them into dedicated components where beneficial.
  - Ensure `Checkbox` imports and casing remain consistent across newly extracted modules.
- **Employee sub-template UX**
  - Surface `config.subTemplates` options for the employee domain (e.g., checkboxes or chips to scope template downloads/uploads) and adjust download logic accordingly.
- **Download & upload plumbing**
  - Connect the selector to template download endpoints so selected templates map to existing backend routes.
  - Ensure upload requests pass template/sub-template context if needed by the API contract.
- **Activation & welcome workflows validation**
  - Re-run activation dashboard and welcome email flows end-to-end to confirm behaviour after modularisation.
  - Backfill any missing API integration (e.g., `handleSendEmailsToSelected`, modal interactions) with new component boundaries.
- **Typing & lint follow-up**
  - Audit remaining handlers for explicit typing; confirm no implicit `any` warnings remain in the new components.
  - Address casing inconsistencies by standardising UI imports or introducing barrel exports if agreed by the team.
- **Tests & docs**
  - Add component/unit tests covering the new config-driven components and edge cases (missing templates, empty key notes, empty activation stats).
  - Update user-facing docs once the refactored layout is fully stabilised.

## Follow-Up Considerations
- **Sprint 2 scope** (per plan): extend employee domain handling with scoped templates and API updates.
- **Rollout readiness**: Validate download bundles, ensure API endpoints handle new metadata, and plan QA for each domain import.
- **Collaboration tips**: Keep new components colocated under `components/` to maintain clarity; avoid editing unrelated casing-sensitive imports until a repo-wide decision is made.

---
**Point of contact for previous work**: See commit history around `lib/csv-import/` and the modular component directory for implementation details.
