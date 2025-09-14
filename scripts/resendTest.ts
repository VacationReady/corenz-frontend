import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

const resend = new Resend(apiKey);

async function testSend() {
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "michael.dowdle@hotmail.com",
      subject: "✅ Resend Test Email",
      html: "<strong>This is a Resend test email.</strong>",
    });

    console.log("✅ Resend API Success:", result);
  } catch (err) {
    console.error("❌ Resend API Error:", err);
  }
}

testSend();
