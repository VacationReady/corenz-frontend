# Clean version - fixed large file issue

## Offboarding Exit Interview

This update introduces a basic exit interview workflow for employee offboarding. After initiating an offboarding you can optionally schedule an interview and assign an interviewer.

## Password reset flow

- End users can select **Forgot password?** from `/login` which opens `/forgot-password`.
- The form posts to `POST /api/auth/password-reset`, which rate limits requests (defaults: 3 attempts per 15 minutes per email/IP pair – override with `PASSWORD_RESET_LIMIT` and `PASSWORD_RESET_WINDOW_MS`).
- When an account is found, a new token is written to the existing `ActivationToken` table and an email is sent via Resend using the standard `FROM_EMAIL` identity.
- Reset links point to `/activate?token=…` which reuses the current password set flow; tokens are single-use because they are replaced on every request.
- Operations can pre-seed tokens during onboarding by inserting into `ActivationToken` with a generated UUID `id`, a random 64-character hex `token`, the `userId`, and `createdAt` timestamp. Example SQL:

```sql
insert into "ActivationToken" ("id", "token", "userId", "createdAt")
values (
  gen_random_uuid(),
  encode(gen_random_bytes(32), 'hex'),
  'USER_UUID_HERE',
  now()
)
on conflict ("userId")
do update set "token" = excluded."token", "createdAt" = now();
```

- Provide the resulting `token` to the employee (or let the API send the email) so they can complete `/activate?token=…` and choose a password.

### Environment

- Set `RESEND_API_KEY` with your Resend API key to use the email testing script:

```bash
export RESEND_API_KEY=your_api_key
```

### Testing locally

1. Run Prisma migrations: `npx prisma migrate dev`.
2. Start the dev server: `npm run dev`.
3. Execute tests: `npm test`.

## Holiday year configuration for HR admins

- When adding a new employee, Step 2 of the wizard now asks for the **start month and day** of your company's holiday year. Use the month dropdown and day field to match the real-world policy.
- The system automatically calculates the end of the period as the day before the next anniversary, so ranges like *1 April – 31 March* or *6 January – 5 January* are supported without additional setup.
- Ensure the day you enter exists in the selected month (February supports up to the 29th). The UI flags invalid combinations so you can correct them before saving the employee.

## Offboarding Form Actions

- **Remove access immediately** – revokes the employee's system access as soon as offboarding starts and creates an IT task for follow-up.
- **Handover required** – generates a knowledge-transfer task. The selected colleague is assigned responsibility and notified when the process begins.
- **Schedule exit interview** – opens fields for interview date and interviewer; submitting saves these details to the offboarding record and notifies the interviewer.
- **Assets to return** – tick any items the leaver must return. Each item is tracked as a task during offboarding.
- **Start Offboarding Process** – submits the form, creates the offboarding record, and seeds default tasks (including any above selections).
- **Cancel** – closes the modal without saving.

## Rate limiting

To keep APIs responsive in a multi-tenant environment:

- Set `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` in your environment.
- To share limits across Vercel instances, add `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or Upstash equivalents).
- Send an `x-company-id` header with each request so limits are tracked per tenant.
- Restart the server after changing these variables.

