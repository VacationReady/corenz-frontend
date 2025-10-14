# CSV Import Scalability Plan

## 1. Current Front-End Implementation Summary
- `CSVImportPage` (`app/(withSidebar)/settings/system/csv-import/page.tsx`) centralises the entire CSV experience (import type selection, template guidance, upload, activation dashboards, welcome email rollout, validation feedback, and schema documentation) inside a single client component that now spans ~1,900 lines.【F:app/(withSidebar)/settings/system/csv-import/page.tsx†L1-L1398】【F:app/(withSidebar)/settings/system/csv-import/page.tsx†L1399-L2079】
- Import metadata (title, dependencies, template names, field group definitions) is embedded in the component via a large `getImportTypeInfo` switch, tightly coupling copy, UI layout, and schema changes.【F:app/(withSidebar)/settings/system/csv-import/page.tsx†L140-L267】
- Employee-specific UX (allow updates toggle, activation dashboards, welcome email rollout, activation stats) is interwoven with generic import logic, making it difficult to reuse for other high-volume domains such as payroll or training records.【F:app/(withSidebar)/settings/system/csv-import/page.tsx†L365-L702】【F:app/(withSidebar)/settings/system/csv-import/page.tsx†L1080-L1384】
- Template documentation renders the entire field matrix directly in JSX, limiting reuse and complicating future template segmentation.【F:app/(withSidebar)/settings/system/csv-import/page.tsx†L1933-L2069】

## 2. Current Back-End Implementation Summary
- The employee import API (`app/api/csv-import/employees/route.ts`) performs synchronous parsing, validation, transformation, persistence, auditing, activation bootstrapping, and manager linkage in one request cycle.【F:app/api/csv-import/employees/route.ts†L1-L1293】
- A single `employeeImportSchema` contains all optional and required fields across personal, payroll, compliance, and onboarding domains, mirroring the monolithic front-end template.【F:app/api/csv-import/employees/route.ts†L10-L87】
- The handler reads the entire CSV into memory, chunks into batches, and processes inside nested loops with Prisma writes and conditional branching for every vertical (leave balances, emergency contacts, compliance artefacts).【F:app/api/csv-import/employees/route.ts†L244-L896】
- Post-processing (manager relationship resolution and promotion) happens synchronously before responding, which can stretch response times for 500+ row imports and couples HRIS workflows to import latency.【F:app/api/csv-import/employees/route.ts†L897-L1237】
- Template generation (GET) is embedded in the same file and mirrors the full schema, meaning any attempt to segment templates must touch server, UI, and docs simultaneously.【F:app/api/csv-import/employees/route.ts†L1294-L1566】

## 3. Scaling Risks for a 500-Employee HRIS
1. **Monolithic employee template** – Finance/payroll, compliance, and training teams cannot independently own imports because a single CSV tries to satisfy every stakeholder. Cross-team edits are risky and error-prone.
2. **Synchronous processing** – 500-row files already stress the current request/response window due to synchronous Prisma writes, post-processing, and audit logging. Larger batches or more templates will increase timeouts and user-perceived instability.
3. **State explosion in UI** – The client component manages disparate concerns (activation, email rollout, template education). Adding payroll- or training-specific options will inflate state and make the UX difficult to navigate.
4. **Tight coupling of guidance and schema** – Template copy, validation requirements, and field metadata live in code. Enabling dynamic templates (e.g., payroll-only) requires redeploys instead of configuration updates.
5. **Limited observability** – Errors are aggregated per batch but lack domain tagging (e.g., payroll vs. compliance). Segmented imports would benefit from domain-specific dashboards and retry tooling.

## 4. Recommended Refactor Roadmap

### 4.1 Foundation: Modular Import Framework
- **Create domain configuration files** (`lib/csv-import/domains/{employees, payroll, training}.ts`) describing field groups, validation snippets, template copy, and dependencies. Reference these from both UI and API to avoid divergence.
- **Split the front-end component** into composable sections: `ImportTypePicker`, `TemplateGuidance`, `FileUploadPanel`, `EmployeeActivationPanel`, etc. Co-locate employee-only panels in `EmployeeImportExperience` to prepare for future domain modules.
- **Introduce a shared CSV import layout** that reads domain configuration and renders guidance automatically (e.g., iterate over `fieldGroups` from config rather than JSX). This enables new templates without editing the main page.

### 4.2 Employee Domain Segmentation
- **Define sub-templates** within the employee domain: `core` (personal/contact), `employment` (job/manager/pattern), `payroll` (banking, tax, KiwiSaver), `compliance` (driver licence, checks), `training` (courses). Allow administrators to download each individually or as an “all-in-one” bundle.
- **Expose sub-template toggles** in UI so HR, payroll, or compliance teams can focus on relevant columns. Pre-populate optional columns only when the corresponding toggle is selected to reduce noise for first-time imports.
- **Persist import intent** (e.g., `?scope=payroll`) so that the API can run domain-specific validations and skip irrelevant logic, reducing processing time and error noise.

### 4.3 Back-End Pipeline Enhancements
- **Refactor the POST handler into domain services** (`services/imports/employees/core.ts`, `payroll.ts`, etc.) that accept parsed rows and return Prisma mutation payloads. Compose them based on requested template scope.
- **Adopt background job processing** for large imports: enqueue the parsed payload (or object storage reference) to a worker queue (e.g., BullMQ/Cloud Tasks). Respond immediately with a tracking ID and stream progress via WebSockets or polling. Retain the current synchronous path for small imports during transition.
- **Add transactional batching** per domain: wrap related writes (e.g., payroll updates) in `prisma.$transaction` per batch to keep data consistent and allow partial retries if payroll processing fails while personal data succeeds.
- **Store original CSV and parsed JSON** for audit/replay, enabling targeted re-imports when payroll rules change without asking HR to rebuild spreadsheets.

