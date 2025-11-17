# Screen Designer Audit Request – Response Review

## Context
- **Source conversation:** HRIS product owner asked for an exhaustive readiness audit of a Screen Designer feature, with explicit instructions to first restate understanding of purpose, users, flows, and tech stack, then pose targeted follow-up questions covering architecture, security, data, UX, and operational concerns.
- **Assistant response under review:** Provided a brief reflection on the feature’s intent and assumed stack, followed by a list of clarification questions spanning architecture, auth, data model, multi-tenancy, integration, UX behaviour, constraints, security, testing, and known issues.

## Evaluation
### Reflection of understanding
- ✅ Correctly restated that the Screen Designer targets HR/People Ops admins configuring custom HRIS forms and highlighted primary flows (create, add fields, arrange, preview, publish).
- ⚠️ Leaned heavily on assumptions (e.g., “likely React/Next.js, Node/Prisma/Postgres”) without signalling uncertainty or asking the user to confirm the stack, which could lead to confirmation bias if the implementation differs.

### Follow-up questions
- ✅ Covered most critical domains the user explicitly listed (auth, data model, multi-tenancy, integrations, UX, scale, security, testing, known issues).
- ⚠️ Missed a few high-impact discovery areas requested in the original instructions, such as:
  - Concurrency/version-collision handling (multiple designers editing simultaneously, autosave behaviour).
  - Draft vs published lifecycle specifics (the question touched on versioning broadly but did not probe for rollback, approval chains, or audit requirements the user emphasized).
  - Compliance/regionalisation expectations (data residency, localisation, accessibility standards) tied to HRIS deployments.
  - Operational readiness topics like release management, migration paths from legacy forms, and dependency on other modules.

### Tone & structure
- ✅ Response structure mirrors the user’s “first reflect, then ask questions” directive, making it easy for the requester to validate assumptions.
- ⚠️ Could benefit from explicit acknowledgement that an audit report will follow once clarifications are provided, reinforcing alignment with the multi-step process the user set.

## Recommendations
1. **Qualify assumptions:** When restating understanding, flag any inferred technologies or flows and explicitly ask the user to confirm or correct them.
2. **Extend discovery scope:** Add targeted questions about collaborative editing, version control/publishing workflows, compliance obligations, localisation, and dependency on downstream HR processes.
3. **Set expectations:** Close with a short note outlining the next step (e.g., “Once I have these answers, I’ll produce the full audit with the requested structure”), so the user knows what happens after supplying details.
