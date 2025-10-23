import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { PEOPLECORE_FROM_EMAIL, resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { auditLog } from "@/lib/audit";

const activationRequestSchema = z.object({
  employeeIds: z.array(z.string()).min(1, "At least one employee ID is required"),
  sendEmails: z.boolean().default(true),
  checkPermissions: z.boolean().default(true),
  promoteManagers: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = activationRequestSchema.parse(body);

    const results = {
      total: validatedData.employeeIds.length,
      activated: 0,
      emailsSent: 0,
      permissionsChecked: 0,
      managersPromoted: 0,
      errors: [] as Array<{ employeeId: string; error: string }>,
      details: [] as Array<{
        employeeId: string;
        name: string;
        email: string;
        status: string;
        actions: string[];
      }>,
    };

    // Process each employee
    for (const employeeId of validatedData.employeeIds) {
      try {
        const employee = await prisma.employee.findFirst({
          where: {
            id: employeeId,
            companyId: session.user.companyId,
          },
          include: {
            User: true,
            Department: true,
            JobRole: true,
          },
        });

        if (!employee) {
          results.errors.push({
            employeeId,
            error: "Employee not found",
          });
          continue;
        }

        const actions: string[] = [];
        let status = "processed";

        const employeeName =
          `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
          employee.User.email;

        // 1. Activate the employee
        if (!employee.User.isActivated) {
          await prisma.user.update({
            where: { id: employee.User.id },
            data: { isActivated: true },
          });
          actions.push("activated");
          results.activated++;
        }

        // 2. Check and assign permissions
        if (validatedData.checkPermissions) {
          // Check if user has a permission profile
          if (!employee.User.permissionProfileId) {
            // Assign default employee permission profile
            const defaultProfile = await prisma.permissionProfile.findFirst({
              where: {
                companyId: session.user.companyId,
                name: "Employee",
              },
            });

            if (defaultProfile) {
              await prisma.user.update({
                where: { id: employee.User.id },
                data: { permissionProfileId: defaultProfile.id },
              });
              actions.push("permissions_assigned");
            }
          }
          results.permissionsChecked++;
        }

        // 3. Check for direct reports and promote to manager if needed
        if (validatedData.promoteManagers) {
          const directReports = await prisma.user.findMany({
            where: {
              managerId: employee.User.id,
              companyId: session.user.companyId,
            },
          });

          if (directReports.length > 0 && employee.User.role !== "MANAGER") {
            await prisma.user.update({
              where: { id: employee.User.id },
              data: { role: "MANAGER" },
            });
            actions.push(`promoted_to_manager (${directReports.length} direct reports)`);
            results.managersPromoted++;

            // Assign manager permission profile if available
            const managerProfile = await prisma.permissionProfile.findFirst({
              where: {
                companyId: session.user.companyId,
                name: "Manager",
              },
            });

            if (managerProfile) {
              await prisma.user.update({
                where: { id: employee.User.id },
                data: { permissionProfileId: managerProfile.id },
              });
              actions.push("manager_permissions_assigned");
            }
          }
        }

        // 4. Send activation email
        if (validatedData.sendEmails) {
          try {
            // Create activation token
            const activationToken = randomBytes(32).toString("hex");
            await prisma.activationToken.upsert({
              where: { userId: employee.User.id },
              update: { token: activationToken },
              create: {
                id: crypto.randomUUID(),
                userId: employee.User.id,
                token: activationToken,
              },
            });

            const redirectPath = employee.onboardingTemplateId
              ? `/${employee.id}/onboarding`
              : `/dashboard`;
            const baseUrl = getAppBaseUrl();
            const activationLink = `${baseUrl}/activate?token=${activationToken}&companyId=${encodeURIComponent(
              session.user.companyId,
            )}&redirect=${encodeURIComponent(redirectPath)}`;

            const { html, text } = renderPeopleCoreEmail({
              preheader: "Welcome to PeopleCore! Activate your account",
              title: "Welcome to PeopleCore - Activate Your Account",
              intro: [
                `Hello ${employeeName}`,
                "Welcome to PeopleCore! Your account has been created and you're now part of our team.",
              ],
              sections: [
                {
                  title: "Your Details",
                  description: [
                    `Name: ${employeeName}`,
                    `Email: ${employee.User.email}`,
                    ...(employee.Department ? [`Department: ${employee.Department.name}`] : []),
                    ...(employee.JobRole ? [`Job Role: ${employee.JobRole.name}`] : []),
                    ...(actions.includes('promoted_to_manager') ? ['Role: Manager'] : []),
                  ],
                },
                {
                  title: "Next Steps",
                  description: [
                    "To get started, please activate your account by clicking the button below:",
                  ],
                },
              ],
              ctas: {
                label: "Activate Account",
                href: activationLink,
              },
              outro: [
                "If you have any questions, please don't hesitate to reach out to your manager or HR team.",
                "Welcome aboard!",
              ],
            });

            await resend.emails.send({
              from: PEOPLECORE_FROM_EMAIL,
              to: [employee.User.email],
              subject: "Welcome to PeopleCore - Activate Your Account",
              html,
              text,
            });

            actions.push("activation_email_sent");
            results.emailsSent++;
          } catch (emailError) {
            actions.push("email_failed");
            console.error(`Failed to send activation email to ${employee.User.email}:`, emailError);
          }
        }

        // Create audit log
        await auditLog({
          entityType: "EMPLOYEE",
          entityId: employee.id,
          action: "ACTIVATED",
          actorId: session.user.id,
          actorType: "USER",
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "CSV_ACTIVATION",
          field: "activation",
          oldValue: "inactive",
          newValue: "active",
          reason: "CSV Import Activation",
          metadata: {
            actions,
            sendEmails: validatedData.sendEmails,
            checkPermissions: validatedData.checkPermissions,
            promoteManagers: validatedData.promoteManagers,
          },
        });

        results.details.push({
          employeeId,
          name: employeeName,
          email: employee.User.email,
          status,
          actions,
        });

      } catch (error) {
        results.errors.push({
          employeeId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Create summary audit log
    await auditLog({
      entityType: "CSV_IMPORT",
      entityId: `activation_batch_${Date.now()}`,
      action: "COMPLETED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      metadata: {
        importType: "EMPLOYEE_ACTIVATION",
        totalEmployees: results.total,
        activated: results.activated,
        emailsSent: results.emailsSent,
        permissionsChecked: results.permissionsChecked,
        managersPromoted: results.managersPromoted,
        errors: results.errors,
        options: {
          sendEmails: validatedData.sendEmails,
          checkPermissions: validatedData.checkPermissions,
          promoteManagers: validatedData.promoteManagers,
        },
      },
    });

    return NextResponse.json({
      message: "Employee activation completed",
      results,
    });

  } catch (error) {
    console.error("Employee activation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
