import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";
import { calculateLeaveDeductionBatchEnhanced } from "@/lib/calculateLeaveDeductionBatchEnhanced";
import { formatLeaveBalance, subtractWithPrecision, roundToTwoDecimals } from "@/lib/decimalPrecision";
import { 
  approvalDetailsCache, 
  departmentColleaguesCache,
  generateApprovalDetailsCacheKey,
  generateDepartmentColleaguesCacheKey,
  invalidateApprovalDetailsCache
} from "@/lib/approvalCache";

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

    // Check cache first
    const cacheKey = generateApprovalDetailsCacheKey(id);
    const cached = await approvalDetailsCache.get(cacheKey);
    if (cached) {
      console.log(`[APPROVAL_DETAILS] Cache hit for decision ${id}`);
      return NextResponse.json(
        { success: true, data: cached },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
          }
        }
      );
    }

    console.log(`[APPROVAL_DETAILS] Cache miss for decision ${id}, fetching from database`);

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

    // Calculate days for this request using batched working pattern calculation
    // Parse dates as local dates to avoid timezone shifts
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
    
    // Generate all dates in the leave period
    const leaveDates: Date[] = [];
    for (
      let time = startDate.getTime();
      time <= endDate.getTime();
      time += 24 * 60 * 60 * 1000
    ) {
      leaveDates.push(new Date(time));
    }
    
    console.log(`[APPROVAL_DETAILS] Batch calculation:`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalDates: leaveDates.length,
      employeeId: employee.id,
    });
    
    // Batch calculate all deductions at once
    const deductionResults = await calculateLeaveDeductionBatchEnhanced(employee.id, leaveDates, {
      prismaClient: prisma,
    });
    
    // Sum up the total requested days
    let requestedDays = deductionResults.reduce((sum, result) => sum + result.deduction, 0);
    
    // Adjust for half-day start/end (stored in leaveRequest)
    const leaveRequestWithDayTypes = leaveRequest as typeof leaveRequest & { 
      startDayType?: string | null; 
      endDayType?: string | null;
    };
    const isSingleDay = startDate.getTime() === endDate.getTime();
    
    if (isSingleDay) {
      // Single day: apply half-day multiplier based on dayType
      if (leaveRequest.dayType === "HALF_DAY_AM" || leaveRequest.dayType === "HALF_DAY_PM") {
        requestedDays = requestedDays * 0.5;
      }
    } else {
      // Multi-day: adjust for half-day start and/or end
      if (leaveRequestWithDayTypes.startDayType === "HALF_DAY_PM" && deductionResults.length > 0) {
        // Starting afternoon = half day on first day
        requestedDays -= deductionResults[0].deduction * 0.5;
      }
      if (leaveRequestWithDayTypes.endDayType === "HALF_DAY_AM" && deductionResults.length > 0) {
        // Ending morning = half day on last day
        requestedDays -= deductionResults[deductionResults.length - 1].deduction * 0.5;
      }
    }
    
    requestedDays = roundToTwoDecimals(Math.max(0, requestedDays));
    const formattedRequestedDays = formatLeaveBalance(requestedDays);
    
    console.log(`[APPROVAL_DETAILS] Batch results:`, {
      totalRequestedDays: formattedRequestedDays,
      nonWorkingDays: deductionResults.filter(r => r.isNonWorkingDay).length,
      publicHolidays: deductionResults.filter(r => r.isPublicHoliday).length,
      dayType: leaveRequest.dayType,
      startDayType: leaveRequestWithDayTypes.startDayType,
      endDayType: leaveRequestWithDayTypes.endDayType,
    });

    // Calculate remaining days if approved
    const remainingDaysIfApproved = entitlement
      ? subtractWithPrecision(subtractWithPrecision(entitlement.totalDays, entitlement.usedDays), requestedDays)
      : null;

    // Find other employees in the same department who are off during these dates
    let departmentColleagues: any[] = [];
    if (employee.Department?.id) {
      // Check cache first for department colleagues
      const colleaguesCacheKey = generateDepartmentColleaguesCacheKey(
        session.user.companyId,
        employee.Department.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      const cachedColleagues = await departmentColleaguesCache.get(colleaguesCacheKey);
      if (cachedColleagues) {
        console.log(`[APPROVAL_DETAILS] Department colleagues cache hit for ${employee.Department.name}`);
        departmentColleagues = cachedColleagues as any[];
      } else {
        console.log(`[APPROVAL_DETAILS] Department colleagues cache miss, querying database`);
        
        // Optimized query with only essential fields
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
              { startDate: { gte: startDate, lte: endDate } },
              // Leave ends during the requested period  
              { endDate: { gte: startDate, lte: endDate } },
              // Leave spans the entire requested period
              { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate }}] },
            ],
          },
          select: {
            Employee: {
              select: {
                id: true,
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
            startDate: true,
            endDate: true,
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

        // Cache the results for 10 minutes
        await departmentColleaguesCache.set(colleaguesCacheKey, departmentColleagues, 600);
      }
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
        requestedDays: formattedRequestedDays,
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
      startDayType: leaveRequestWithDayTypes.startDayType ?? null,
      endDayType: leaveRequestWithDayTypes.endDayType ?? null,
    };

    // Cache the response for 5 minutes
    await approvalDetailsCache.set(cacheKey, response, 300);

    return NextResponse.json(
      { success: true, data: response },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
        }
      }
    );
  } catch (error: any) {
    console.error("[APPROVAL_DETAILS_GET]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch approval details" },
      { status: 500 }
    );
  }
}
