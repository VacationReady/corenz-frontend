import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes, randomUUID } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { auditLog } from "@/lib/audit";

const sendSelectedRequestSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1, "At least one employee must be selected"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const { employeeIds } = sendSelectedRequestSchema.parse(rawBody);

    // Get the selected employees with their details
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId: session.user.companyId,
        isActive: true,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActivated: true,
          },
        },
        Department: { select: { name: true } },
        JobRole: { select: { name: true } },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No valid employees found for the selected IDs" },
        { status: 404 }
      );
    }

    const summary = {
      targeted: employees.length,
      sent: 0,
      skipped: 0,
      errors: [] as Array<{ employeeId: string; email: string; reason: string }>,
    };

    const baseUrl = getAppBaseUrl();

    for (const employee of employees) {
      const user = employee.User;

      if (!user || !user.email) {
        summary.skipped++;
        summary.errors.push({
          employeeId: employee.id,
          email: user?.email ?? "unknown",
          reason: "Missing employee email address",
        });
        continue;
      }

      try {
        const employeeName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        const activationToken = randomBytes(32).toString("hex");

        // Create or update activation token (consistent with existing activation flow)
        await prisma.activationToken.upsert({
          where: { userId: user.id },
          update: { token: activationToken },
          create: {
            id: randomUUID(),
            userId: user.id,
            token: activationToken,
          },
        });

        const redirectPath = employee.onboardingTemplateId
          ? `/${employee.id}/onboarding`
          : `/dashboard`;

        const activationLink = `${baseUrl}/activate?token=${activationToken}&companyId=${encodeURIComponent(
          session.user.companyId,
        )}&redirect=${encodeURIComponent(redirectPath)}`;

        const { html, text } = renderPeopleCoreEmail({
          preheader: "Activate your PeopleCore account",
          title: "You're invited to PeopleCore",
          intro: [
            `Hi ${employeeName},`,
            "Let's get you set up so you can start using PeopleCore right away.",
          ],
          sections: [
            {
              title: "Your next step",
              description: [
                "Use the button below to set your password and activate your account.",
                ...(employee.Department?.name ? [`Department: ${employee.Department.name}`] : []),
                ...(employee.JobRole?.name ? [`Role: ${employee.JobRole.name}`] : []),
              ],
            },
          ],
          ctas: {
            label: "Activate your PeopleCore account",
            href: activationLink,
          },
          outro: [
            "If you need any help, contact your manager or HR team.",
            "We're excited to have you on board!",
          ],
        });

        await resend.emails.send({
          from: "PeopleCore <noreply@peoplecore.com>",
          to: [user.email],
          subject: "Activate your PeopleCore account",
          html,
          text,
        });

        // Track that welcome email was sent
        await prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSentAt: new Date() },
        });

        summary.sent++;
      } catch (error) {
        console.error(`Failed to send welcome email to ${user.email}:`, error);
        summary.errors.push({
          employeeId: employee.id,
          email: user.email,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await auditLog({
      entityType: "CSV_IMPORT",
      entityId: `selected_welcome_batch_${Date.now()}`,
      action: "NOTIFIED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      metadata: {
        importType: "EMPLOYEE_WELCOME_SELECTED",
        selectedEmployeeIds: employeeIds,
        targeted: summary.targeted,
        sent: summary.sent,
        skipped: summary.skipped,
        errors: summary.errors,
      },
    });

    return NextResponse.json({
      message: "Welcome emails processed",
      summary,
    });
  } catch (error) {
    console.error("Failed to send welcome emails to selected employees:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
