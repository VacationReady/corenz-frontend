# Screen Designer Remediation & Enhancement Prompts

The following copy-ready prompts are designed for sequential use with an AI agent. Execute them in order so each step builds on the artifacts created earlier and no work regresses prior improvements. Every prompt assumes the repository root is `/workspace/corenz-frontend` and leverages the context from `SCREEN_DESIGNER_PRODUCTION_AUDIT.md` (production readiness audit for the Screen Designer built with Next.js 15/React 19, Prisma/Postgres, Tailwind, NextAuth, TipTap, @dnd-kit, react-hook-form, and Zod).

## 1. Security Regression Sweep & Tenant Guardrails
```
You are a senior security engineer working in /workspace/corenz-frontend.
Goal: Close the outstanding critical risk that designer APIs might repeat the cross-tenant vulnerabilities previously discovered in timesheet routes.
Steps:
1. Re-read SCREEN_DESIGNER_PRODUCTION_AUDIT.md sections 3 and 10 for security expectations.
2. Audit every onboarding/template-related API route handler (app/api/**/route.ts) plus server actions to confirm they always scope queries by session.user.companyId, validate permissions via hasPermission(user, "onboarding", action), and never expose template IDs across tenants.
3. Add automated regression coverage: integration or e2e tests under tests/e2e/ that attempt to fetch/mutate templates outside the current tenant and expect 403/404.
4. Document fixes and test strategy in SECURITY_AUDIT_SUMMARY.md.
Requirements: No new lint/type errors. Tests you add must run via `npm test` or `npx cypress run --component`. Provide a summary of code changes and tests in the PR body.
```

## 2. Server-Side Versioning, Autosave, and Optimistic Locking
```
Role: Staff full-stack engineer.
Goal: Implement robust collaborative editing safeguards called out in sections 1, 3, 5, and 10 of the audit.
Deliverables:
1. Extend Prisma schema: add version/updatedAt/updatedBy columns to OnboardingTemplate and OnboardingStep, plus a TemplateVersion (or similar) history table with draft/published states.
2. Update route handlers and React hooks (useTenantMetadataVersioning, handleSave/Publish) to include row-version checks. Reject stale writes and surface clear client error toasts.
3. Add incremental autosave drafts per step (debounced) that write to the new version table without affecting published data. Ensure explicit Publish still controls isActive/publishedAt/publishedBy.
4. Provide undo/redo history in the client by leveraging stored versions.
5. Cover new logic with unit/integration tests.
Constraints: Maintain compatibility with Next.js 15 App Router and Prisma migrate workflow. Include migration, updated types, and docs (e.g., README or SCREEN_DESIGNER_PRODUCTION_AUDIT addendum) describing the versioning model.
```

## 3. Background Publishing Pipeline for Long-Running Jobs
```
Role: Backend platform engineer.
Objective: Mitigate Vercel 30-second limits (audit sections 0, 1, 4, 10) by offloading heavy publish/diff work.
Tasks:
1. Introduce a queue/worker pattern (e.g., use existing cron/job infrastructure or create a lightweight BullMQ/Cloud Tasks worker) that runs outside the serverless request path.
2. Refactor publish APIs to enqueue jobs with metadata (tenant, templateId, versionId) and immediately return a job token.
3. Add polling endpoint or SSE channel so the client can display publish progress/toasts.
4. Ensure jobs log telemetry to OnboardingTemplateTelemetryEvent with eventType severity for observability.
5. Update documentation/runbooks describing how to operate the new queue.
Validation: Provide integration tests or mocked unit tests for job enqueue/processing logic. Ensure no route exceeds Vercel execution caps.
```

## 4. Metadata Schema Registry & Migration Strategy
```
Act as a senior DX engineer.
Aim: Address JSON metadata brittleness (audit section 1 Major + section 5).
Plan:
1. Create a centralized schema registry in lib/onboarding/metadataRegistry.ts exporting Zod schemas for each step type plus a version identifier.
2. Write migration utilities that transform persisted metadata from version N to N+1, storing the schema version inside each OnboardingStep metadata JSON.
3. Update both editor and renderer pipelines to validate against the registry and auto-migrate when loading older steps.
4. Add unit tests covering schema validation and migration edge cases.
5. Document registry usage in ONBOARDING_METADATA_DEVELOPER_GUIDE.md.
Outcome: Future schema changes can be rolled out safely with explicit migrations.
```

## 5. UX: Distinct Save/Publish Flows, Status Bar, and Collaboration Cues
```
Role: Lead product designer + front-end engineer.
Goal: Resolve high-impact UX issues (audit sections 6 and 10 Frontend).
Implementation outline:
1. Redesign the Step Editor toolbar to include separate Primary "Publish" button, Secondary "Save draft" button, and a persistent status bar showing last saved time, draft/published state, and conflict warnings.
2. Surface collaborator presence (read from versioning/autosave data created in Prompt 2) via avatars/initials and show inline conflict badges on steps edited elsewhere.
3. Add inline toasts/tooltips explaining autosave vs manual publish.
4. Ensure accessibility: focus order, ARIA labels, color contrast WCAG AA.
5. Update Cypress e2e tests to reflect new UI controls.
Deliverables: Updated components (likely in app/(dashboard)/onboarding/templates/*) and Tailwind styles, plus UX documentation/screenshots in SCREEN_DESIGNER_PRODUCTION_AUDIT.md or a new UX guide.
```

