// pages/api/set-password.ts

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail } from "@/lib/email/template";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, password, companyId } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Missing token or password" });
  }

  try {
    // Server-side password policy enforcement
    const hasMinLength = typeof password === "string" && password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        error:
          "Password must be at least 6 characters and include an uppercase letter, a number, and a special character.",
      });
    }

    // 1. Validate token
    const storedToken = await prisma.activationToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // 2. Get user by token.userId
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 3. Enforce tenant match if provided (defense-in-depth)
    if (companyId && user.companyId !== companyId) {
      return res.status(400).json({ error: "Activation link is not for this tenant" });
    }

    // 4. Get employee linked to user
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // 5. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Update user password and mark employee as active + activated
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActivated: true,
        updatedAt: new Date(),
      },
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        isActive: true, // ✅ VALID FIELD
      },
    });

    // 7. Delete the token after use
    await prisma.activationToken.delete({
      where: { token },
    });

    // 8. Notify admin that the user has activated/logged in
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN", companyId: user.companyId || undefined },
        select: { email: true },
      });
      const recipients = adminUsers
        .map((u) => u.email)
        .filter(Boolean) as string[];
      if (recipients.length) {
        const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
        const { html, text } = renderPeopleCoreEmail({
          preheader: `${actorName} activated their account`,
          title: "Account Activation Notice",
          intro: [
            `Hello,`,
            `${actorName} (${user.email}) has activated their PeopleCore account.`,
          ],
          outro: [
            "You are receiving this notification because you are listed as an administrator.",
          ],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: recipients,
          subject: "User activated their account",
          html,
          text,
        });
      }
    } catch (e) {
      console.warn("Failed to send admin activation email:", e);
    }

    return res.status(200).json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Error in set-password:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
