# Screen Designer Production Readiness Audit

## 0. Executive Summary
- **Production readiness:** **Partially ready** – solid stack, RBAC, audit logs, and test coverage exist, but unresolved security findings, undefined scale targets, and UX/observability gaps block confident go-live.
- **Top 5 critical risks:**
  1. Outstanding critical cross-tenant vulnerabilities flagged in the November audit cast doubt on similar patterns in designer APIs.
  2. No documented autosave or optimistic locking; concurrent editors can overwrite each other with only client-side warnings.
  3. Lack of defined performance targets and load testing for large templates leaves scalability assumptions unvalidated.
  4. Monitoring pipeline is incomplete; telemetry stays in tables with no operational alerts, impeding incident response.
  5. Deployment on 30 s–capped Vercel functions risks timeout for long-running publish/bulk jobs with no alternative execution path.
- **Top 5 high-impact UX improvements:** clearer publish/save/preview affordances, richer onboarding/help, better drag-and-drop feedback for >25-step templates, inline conflict indicators, and accessible typography/contrast updates.
- **Readiness verdict:** **NOT READY – must address critical security, collaboration, performance, and observability gaps before launch.**

## 1. Architecture & Design Review
**Strengths:** Unified Next.js 15/React 19 monorepo with Prisma/Postgres ensures consistent typing end-to-end; strict CSP/HSTS headers and middleware enforce transport security; RBAC and metadata abstractions (StepPalette, metadata schemas) show good separation between layout and configuration; audit/event tables exist for traceability.

**Issues by severity**
- **Critical**
  - *Residual cross-tenant vulnerabilities from earlier audit.* Problem: previous critical findings in adjacent modules signal possible missing tenant filters in designer routes. Fix: re-audit all onboarding/template APIs, add automated tenant-scoped integration tests, and block release until pen-test passes.
  - *No robust collaborative editing control.* Problem: client-only conflict warnings allow data loss. Fix: implement server-side versioning with optimistic locking (e.g., row-version column) and autosave/draft snapshots.
- **Major**
  - *Publish/rollback model limited to single `isActive` flag.* Problem: lacks multi-version history or staged approvals. Fix: add formal draft/published versions with immutable history and ability to clone/rollback.
  - *Designer tightly coupled to Vercel 30 s limits.* Problem: future workflows (bulk imports, rule evaluation) may exceed budget. Fix: move heavy publishing to background jobs (queue/worker) or edge middleware with streaming feedback.
  - *Layout metadata stored via JSON without schema migration strategy.* Problem: Step metadata changes risk breaking renderer consumers. Fix: introduce versioned schema registry and migration scripts.
- **Minor**
  - *Preview limited to inline block.* Problem: lacks device/resolution toggles, making UX validation harder. Fix: add dedicated preview modes.
  - *Palette/canvas pagination defaults may hide steps.* Problem: only 25 steps visible; no global overview. Fix: add minimap/search.
- **Nice-to-have**
  - *No plugin interface for new step types.* Problem: requires code changes for each type. Fix: define manifest-based extensibility and async module loading.

## 2. Code Quality & Maintainability
**Summary:** TypeScript, Zod validation, and React composition provide a solid baseline. However, server/client logic intermixing in route handlers and client components, plus reliance on large metadata JSON blobs, makes testing and refactoring harder.

**Prioritised refactors**
1. Extract shared validation/permission logic into dedicated modules consumed by route handlers and client actions for easier unit testing.
2. Formalise a `ScreenDefinition` TypeScript type shared between Prisma schema, react-hook-form, and renderer to prevent drift.
3. Break large designer components (palette/canvas/config panels) into memoised subcomponents to improve readability and performance.
4. Replace ad-hoc diffing utilities with deterministic helper functions accompanied by unit tests.
5. Introduce repository/service layers between Prisma and handlers to simplify mocking and ensure separation of concerns.

## 3. Security & Permissions
- **Critical:**
  - Legacy critical timesheet vulnerabilities imply similar gaps could exist; need code audit plus automated tenant-based access tests before go-live.
- **High:**
  - Designer relies on client warnings to stop overwriting other editors; a malicious actor could race updates. Enforce server-side version checks and reject stale writes.
  - Metadata JSON may contain user-generated labels; renderer must escape to prevent stored XSS. Review TipTap and custom renderers with CSP-compatible sanitisation.
