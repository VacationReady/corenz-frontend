import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { randomBytes, randomUUID } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { auditLog } from "@/lib/audit";

const welcomeRequestSchema = z.object({
  rolloutType: z.enum(["all", "gradual"]),
  filters: z
    .object({
      departmentIds: z.array(z.string().min(1)).optional(),
      locationIds: z.array(z.string().min(1)).optional(),
      nameQuery: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const { rolloutType, filters } = welcomeRequestSchema.parse(rawBody);

    const trimmedQuery = filters?.nameQuery?.trim() ?? "";
    const nameTokens = trimmedQuery
      ? trimmedQuery
          .split(/[\n,]/)
          .map(token => token.trim())
          .filter(Boolean)
      : [];

    if (
      rolloutType === "gradual" &&
      (!filters ||
        ((filters.departmentIds?.length ?? 0) === 0 &&
          (filters.locationIds?.length ?? 0) === 0 &&
          nameTokens.length === 0))
    ) {
      return NextResponse.json(
        { error: "Select at least one filter when using gradual rollout." },
        { status: 400 },
      );
    }

    const userFilter: Prisma.UserWhereInput = {
      companyId: session.user.companyId,
      isActivated: false,
    };

    if (nameTokens.length) {
      userFilter.AND = nameTokens.map(token => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" } },
          { lastName: { contains: token, mode: "insensitive" } },
          { email: { contains: token, mode: "insensitive" } },
        ],
      }));
    }

    const whereClauses: Prisma.EmployeeWhereInput[] = [
      { companyId: session.user.companyId },
      { isActive: true },
      { User: { is: userFilter } },
    ];

    if (filters?.departmentIds?.length) {
      whereClauses.push({ departmentId: { in: filters.departmentIds } });
    }

    let locationNames: string[] = [];
    if (filters?.locationIds?.length) {
      const locations = await prisma.location.findMany({
        where: { id: { in: filters.locationIds } },
        select: { name: true },
      });

      locationNames = locations
        .map(location => location.name)
        .filter((name): name is string => Boolean(name));

      whereClauses.push({
        OR: [
          { locationId: { in: filters.locationIds } },
          ...(locationNames.length ? [{ siteLocation: { in: locationNames } }] : []),
        ],
      });
    }

    const employees = await prisma.employee.findMany({
      where: { AND: whereClauses },
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

    const summary = {
      targeted: employees.length,
      sent: 0,
      skipped: 0,
      errors: [] as Array<{ employeeId: string; email: string; reason: string }>,
    };

    if (employees.length === 0) {
      return NextResponse.json({
        message: "No eligible employees found",
        summary,
      });
    }

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

      if (user.isActivated) {
        summary.skipped++;
        continue;
      }

      try {
        const employeeName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        const activationToken = randomBytes(32).toString("hex");

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
      entityId: `welcome_batch_${Date.now()}`,
      action: "NOTIFIED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      metadata: {
        importType: "EMPLOYEE_WELCOME",
        rolloutType,
        filters: {
          departmentIds: filters?.departmentIds ?? [],
          locationIds: filters?.locationIds ?? [],
          locationNames,
          nameTokens,
        },
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
    console.error("Failed to send welcome emails:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
