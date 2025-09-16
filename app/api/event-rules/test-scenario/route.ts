import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { calculateLeaveEntitlement } from "@/lib/accrualEngine";

// POST: Test scenario simulation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      employeeId,
      eventCategoryId,
      departmentId,
      jobRoleId,
      testDate = new Date().toISOString(),
    } = body;

    if (!eventCategoryId) {
      return NextResponse.json(
        { error: "eventCategoryId is required" },
        { status: 400 },
      );
    }

    const companyId = session.user.companyId;
    const simulationDate = new Date(testDate);

    // Get Event Rule
    const eventRule = await prisma.eventRule.findUnique({
      where: {
        companyId_eventCategoryId: {
          companyId,
          eventCategoryId,
        },
      },
      include: {
        EventCategory: {
          select: { name: true, color: true },
        },
      },
    });

    // Get employee details if specified
    let employee = null;
    let accrualCalculation = null;

    if (employeeId) {
      employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Department: {
            select: { name: true },
          },
          JobRole: {
            select: { name: true },
          },
        },
      });

      if (employee) {
        try {
          accrualCalculation = await calculateLeaveEntitlement({
            employeeId,
            eventCategoryId,
            companyId,
            calculationDate: simulationDate,
          });
        } catch (error) {
          console.warn("Failed to calculate accrual:", error);
        }
      }
    }

    // Get current blackout days for the category
    const blackoutDays = await prisma.blackoutDay.findMany({
      where: {
        companyId,
        OR: [
          { allEvents: true },
          { eventCategoryIds: { has: eventCategoryId } },
        ],
        date: {
          gte: new Date(),
          lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Next year
        },
      },
      orderBy: { date: "asc" },
      take: 10, // Limit to next 10 blackout days
    });

    // Simulate enforcement scenarios
    const scenarios = [];

    if (eventRule) {
      // Notice period scenario
      if (eventRule.noticePeriodDays > 0) {
        const shortNoticeDate = new Date();
        shortNoticeDate.setDate(
          shortNoticeDate.getDate() +
            Math.max(1, eventRule.noticePeriodDays - 1),
        );

        scenarios.push({
          type: "notice_period",
          title: "Notice Period Check",
          description: `Booking ${eventRule.noticePeriodDays - 1} days in advance`,
          result: "BLOCKED",
          mode: "HARD_BLOCK", // Notice period is always hard block
          message: `This leave requires at least ${eventRule.noticePeriodDays} days notice.`,
        });
      }

      // Max booking length scenario
      if (eventRule.maxBookingLength) {
        scenarios.push({
          type: "max_booking_length",
          title: "Max Booking Length",
          description: `Attempting to book ${eventRule.maxBookingLength + 1} days`,
          result:
            eventRule.maxBookingLengthMode === "HARD_BLOCK"
              ? "BLOCKED"
              : "REQUIRES_APPROVAL",
          mode: eventRule.maxBookingLengthMode,
          message:
            eventRule.maxBookingLengthMode === "HARD_BLOCK"
              ? `You can only book up to ${eventRule.maxBookingLength} days at a time for this leave type.`
              : `Booking exceeds the ${eventRule.maxBookingLength} day limit and will require additional approval.`,
        });
      }

      // Max concurrent scenario
      if (eventRule.maxConcurrent) {
        scenarios.push({
          type: "max_concurrent",
          title: "Concurrent Bookings",
          description: `${eventRule.maxConcurrent + 1} people trying to book the same dates`,
          result:
            eventRule.maxConcurrentMode === "HARD_BLOCK"
              ? "BLOCKED"
              : "REQUIRES_APPROVAL",
          mode: eventRule.maxConcurrentMode,
          message:
            eventRule.maxConcurrentMode === "HARD_BLOCK"
              ? `Maximum of ${eventRule.maxConcurrent} concurrent bookings allowed for this leave type.`
              : `Exceeds the ${eventRule.maxConcurrent} concurrent booking limit and will require additional approval.`,
        });
      }

      // Entitlement scenario (if employee specified)
      if (employee && accrualCalculation) {
        const hasNegativeBalance =
          accrualCalculation.effectivePolicy?.allowNegativeBalance;
        scenarios.push({
          type: "entitlement",
          title: "Entitlement Check",
          description: `Current balance: ${accrualCalculation.proRatedEntitlement} days`,
          result: hasNegativeBalance ? "ALLOWED" : "DEPENDS_ON_BALANCE",
          mode: hasNegativeBalance ? "SOFT_GATE" : "HARD_BLOCK",
          message: hasNegativeBalance
            ? "Negative balance allowed by Leave Policy - entitlement check bypassed"
            : "Standard entitlement validation applies",
        });
      }
    }

    const result = {
      eventRule: eventRule
        ? {
            ...eventRule,
            eventCategory: eventRule.eventCategory,
          }
        : null,
      employee: employee
        ? {
            id: employee.id,
            name: `${employee.user.firstName} ${employee.user.lastName}`,
            email: employee.user.email,
            department: employee.department?.name,
            jobRole: employee.jobRole?.name,
            startDate: employee.startDate,
          }
        : null,
      accrualCalculation,
      blackoutDays: blackoutDays.map((bd) => ({
        date: bd.date,
        allEvents: bd.allEvents,
        eventCategoryIds: bd.eventCategoryIds,
      })),
      scenarios,
      simulationDate: simulationDate.toISOString(),
      summary: {
        totalRules: scenarios.length,
        hardBlocks: scenarios.filter((s) => s.result === "BLOCKED").length,
        softGates: scenarios.filter((s) => s.result === "REQUIRES_APPROVAL")
          .length,
        allowed: scenarios.filter((s) => s.result === "ALLOWED").length,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in test scenario:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

