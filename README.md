# Clean version - fixed large file issue

## Offboarding Exit Interview

This update introduces a basic exit interview workflow for employee offboarding. After initiating an offboarding you can optionally schedule an interview and assign an interviewer.

### Environment
- No new environment variables are required.

### Testing locally
1. Run Prisma migrations: `npx prisma migrate dev`.
2. Start the dev server: `npm run dev`.
3. Execute tests: `npm test`.

## Offboarding Form Actions

- **Remove access immediately** – revokes the employee's system access as soon as offboarding starts and creates an IT task for follow-up.
- **Handover required** – generates a knowledge-transfer task. The selected colleague is assigned responsibility and notified when the process begins.
- **Schedule exit interview** – opens fields for interview date and interviewer; submitting saves these details to the offboarding record and notifies the interviewer.
- **Assets to return** – tick any items the leaver must return. Each item is tracked as a task during offboarding.
- **Start Offboarding Process** – submits the form, creates the offboarding record, and seeds default tasks (including any above selections).
- **Cancel** – closes the modal without saving.

