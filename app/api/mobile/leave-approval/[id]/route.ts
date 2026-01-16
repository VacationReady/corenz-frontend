import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-session";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { formatLeaveBalance, subtractWithPrecision } from "@/lib/decimalPrecision";
import { processDecision } from "@/lib/advanceLeaveApproval";

export const runtime = "nodejs";

/**
 * GET /api/mobile/leave-approval/[id]
 * Fetches detailed leave approval information for mobile app
 * Includes balance, team conflicts, and all details shown in desktop modal
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getMobileSession(req);
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
    
    console.log(`[MOBILE_LEAVE_APPROVAL] Date calculation:`, {
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
    
    console.log(`[MOBILE_LEAVE_APPROVAL] Day deductions:`, dayDeductions);
    console.log(`[MOBILE_LEAVE_APPROVAL] Total requestedDays:`, requestedDays);

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
        start: leaveRequest.startDate.toISOString(),
        end: leaveRequest.endDate.toISOString(),
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
        startDate: colleague.startDate.toISOString(),
        endDate: colleague.endDate.toISOString(),
        leaveType: colleague.leaveType,
        leaveColor: colleague.leaveColor,
      })),
      reason: leaveRequest.reason,
      dayType: leaveRequest.dayType,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("[MOBILE_LEAVE_APPROVAL_GET]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch leave approval details" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/leave-approval/[id]
 * Approve or decline a leave request from mobile app
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getMobileSession(req);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensurePrismaConnected();
    const { id } = await context.params; // This is a LeaveApprovalDecision.id
    const body = await req.json().catch(() => ({} as any));
    const action = body?.action as "approve" | "decline" | undefined;
    const comment = (body?.comment ?? "").toString().trim();

    if (!action || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Ensure decision exists and belongs to this company and user (authorization)
    const decision = await prisma.leaveApprovalDecision.findUnique({
      where: { id },
      include: { stage: { include: { leaveRequest: true } } },
    });
    if (!decision) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (decision.approverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (decision.stage.leaveRequest.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Decline must include a non-empty comment
    if (action === "decline" && comment.length === 0) {
      return NextResponse.json({ error: "Comment is required when declining" }, { status: 400 });
    }

    // When declining, persist a comment at stage level (metadata) for future retrieval
    if (action === "decline" && comment) {
      await prisma.leaveApprovalStage.update({
        where: { id: decision.stageId },
        data: { name: decision.stage?.name ?? null },
      });
      // Store comment on GlobalAuditLog for traceability
      await prisma.globalAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId!,
          entityType: "LEAVE_POLICY" as any,
          entityId: decision.stage.leaveRequestId,
          action: "UPDATED" as any,
          actorId: session.user.id,
          changes: {
            decisionId: decision.id,
            stageId: decision.stageId,
            comment,
            action: "decline",
          },
          metadata: { source: "mobile-app" },
        },
      });
    }

    const result = await processDecision({
      decisionId: decision.id,
      action,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { leaveRequestId: decision.stage.leaveRequestId } });
  } catch (error: any) {
    console.error("[MOBILE_LEAVE_APPROVAL_POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to perform action" },
      { status: 500 },
    );
  }
}
