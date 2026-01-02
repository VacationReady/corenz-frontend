import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { formatLeaveBalance, subtractWithPrecision } from "@/lib/decimalPrecision";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
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

    // Calculate days for this request using working pattern
    // Parse dates as local dates to avoid timezone shifts
    // Prisma returns Date objects, but we need to treat them as local dates
    const startDateRaw = leaveRequest.startDate;
    const endDateRaw = leaveRequest.endDate;
    
    // Extract year, month, day from the stored dates and create local dates
    const startDate = new Date(
      startDateRaw.getFullYear(),
      startDateRaw.getMonth(),
      startDateRaw.getDate(),
      12, 0, 0, 0 // Use noon to avoid DST issues
    );
    const endDate = new Date(
      endDateRaw.getFullYear(),
      endDateRaw.getMonth(),
      endDateRaw.getDate(),
      12, 0, 0, 0
    );
    
    console.log(`[APPROVAL_DETAILS] Date calculation:`, {
      startDateRaw: startDateRaw.toISOString(),
      endDateRaw: endDateRaw.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      employeeId: employee.id,
    });
    
    // Calculate working pattern deduction (end date is inclusive - last day away)
    let requestedDays = 0;
    const dayDeductions: { date: string; deduction: number }[] = [];
    for (
      let time = startDate.getTime();
      time <= endDate.getTime();
      time += 24 * 60 * 60 * 1000
    ) {
      const currentDate = new Date(time);
      const deduction = await calculateLeaveDeduction(employee.id, currentDate);
      dayDeductions.push({ date: currentDate.toISOString(), deduction });
      requestedDays += deduction;
    }
    // Format requestedDays to avoid floating point precision issues
    requestedDays = formatLeaveBalance(requestedDays);
    
    console.log(`[APPROVAL_DETAILS] Day deductions:`, dayDeductions);
    console.log(`[APPROVAL_DETAILS] Total requestedDays:`, requestedDays);

    // Calculate remaining days if approved
    const remainingDaysIfApproved = entitlement
      ? subtractWithPrecision(subtractWithPrecision(entitlement.totalDays, entitlement.usedDays), requestedDays)
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
        profileImagePath: leave.Employee.User.profileImageUrl,
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

    // Batch sign profile image URLs
    const profilesToSign = [];
    if (user.profileImageUrl) {
      profilesToSign.push({ id: user.id, path: user.profileImageUrl });
    }
    for (const colleague of departmentColleagues) {
      if (colleague.profileImagePath) {
        profilesToSign.push({ id: colleague.id, path: colleague.profileImagePath });
      }
    }
    const signedUrlMap = await batchSignProfileUrlsAsMap(profilesToSign);

    const response = {
      id: decision.id,
      leaveRequestId: leaveRequest.id,
      employee: {
        id: employee.id,
        name: displayName,
        email: user.email,
        profileImageUrl: user.profileImageUrl ? signedUrlMap.get(user.id) ?? null : null,
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
            totalDays: formatLeaveBalance(entitlement.totalDays),
            usedDays: formatLeaveBalance(entitlement.usedDays),
            remainingDays: formatLeaveBalance(subtractWithPrecision(entitlement.totalDays, entitlement.usedDays)),
            remainingAfterApproval: formatLeaveBalance(remainingDaysIfApproved ?? 0),
          }
        : null,
      departmentColleagues: departmentColleagues.map((colleague) => ({
        id: colleague.id,
        name: colleague.name,
        profileImageUrl: colleague.profileImagePath ? signedUrlMap.get(colleague.id) ?? null : null,
        startDate: colleague.startDate,
        endDate: colleague.endDate,
        leaveType: colleague.leaveType,
        leaveColor: colleague.leaveColor,
      })),
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
