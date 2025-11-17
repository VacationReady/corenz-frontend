import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensurePrismaConnected();
    const { id } = await context.params; // LeaveApprovalDecision.id

    // Fetch the decision with full context
    const decision = await prisma.leaveApprovalDecision.findUnique({
      where: { id },
      include: {
        stage: {
          include: {
            leaveRequest: {
              include: {
                Employee: {
                  include: {
                    User: {
                      select: {
                        id: true,
                        name: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        profileImageUrl: true,
                      },
                    },
                    Department: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                EventCategory: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!decision) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify authorization
    if (decision.approverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (decision.stage.leaveRequest.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const leaveRequest = decision.stage.leaveRequest;
    const employee = leaveRequest.Employee;
    const user = employee.User;
    const eventCategory = leaveRequest.EventCategory;

    // Get leave entitlement/balance
    const entitlement = await prisma.leaveEntitlement.findFirst({
      where: {
        employeeId: employee.id,
        eventCategoryId: eventCategory.id,
      },
    });

    // Calculate days for this request (simplified - assumes full days)
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const requestedDays = daysDiff;

    // Calculate remaining days if approved
    const remainingDaysIfApproved = entitlement
      ? entitlement.totalDays - entitlement.usedDays - requestedDays
      : null;

    // Find other employees in the same department who are off during these dates
    let departmentColleagues: any[] = [];
    if (employee.Department?.id) {
      const overlappingLeaves = await prisma.leaveRequest.findMany({
        where: {
          companyId: session.user.companyId,
          approvalStatus: "APPROVED",
          Employee: {
            departmentId: employee.Department.id,
            id: { not: employee.id }, // Exclude the requesting employee
          },
          OR: [
            // Leave starts during the requested period
            {
              startDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            // Leave ends during the requested period
            {
              endDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            // Leave spans the entire requested period
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: endDate } },
              ],
            },
          ],
        },
        include: {
          Employee: {
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          EventCategory: {
            select: {
              name: true,
              color: true,
            },
          },
        },
        take: 20, // Limit to prevent huge responses
      });

      departmentColleagues = overlappingLeaves.map((leave) => ({
        id: leave.Employee.id,
        name:
          leave.Employee.User.name ||
          `${leave.Employee.User.firstName || ""} ${leave.Employee.User.lastName || ""}`.trim() ||
          "Employee",
        profileImageUrl: leave.Employee.User.profileImageUrl,
        startDate: leave.startDate,
        endDate: leave.endDate,
        leaveType: leave.EventCategory.name,
        leaveColor: leave.EventCategory.color,
      }));
    }

    // Build response
    const displayName =
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.email ||
      "Employee";

    const response = {
      id: decision.id,
      leaveRequestId: leaveRequest.id,
      employee: {
        id: employee.id,
        name: displayName,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        department: employee.Department?.name,
      },
      leaveType: {
        id: eventCategory.id,
        name: eventCategory.name,
        color: eventCategory.color,
      },
      dates: {
        start: leaveRequest.startDate,
        end: leaveRequest.endDate,
        requestedDays,
      },
      balance: entitlement
        ? {
            totalDays: entitlement.totalDays,
            usedDays: entitlement.usedDays,
            remainingDays: entitlement.totalDays - entitlement.usedDays,
            remainingAfterApproval: remainingDaysIfApproved,
          }
        : null,
      departmentColleagues,
      reason: leaveRequest.reason,
      dayType: leaveRequest.dayType,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("[APPROVAL_DETAILS_GET]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch approval details" },
      { status: 500 }
    );
  }
}
