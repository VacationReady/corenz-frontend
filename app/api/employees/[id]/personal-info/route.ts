import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason, serialize } from "@/lib/audit-helpers";
import { getTransactionalRecipients } from "@/lib/transactional-notifications";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { User: true },
    });
    if (!employee || employee.User.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const { reasons, section: _section, ...updateFields } = body;
    const allowed = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "addressStreet",
      "addressCity",
      "addressPostcode",
      "addressCountry",
      "pronouns",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateFields, key)) {
        if (key === "email" && typeof updateFields[key] === "string") {
          updates[key] = updateFields[key].trim();
        } else {
          updates[key] = updateFields[key as string];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const before = employee.User;
    const oldEmail = before.email ?? null;
    let pendingEmailNotification: {
      newEmail: string;
      oldEmail: string | null;
      employeeName: string;
    } | null = null;

    // Compute diffs before update
    const diffs = computeDiffs(before, { ...before, ...updates }, allowed);

    const emailUpdateValue = typeof updates.email === "string" ? updates.email : undefined;
    if (typeof emailUpdateValue === "string" && emailUpdateValue.trim() === "") {
      return NextResponse.json(
        { error: "Email cannot be left empty." },
        { status: 400 },
      );
    }

    if (emailUpdateValue) {
      const normalizedEmail = emailUpdateValue.trim();
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { email: { equals: normalizedEmail, mode: "insensitive" } as any },
            { id: { not: before.id } },
          ],
        },
        select: { id: true, companyId: true },
      });

      if (existingUser) {
        const sameCompany = existingUser.companyId === session.user.companyId;
        return NextResponse.json(
          {
            error: sameCompany
              ? "Another user in your company already uses this email address."
              : "This email is already registered with another PeopleCore account. Please use a different email.",
          },
          { status: 400 },
        );
      }

      if (normalizedEmail !== emailUpdateValue) {
        updates.email = normalizedEmail;
      }

      if (normalizedEmail !== (oldEmail ?? "")) {
        const employeeName = `${before.firstName ?? ""} ${before.lastName ?? ""}`.trim() || normalizedEmail;
        pendingEmailNotification = {
          newEmail: normalizedEmail,
          oldEmail,
          employeeName,
        };
      }
    }

    // Check if reasons are required and provided
    if (diffs.length > 0) {
      const requiresReasons = diffs.some(diffRequiresReason);
      if (requiresReasons && !reasons) {
        return NextResponse.json(
          { error: "Reasons required for changes" },
          { status: 400 }
        );
      }

      if (isAdmin) {
        try {
          await createAuditLogs({
            companyId: session.user.companyId!,
            employeeId: employee.id,
            section: "personal-info",
            diffs,
            reasons: (reasons as Record<string, string>) || {},
            changedById: session.user.id,
          });
        } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else {
        const recipients = await getTransactionalRecipients({
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "personal-info",
          changedById: session.user.id,
        });
        const approverIds = recipients.map((r) => r.id);
        await (prisma as any).transactionalChangeRequest.create({
          data: {
            companyId: session.user.companyId!,
            employeeId: employee.id,
            section: "personal-info",
            action: "UPDATE",
            targetId: before.id,
            payload: updates,
            oldValues: allowed.reduce((acc: any, k) => { acc[k] = (before as any)[k]; return acc; }, {}),
            diffs,
            reasons: (reasons as Record<string, string>) || {},
            requesterId: session.user.id,
            approverIds,
          },
        });

        const toEmails = recipients.map((r) => r.email).filter(Boolean) as string[];
        if (toEmails.length) {
          const baseUrl = getAppBaseUrl();
          const employeeName = `${before.firstName ?? ""} ${before.lastName ?? ""}`.trim() || before.email;
          const { html, text } = renderPeopleCoreEmail({
            preheader: "Approval needed: Personal Information",
            title: "Approval requested: Personal Information",
            ctas: { label: "Open Action Items", href: `${baseUrl}/dashboard` },
            sections: [
              {
                title: "Summary",
                description: [
                  `Employee Name: ${employeeName}`,
                  `Fields changed: ${diffs.length}`,
                ],
              },
            ],
            outro: ["PeopleCore HRIS System"],
          });
          await resend.emails.send({ from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz", to: toEmails, subject: "Approval needed: Personal Information", html, text });
        }
      }
    }

    let updated: any = null;
    if (isAdmin) {
      updated = await prisma.user.update({
        where: { id: before.id },
        data: updates,
      });

      if (pendingEmailNotification) {
        try {
          const appBaseUrl = getAppBaseUrl();
          const { newEmail, oldEmail: previousEmail, employeeName } = pendingEmailNotification;
          const previousDisplay = previousEmail ?? "Not previously set";
          const { html, text } = renderPeopleCoreEmail({
            preheader: `Your PeopleCore login email is now ${newEmail}.`,
            title: "Your PeopleCore login email has changed",
            intro: [
              `Hi ${employeeName},`,
              "An administrator has updated the email address associated with your PeopleCore account.",
            ],
            sections: [
              {
                title: "Updated details",
                description: [
                  `Previous email: ${previousDisplay}`,
                  `New email: ${newEmail}`,
                ],
              },
              {
                title: "What to do next",
                description: [
                  `Use ${newEmail} the next time you sign in to PeopleCore.`,
                  "If you did not expect this change, please contact your HR administrator immediately.",
                ],
              },
            ],
            ctas: {
              label: "Sign in to PeopleCore",
              href: `${appBaseUrl}/login`,
            },
            outro: [
              "This is an automated notification from PeopleCore HRIS.",
            ],
          });

          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz",
            to: newEmail,
            subject: "Your PeopleCore login email has been updated",
            html,
            text,
          });
        } catch (emailError) {
          console.error("Failed to send email change notification:", emailError);
        }
      }
    }

    if (isAdmin) {
      return NextResponse.json({ ok: true, user: updated });
    } else {
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (e: any) {
    console.error("[personal-info-update]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
