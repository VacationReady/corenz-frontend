import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";

const payloadSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  subject: z.string().trim().min(3),
  previewText: z.string().trim().optional(),
  body: z.string().trim().min(5),
  ctaLabel: z.string().trim().optional(),
  ctaUrl: z.string().url().optional(),
  sendTestTo: z.string().email().optional(),
  reason: z.string().trim().min(3),
});

export async function POST(request: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = payloadSchema.parse(await request.json());
    const {
      employeeIds,
      subject,
      previewText,
      body: messageBody,
      ctaLabel,
      ctaUrl,
      sendTestTo,
      reason,
    } = body;

    const senderFirstName = (session.user as any)?.firstName ?? "";
    const senderLastName = (session.user as any)?.lastName ?? "";

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: session.user.companyId },
      select: {
        id: true,
        User: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const foundIds = new Set(employees.map((employee) => employee.id));
    const failures: Array<{ employeeId: string; error: string }> = [];

    for (const targetId of employeeIds) {
      if (!foundIds.has(targetId)) {
        failures.push({ employeeId: targetId, error: "Employee not found" });
      }
    }

    const paragraphs = messageBody
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter((block) => block.length > 0);

    const outro = [
      "If you have any questions, please contact the People team.",
      `${senderFirstName} ${senderLastName}`.trim() || "HR team",
    ];

    if (sendTestTo) {
      const baseEmail = renderPeopleCoreEmail({
        preheader: previewText || subject,
        title: subject,
        intro: ["Hi there,", previewText || "We wanted to share an update with you."],
        sections: paragraphs.length
          ? [
              {
                description: paragraphs,
              },
            ]
          : undefined,
        ctas: ctaLabel && ctaUrl ? { label: ctaLabel, href: ctaUrl } : undefined,
        outro,
      });

      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz",
          to: sendTestTo,
          subject,
          html: baseEmail.html,
          text: baseEmail.text,
        });
      } catch (error: any) {
        console.error("[bulk-actions/messaging:test]", error);
        return NextResponse.json(
          { error: "Failed to send test email" },
          { status: 400 },
        );
      }
    }

    const fromAddress = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";
    const baseUrl = getAppBaseUrl();

    const seenEmails = new Set<string>();

    for (const employee of employees) {
      try {
        const email = employee.User?.email;
        if (!email) {
          failures.push({
            employeeId: employee.id,
            error: "Employee does not have an email address",
          });
          continue;
        }

        const normalizedEmail = email.toLowerCase();

        const name = `${employee.User?.firstName ?? ""} ${employee.User?.lastName ?? ""}`
          .trim()
          .replace(/\s+/g, " ");

        const greeting = name ? `Hi ${name},` : "Hi there,";

        const { html, text } = renderPeopleCoreEmail({
          preheader: previewText || subject,
          title: subject,
          intro: [greeting, previewText || "We wanted to share an update with you."],
          sections: paragraphs.length
            ? [
                {
                  description: paragraphs,
                },
              ]
            : undefined,
          ctas:
            ctaLabel && ctaUrl
              ? { label: ctaLabel, href: ctaUrl.startsWith("http") ? ctaUrl : `${baseUrl}${ctaUrl}` }
              : undefined,
          outro,
        });

        if (!seenEmails.has(normalizedEmail)) {
          await resend.emails.send({
            from: fromAddress,
            to: email,
            subject,
            html,
            text,
          });
          seenEmails.add(normalizedEmail);
        }

        const diffs = formatDiffsForFormData({
          subject,
          previewText: previewText ?? null,
          body: messageBody,
          ctaLabel: ctaLabel ?? null,
          ctaUrl: ctaUrl ?? null,
        });

        const reasons = diffs.reduce<Record<string, string>>((acc, diff) => {
          acc[diff.field] = reason;
          return acc;
        }, {});

        await createAuditLogs({
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "communication",
          diffs,
          reasons,
          changedById: session.user.id,
        });
      } catch (error: any) {
        console.error("[bulk-actions/messaging]", error);
        failures.push({
          employeeId: employee.id,
          error: error?.message || "Failed to send message",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: employeeIds.length,
      failures,
    });
  } catch (error: any) {
    console.error("[bulk-actions/messaging]", error);
    return NextResponse.json(
      { error: error?.message || "Unable to process bulk messaging action" },
      { status: 400 },
    );
  }
}
