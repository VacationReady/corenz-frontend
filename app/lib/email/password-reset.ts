interface PasswordResetEmailOptions {
  recipientName?: string | null;
  companyName?: string | null;
  resetUrl: string;
  supportEmail?: string | null;
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@peoplecore.co.nz";

export function buildPasswordResetEmail({
  recipientName,
  companyName,
  resetUrl,
  supportEmail = SUPPORT_EMAIL,
}: PasswordResetEmailOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = recipientName?.trim() || "there";
  const tenantName = companyName?.trim();
  const subject = tenantName
    ? `${tenantName} | Reset your PeopleCore password`
    : "Reset your PeopleCore password";

  const introLine = tenantName
    ? `${tenantName} uses PeopleCore to manage access. Use the button below to choose a new password.`
    : "Use the button below to choose a new password.";

  const html = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f7fb;padding:32px 0;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f2933;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(15, 23, 42, 0.1);">
            <tr>
              <td style="padding:32px 40px 24px;border-bottom:1px solid #e5e9f2;background-color:#111827;">
                <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;">PeopleCore</h1>
                ${tenantName ? `<p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${tenantName}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;">
                <p style="margin:0 0 16px;font-size:16px;">Hi ${safeName},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${introLine}</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:8px;background:#111827;">
                      <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px;">Choose a new password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:32px 0 0;font-size:14px;line-height:1.6;color:#52616b;">This link will expire after it is used once. If you didn't request this, you can safely ignore this email and your password will stay the same.</p>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#52616b;">Need help? Contact us at <a href="mailto:${supportEmail}" style="color:#111827;text-decoration:underline;">${supportEmail}</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e9f2;text-align:center;font-size:12px;color:#94a3b8;">
                <p style="margin:0;">© ${new Date().getFullYear()} PeopleCore. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = [`Hi ${safeName},`, "", introLine, "", `Reset password: ${resetUrl}`, "", "This link can be used once. Ignore this email if you didn't request the reset.", "", `Need help? Email ${supportEmail}.`].join("\n");

  return { subject, html, text };
}

