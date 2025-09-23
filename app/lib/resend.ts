import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey
  ? new Resend(apiKey)
  : ({
      emails: {
        async send() {
          // Test fallback: avoid external calls
          return { id: "test-email", simulated: true } as any;
        },
      },
    } as unknown as Resend);

