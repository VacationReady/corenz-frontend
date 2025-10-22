import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey
  ? new Resend(apiKey)
  : ({
      emails: {
        async send() {
          // Test fallback: avoid external calls
          return {
            data: { id: "test-email", simulated: true },
            error: null,
          } as any;
        },
      },
    } as unknown as Resend);

const DEFAULT_PEOPLECORE_FROM = "PeopleCore <noreply@peoplecore.co.nz>";

const configuredFromEmail = process.env.RESEND_FROM_EMAIL?.trim();

export const PEOPLECORE_FROM_EMAIL = configuredFromEmail
  ? configuredFromEmail.includes("<")
    ? configuredFromEmail
    : `PeopleCore <${configuredFromEmail}>`
  : DEFAULT_PEOPLECORE_FROM;

