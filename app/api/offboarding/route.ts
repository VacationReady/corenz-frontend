import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

function isAssignmentEmailEnabled(): boolean {
  const flag = process.env.ENABLE_OFFBOARDING_TASK_EMAILS;
  if (!flag) {
    return true;
  }

  const value = flag.trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "off";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const companyId = session.user.companyId;

    const where: any = {
      Employee: {
        companyId,
      },
    };

    if (statusParam && statusParam !== "all") {
      const statuses = statusParam
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);

      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    const [offboardingRecords, total] = await Promise.all([
      prisma.employeeOffboarding.findMany({
        where,
        include: {
          Employee: {
            include: {
              User: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              Department: {
                select: {
                  id: true,
                  name: true,
                },
              },
              JobRole: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          User_EmployeeOffboarding_initiatedByIdToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          OffboardingTask: {
            select: {
              id: true,
              title: true,
              category: true,
              isRequired: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.employeeOffboarding.count({ where }),
    ]);

    // Calculate completion percentage for each record
    const recordsWithProgress = offboardingRecords.map((record) => {
      const requiredTasks = record.OffboardingTask.filter((task) => task.isRequired);
      const completedRequiredTasks = requiredTasks.filter(
        (task) => task.completedAt !== null,
      );
      const completionPercentage =
        requiredTasks.length > 0
          ? Math.round(
              (completedRequiredTasks.length / requiredTasks.length) * 100,
            )
          : 0;

      return {
        ...record,
        completionPercentage,
        totalTasks: record.OffboardingTask.length,
        completedTasks: record.OffboardingTask.filter((task) => task.completedAt !== null)
          .length,
      };
    });

    return NextResponse.json({
      records: recordsWithProgress,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching offboarding records:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const body = await req.json();
    const {
      offboardingId,
      title,
      description,
      category,
      assignedTo,
      dueDate,
      isRequired,
    } = body;

    if (!offboardingId || !title || !category) {
      return NextResponse.json(
        { error: "Offboarding ID, title, and category are required" },
        { status: 400 },
      );
    }

    // Verify offboarding record exists
    const offboardingRecord = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            Department: {
              select: {
                name: true,
              },
            },
            JobRole: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!offboardingRecord) {
      return NextResponse.json(
        { error: "Offboarding record not found" },
        { status: 404 },
      );
    }

    if (offboardingRecord.Employee.companyId !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the highest order for new task placement
    const lastTask = await prisma.offboardingTask.findFirst({
      where: {
        offboardingId,
        EmployeeOffboarding: {
          is: { Employee: { companyId } },
        },
      },
      orderBy: { order: "desc" },
    });

    const newOrder = (lastTask?.order || 0) + 10;

    const task = await prisma.offboardingTask.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        title,
        description,
        category,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        isRequired: isRequired ?? false,
        order: newOrder,
        EmployeeOffboarding: { connect: { id: offboardingId } },
      },
    });

    const assignedUserDetails = task.assignedTo
      ? await prisma.user.findUnique({
          where: { id: task.assignedTo },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            companyId: true,
          },
        })
      : null;

    if (task.assignedTo && !assignedUserDetails) {
      console.warn(
        "Offboarding task assigned user not found:",
        task.assignedTo,
      );
    }

    if (assignedUserDetails && assignedUserDetails.companyId !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignedUserProfile = assignedUserDetails 
      ? {
          id: assignedUserDetails.id,
          firstName: assignedUserDetails.firstName,
          lastName: assignedUserDetails.lastName,
          email: assignedUserDetails.email,
          phone: assignedUserDetails.phone,
        }
      : null;

    const enrichedTask = {
      ...task,
      User_OffboardingTask_assignedToToUser: assignedUserProfile,
    };

    const assignmentEmailsEnabled = isAssignmentEmailEnabled();

    if (!assignmentEmailsEnabled) {
      console.log(
        "ℹ️ Offboarding assignment email skipped: disabled via feature flag",
      );
    } else if (!assignedUserDetails?.email) {
      console.log(
        "ℹ️ Offboarding assignment email skipped: no email for assigned user",
      );
    } else if (!offboardingRecord.Employee?.User) {
      console.log(
        "ℹ️ Offboarding assignment email skipped: missing employee context",
      );
    } else {
      const employeeUser = offboardingRecord.Employee.User;
      const employeeName =
        `${employeeUser.firstName ?? ""} ${employeeUser.lastName ?? ""}`.trim() ||
        employeeUser.email;
      const departmentName =
        offboardingRecord.Employee.Department?.name || undefined;
      const jobRoleName = offboardingRecord.Employee.JobRole?.name || undefined;
      const dueDateText = enrichedTask.dueDate
        ? new Intl.DateTimeFormat("en-NZ", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(enrichedTask.dueDate))
        : "No due date set";
      const baseUrl = getAppBaseUrl();
      const offboardingLink = `${baseUrl}/employees/${offboardingRecord.employeeId}/offboarding`;

      try {
        const { html, text } = renderPeopleCoreEmail({
          preheader: `${employeeName}'s offboarding task: ${enrichedTask.title}`,
          title: "New Offboarding Task Assigned",
          intro: [
            `Hi ${assignedUserDetails.firstName || "there"},`,
            `${employeeName}'s offboarding has a new task assigned to you.`,
          ],
          sections: [
            {
              title: "Task details",
              bulletPoints: [
                `Task: ${enrichedTask.title}`,
                `Due date: ${dueDateText}`,
                `Employee: ${employeeName}`,
                ...(departmentName ? [`Department: ${departmentName}`] : []),
                ...(jobRoleName ? [`Role: ${jobRoleName}`] : []),
              ],
            },
          ],
          ctas: {
            label: "View Offboarding Checklist",
            href: offboardingLink,
          },
          outro: [
            "Log in to PeopleCore to update the task once it's complete.",
            "Thanks,",
            "The PeopleCore Team",
          ],
        });

        const result = await resend.emails.send({
          from: "PeopleCore Notifications <noreply@peoplecore.co.nz>",
          to: assignedUserDetails.email,
          subject: `New offboarding task for ${employeeName}: ${enrichedTask.title}`,
          html,
          text,
        });

        console.log(
          "✅ Offboarding assignment email sent:",
          result,
        );
      } catch (emailError) {
        console.error(
          "❌ Failed to send offboarding assignment email:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      message: "Task created successfully",
      task: enrichedTask,
    });
  } catch (error) {
    console.error("Error creating offboarding task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