- **Medium:**
  - Credentials auth searches all tenants for email; brute-force could enumerate tenants without stricter rate-limits/captcha.
  - Visible-to filters need validation to avoid privilege escalation (e.g., allowing employees to expose admin-only fields). Add server-side checks when screens render.
- **Low:**
  - Improve audit logging by including request IDs/IPs to correlate incidents.

## 4. Performance & Scalability
**Likely bottlenecks:** drag-and-drop pagination when >100 steps, serverless timeouts on heavy publish, client cloning of entire template on each render, conflict detection requiring full snapshot fetch.

**Recommendations:**
- Instrument client and API timings, especially for handleSave/Publish with 25/50/100+ steps.
- Add virtualised list or chunked loading for canvas to maintain 60fps on large templates.
- Move diffing/publishing to background workers with job status polling.
- Add caching (tenant/template-level) for read-heavy StepPalette data and metadata schemas.
- Use debounced autosave per step and throttle drag events to reduce re-render load.

## 5. Data Model & Integrity
**Current model:** `OnboardingTemplate` (id, name, description, companyId, isActive) → ordered `OnboardingStep` (type, label, instructions, metadata JSON, SLA/reminders, form/document refs) → optional `Form` (schema JSON, version, visibility filters). Audit via `OnboardingStepAuditLog`. Visibility filters live on form/screen rows (roles/departments/job roles).

**Suggestions:**
- Add `version`, `status`, `publishedAt`, and `publishedBy` columns to templates and steps to support draft history.
- Introduce JSON schema validation with migration versions for metadata; store normalized layout (rows/columns) to enable future responsive layouts.
- Enforce uniqueness constraints (e.g., template name per tenant) and server-side validations for duplicate labels beyond e2e tests.
- Persist `lastEditedBy`/`lastEditedAt` for collaboration visibility.

## 6. UX & UI Design Review
### 6.1 Information Architecture & Flow
- High-impact issues: Save/Publish share same handler; lack of autosave leads to anxiety; pagination hides steps; conflict warnings only on save. Provide persistent status bar showing draft state, last saved time, conflicts, and collaborator presence.

### 6.2 Visual Design & Layout
- Palette/canvas/panel tri-pane is modern but needs clearer hierarchy (use neutral background, card shadows, sticky headers). Buttons should differentiate destructive vs primary actions. Consider adopting 12-column grid with consistent spacing tokens.

### 6.3 Interaction Design
- Drag-and-drop works via @dnd-kit but lacks ghost previews for multi-step moves. Add placeholders, snap lines, and keyboard reordering.
- Missing undo/redo; add history stack using existing tenant metadata versioning hook.

### 6.4 Clarity & Learnability
- Provide collapsible configuration groups (Basics, Validation, Visibility, Automations) with inline help/tooltips referencing knowledge base.
- Add onboarding checklist or quick-start modal linking to documentation.

### 6.5 Accessibility & Responsiveness
- Ensure focus outlines on draggable items and forms; add ARIA labels for palette items. Improve text contrast within Tailwind theme; verify TipTap toolbar tab order. Provide responsive breakpoints or horizontal scrolling indicators for narrow viewports.

**Issue groups**
- **High impact usability:** ambiguous save/publish actions, hidden steps due to pagination, missing conflict/undo cues.
- **Aesthetic/polish:** inconsistent spacing, limited preview modes, lack of empty-state illustrations/tooltips.
- **Accessibility:** insufficient keyboard support for drag/drop, need descriptive labels for metadata controls, ensure color contrast meets WCAG AA.

## 7. Feature Completeness vs Expected HRIS Standard
| Capability | Expected | Current State |
| --- | --- | --- |
| Create/edit/duplicate/delete screens | Yes | Present (templates CRUD via APIs). |
| Drag/drop reorder & section grouping | Yes | Present with @dnd-kit but pagination limits visibility. |
| Field types (text/select/date/number/boolean/file) | Yes | Partial; metadata supports diverse steps/forms but requires verification of coverage. |
| Validation rules (required, formats) | Yes | Partial via metadata schemas/Zod. |
| Conditional logic & visibility per role/department/job role | Should | Present for visibility filters; unclear for conditional logic beyond roles. |
| Draft vs Published workflow with rollback | Must | Partial; single isActive flag and client history but no server-side version control. |
| Preview modes (role-based, device preview) | Should | Partial inline preview only. |
| Audit logs & change tracking | Must | Present via audit tables. |
| Integration with onboarding workflows | Must | Present (steps feed renderer, reminders, assignments). |
| Autosave/collaboration indicators | Should | Missing. |