### 4.4 UX & Operational Improvements
- **Dedicated dashboards**: surface import history, per-domain success rates, and remediation actions (e.g., resend payroll-only rows) by consuming a new `/api/csv-import/history` endpoint.
- **Role-based access**: gate payroll and compliance imports behind permissions and hide irrelevant templates to reduce cognitive load.
- **Activation automation**: move welcome email and activation flows into standalone pages/components and trigger automatically once employee core data is confirmed, decoupling onboarding from payroll/training imports.

### 4.5 Governance & Change Management
- **Version templates** (e.g., `employees-core-v2.csv`) and include version metadata in import payloads. The server can validate compatibility and prompt users when a newer template exists.
- **Document field ownership** per domain (HR, Payroll, L&D) and implement review workflows before releasing schema changes. The new configuration files can expose ownership metadata for documentation.

## 5. Suggested Iteration Plan
1. **Sprint 1** – Extract configuration + UI modularisation (front-end only). No behavioural changes, but drastically reduces component size and prepares for scope-based templates.
2. **Sprint 2** – Break employee import API into domain services, maintain synchronous path, introduce `scope` query parameter, and enable UI toggles for payroll/training templates.
3. **Sprint 3** – Introduce background job ingestion for large files, add progress polling, and persist import audit records (including CSV storage).
4. **Sprint 4** – Launch dedicated dashboards, enforce role-based access, and move activation/welcome journeys into their own experiences.
5. **Ongoing** – Version templates, onboard domain owners, and add automated regression tests per template scope.

Executing this roadmap positions the CSV import experience to scale with a 500-employee organisation by giving each function bespoke tooling while keeping the underlying infrastructure maintainable and observable.

## 6. Deployment Prompt for an AI Implementation Agent

Use the following prompt to engage an AI software delivery agent (with repository access, ability to run commands, and create pull requests) so it can execute the roadmap above. The prompt assumes the agent starts with no additional context beyond this repository.

---

**Role**: You are a senior full-stack engineer responsible for modularising and scaling the CSV import experience in the Corenz HRIS platform. You will work in the `/workspace/corenz-frontend` repository.

**Primary Objective**: Implement the multi-phase CSV import refactor described in `docs/CSV_IMPORT_SCALABILITY_PLAN.md`, delivering production-ready code that enables domain-specific templates (employees core, payroll, training), modular UI components, and a scalable backend processing pipeline.

**Context & Resources**:
1. Review `docs/CSV_IMPORT_SCALABILITY_PLAN.md` entirely, focusing on Sections 4 and 5 for deliverable milestones.
2. Familiarise yourself with the current implementation in:
   - `app/(withSidebar)/settings/system/csv-import/page.tsx`
   - `app/api/csv-import/employees/route.ts`
3. Configuration and utility code will live under new directories you create (e.g., `lib/csv-import/domains`, `services/imports`).

**Execution Milestones** (execute iteratively, committing logical chunks):
1. **Foundation (Sprint 1)**
   - Extract domain configuration objects for employees, payroll, and training into `lib/csv-import/domains/*`.
   - Refactor the front-end into reusable components (`ImportTypePicker`, `TemplateGuidance`, `FileUploadPanel`, `EmployeeImportExperience`, etc.).
   - Ensure existing behaviour and tests continue to pass.
2. **Employee Domain Segmentation (Sprint 2)**
   - Introduce sub-template toggles and scoping across UI and API.
   - Add query parameters or persisted state so the backend can receive template scope.
   - Maintain backwards compatibility with the monolithic template until deprecation is approved.
3. **Backend Enhancements (Sprint 3)**
   - Break the POST handler into domain services (one per sub-template) under `services/imports/employees`.
   - Introduce background job scaffolding (queue configuration, worker entry point, enqueue logic, status endpoint/UI polling).
   - Store raw CSV and parsed JSON for audit and replay.
4. **UX & Ops Improvements (Sprint 4)**
   - Build dashboards or history views for import tracking.
   - Enforce role-based access to payroll/compliance imports.
   - Decouple activation workflows from the CSV page into dedicated flows triggered post-validation.
5. **Governance & Change Management (Ongoing)**
   - Implement template versioning metadata, domain ownership documentation, and regression tests per template scope.

**Quality & Tooling Expectations**:
- Run applicable tests (`npm test`, `npm run lint`, integration suites) before each commit; document results.
- Add new automated tests covering template selection, API scope routing, background job processing, and regression cases.
- Provide migration scripts or data backfills if schema changes are required.
- Update documentation (`docs/CSV_IMPORT_SCALABILITY_PLAN.md` and newly created guides) whenever behaviour changes.

**Success Criteria**:
- UI supports modular templates without regressions to current employee import flow.
- Backend processes scoped imports efficiently, with asynchronous handling available for large files.
- Observability (dashboards, logs, persisted audit records) enables HR, payroll, and training teams to self-serve.
- Tests and linting pass; PR includes detailed summary and rollout considerations.

**Communication**:
- Use clear commit messages per milestone.
- Surface blockers or assumptions in PR descriptions.
- Provide rollout notes covering feature flags, data migrations, and stakeholder enablement.

---

Provide this prompt verbatim (including sections and formatting) to the AI implementation agent to initiate the deployment effort.