## 6. Drag-and-Drop Scalability & Navigation Enhancements
```
You are optimizing the canvas interaction model per audit section 4 and 6.
Tasks:
1. Introduce virtualized rendering for the Step canvas (e.g., react-virtual or similar) so 100+ steps keep 60fps drag performance.
2. Add search/filter and a mini-map/outline panel to jump between steps; ensure keyboard navigation is possible (arrow keys to move focus, Enter to edit).
3. Improve @dnd-kit drag cues: placeholders, snap lines, ghost previews for multi-step selection, and keyboard-accessible reordering.
4. Update pagination defaults to show user-selected page size with persisted preference.
5. Extend e2e tests to cover new navigation controls.
Constraints: Avoid regressions for existing 25-step default behavior.
```

## 7. Accessibility Hardening & Preview Improvements
```
Role: Accessibility specialist.
Deliverables:
1. Audit palette, canvas, and metadata forms for keyboard/focus/ARIA compliance. Add necessary aria-label/aria-describedby attributes and ensure all controls are reachable via keyboard.
2. Improve color contrast tokens in Tailwind theme and verify TipTap editor toolbar states.
3. Implement enhanced Preview panel: allow switching between desktop/tablet/mobile widths and impersonate different roles/departments/job roles to verify visibility rules.
4. Add automated accessibility checks (e.g., axe-core) to Cypress tests.
5. Document testing procedure in a new ACCESSIBILITY_TESTING_GUIDE.md.
```

## 8. Data Integrity Validations & Uniqueness Enforcement
```
Mission: Enforce server-side validations mentioned in audit section 5.
Scope:
1. Add Prisma-level constraints or application logic ensuring template names are unique per tenant and step labels remain unique within a template (server-side, not only via Cypress tests).
2. Persist lastEditedBy/lastEditedAt on templates and steps using session context.
3. Create validation helpers shared between API routes and react-hook-form to avoid duplication.
4. Backfill existing records via migration scripts where necessary.
5. Write unit/integration tests covering duplicate prevention and metadata validation failures.
```

## 9. Observability Pipeline & Runbooks
```
Act as an SRE.
Goal: Turn telemetry tables into actionable monitoring (audit sections 0, 4, 8, 10).
Work:
1. Instrument publish/save/autosave APIs to emit structured logs (JSON) with requestId, tenant, templateId, latency, and outcome. Ship them to the existing logging stack (or describe minimal implementation using e.g., OpenTelemetry exporter or a third-party service).
2. Create dashboards/alerts definitions (Markdown in OBSERVABILITY_PLAN.md) that watch error rates, latency percentiles, queue backlog, and 403/429 spikes.
3. Ensure OnboardingTemplateTelemetryEvent entries include correlation IDs tying back to logs.
4. Provide runbooks for common incidents (stuck publish job, repeated conflicts, audit failure) in RUNBOOK_ONBOARDING_TEMPLATE.md.
5. Add unit tests for any new telemetry helper utilities.
```

## 10. Testing Coverage Expansion & Load Testing
```
Role: QA lead.
Objective: Implement the minimum go-live suite (audit section 8).
Instructions:
1. Review existing npm and Cypress suites; identify gaps for optimistic locking, autosave drafts, background publish jobs, and accessibility previews.
2. Add Jest/tsx unit tests for permission helpers, schema registry, and undo/redo reducers.
3. Expand Cypress e2e specs to cover: create screen → autosave drafts → collaborative conflict → publish via background job → verify renderer consumption.
4. Introduce load/perf tests (e.g., using k6 or Playwright) simulating 100+ steps and concurrent editors; document scripts under tests/load/.
5. Update README or TESTING_GUIDE_PERFORMANCE.md with instructions to run the new suites locally and in CI.
```

## 11. Documentation, Rollout Plan, and Post-Go-Live Roadmap
```
Final prompt for the documentation/enablement lead.
Goals:
1. Compile admin-facing user guides explaining the new versioning model, autosave behavior, publishing queue, previews, and troubleshooting tips. Update or create docs such as HR_ADMIN_QUICK_START_GUIDE.md and SCREEN_DESIGNER_PRODUCTION_AUDIT.md appendices.
2. Draft support runbooks referencing new observability dashboards.
3. Define rollout stages (internal beta → pilot → GA) with success metrics and rollback procedures in DEPLOYMENT_CHECKLIST.md.
4. Capture post-go-live roadmap items from audit section 11, ensuring anything deferred is clearly tagged Must/Should/Nice in ACTION_ITEMS_IMPLEMENTATION_SUMMARY.md.
5. Verify that documentation references artifacts produced in Prompts 1–10 so future agents understand dependencies.
Outcome: Stakeholders can operate and extend the Screen Designer confidently once technical changes land.
```