**Recommendations:** implement robust versioning/autosave before launch; add conditional logic UI, richer previews, and duplication/templating features post-go-live.

## 8. Testing, Observability & Operations
- **Testing:** Existing npm test suites + Cypress e2e for multi-tenant behaviour and duplicate label prevention. Need unit tests for metadata schema validation, optimistic locking, and publishing jobs once implemented.
- **Observability:** Telemetry tables (`OnboardingTemplateTelemetryEvent`) capture structured events but lack export. Add logging pipeline (e.g., ingestion to Datadog) with dashboards for publish errors, latency, and rate-limit hits.
- **Operations:** Document rollback strategy (e.g., revert to previous template version); add runbooks for stuck publishes or failed reminders. Instrument audit logs with correlation IDs for incident response.

**Minimum test suite for go-live:**
- Backend unit tests for permission checks, tenant scoping, schema validation.
- Integration tests for create/edit/publish with optimistic locking.
- E2E tests for drag/drop, pagination, visibility filters, and publish rollback.
- Load tests simulating 100+ steps and concurrent editors.

**Metrics/logs to capture:** save/publish latency, failure counts, concurrent editor conflicts, drag/drop performance, tenant-level throughput, audit log volume, and security events (403/429 rates).

## 9. Go-Live Readiness Assessment
**Verdict:** Ready only for controlled internal beta. Needs closure of critical security audit findings, implementation of server-side versioning/autosave, performance/load validation, and monitoring pipelines before exposure to external customers.

## 10. Itemised Go-Live Checklist
### Engineering / Backend
- [ ] (Must) Re-run security audit on designer APIs focusing on tenant filters and fix any findings.
- [ ] (Must) Implement optimistic locking + autosave drafts with version metadata.
- [ ] (Must) Extend data model for multi-version publish history with rollback endpoints.
- [ ] (Should) Offload heavy publish/diff jobs to background workers beyond Vercel limits.
- [ ] (Should) Add schema registry/migrations for metadata JSON.

### Frontend / UX
- [ ] (Must) Differentiate Save vs Publish with clear buttons, status badges, and inline conflict warnings.
- [ ] (Must) Provide undo/redo + collaborator indicators leveraging version history.
- [ ] (Should) Add onboarding tooltips/help center links and improved preview modes.
- [ ] (Should) Enhance drag/drop cues and add search/minimap for large templates.
- [ ] (Nice) Improve accessibility (focus states, ARIA, contrast) and responsive layouts.

### Testing
- [ ] (Must) Expand unit/integration coverage for new versioning, autosave, and visibility enforcement logic.
- [ ] (Must) Add e2e tests for concurrent edits, publish conflicts, and role-restricted previews.
- [ ] (Should) Conduct load/perf tests for 100+ step templates and multiple concurrent designers.
- [ ] (Should) Run cross-browser/manual UX heuristics review.

### Security & Compliance
- [ ] (Must) Close outstanding critical findings and obtain pen-test signoff.
- [ ] (Must) Validate audit logging completeness (user, IP, reason) for compliance.
- [ ] (Should) Review data residency/localisation requirements and document posture.

### Documentation & Support
- [ ] (Must) Create admin-facing user guide covering versioning, publish flow, and troubleshooting.
- [ ] (Should) Prepare internal runbooks for ops/support teams (rollback, stuck publishes, permission issues).
- [ ] (Nice) Document known limitations (no autosave yet, pagination quirks) and roadmap.

### Rollout & Risk Management
- [ ] (Must) Define phased rollout plan (internal beta → pilot tenants) with success metrics.
- [ ] (Must) Establish rollback plan (DB migrations + template version rollback scripts).
- [ ] (Should) Set monitoring/alert thresholds for publish errors, latency, and security anomalies.

## 11. Prioritised Roadmap (Post Go-Live)
1. **Pre-Go-Live Musts:** finish security remediation, implement versioning/autosave, add monitoring, conduct load testing, and polish UX for save/publish/conflict flows.
2. **Phase 2 (post initial launch):** conditional logic editor, richer preview modes (role-based/device), plugin framework for new step types, collaborative presence indicators, integration with workflow automation builder.
3. **Phase 3:** analytics dashboards for template usage, template marketplace/templating system, localization/multi-language support, AI-assisted form suggestions, and extensible API for third-party embeddable steps.
