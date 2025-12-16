import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-session";
import { hasPermission } from "@/lib/permissions";
 import { roundToTwoDecimals } from "@/lib/decimalPrecision";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensurePrismaConnected();
    const session = await getMobileSession(req);

    if (!session?.user?.id) {
      console.log("❌ Unauthenticated");
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    // Fetch user with permission profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        PermissionProfile: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Check if user has permission to view leave requests
    if (!hasPermission(user as any, "leave-requests", "read")) {
      console.log("❌ Insufficient permissions");
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as
      | "PENDING"
      | "APPROVED"
      | "DECLINED"
      | "CANCELLED"
      | null;
    const status = statusParam || "PENDING";
    const scope = searchParams.get("scope"); // "my", "all", or "balances"
    const departmentId = searchParams.get("departmentId") || undefined;
    const limitParam = searchParams.get("limit");
    const take = limitParam
      ? Math.max(1, Math.min(50, parseInt(limitParam, 10) || 0))
      : undefined;

    // Handle balances scope - return leave balances for the current user
    if (scope === "balances") {
      // Get the employee record for the current user with balance info
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { 
          id: true,
          departmentId: true,
          jobRoleId: true,
          locationId: true,
          annualLeaveBalance: true,
          sickLeaveBalance: true,
          sickLeaveEntitlement: true,
        },
      });

      if (!employee) {
        return NextResponse.json([]);
      }

      // Get leave policies assigned to this employee through various methods
      const assignments = await prisma.leavePolicyAssignment.findMany({
        where: {
          companyId: session.user.companyId,
          OR: [
            { employeeIds: { has: employee.id } },
            ...(employee.departmentId ? [{ departmentIds: { has: employee.departmentId } }] : []),
            ...(employee.jobRoleId ? [{ jobRoleIds: { has: employee.jobRoleId } }] : []),
            ...(employee.locationId ? [{ locationIds: { has: employee.locationId } }] : []),
          ],
        },
        include: {
          LeavePolicy: {
            select: {
              id: true,
              name: true,
              accrualRate: true,
              accrualPeriod: true,
              EventCategory: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      // Calculate balances for each assigned policy
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      const balances = await Promise.all(
        assignments.map(async (assignment) => {
          const policy = assignment.LeavePolicy;
          
          // Get approved leave requests for this policy's event category in the current year
          const approvedLeave = await prisma.leaveRequest.count({
            where: {
              employeeId: employee.id,
              eventCategoryId: policy.EventCategory?.id,
              approvalStatus: "APPROVED",
              startDate: { gte: yearStart },
              endDate: { lte: yearEnd },
            },
          });

          // Get pending leave requests
          const pendingLeave = await prisma.leaveRequest.count({
            where: {
              employeeId: employee.id,
              eventCategoryId: policy.EventCategory?.id,
              approvalStatus: "PENDING",
              startDate: { gte: yearStart },
              endDate: { lte: yearEnd },
            },
          });

          // Calculate annual entitlement based on accrual rate and period
          const accrualMultiplier = policy.accrualPeriod === "MONTHLY" ? 12 : 
                                    policy.accrualPeriod === "WEEKLY" ? 52 : 1;
          const totalAllowance = Math.round(policy.accrualRate * accrualMultiplier);
          const remaining = Math.max(0, totalAllowance - approvedLeave);

          return {
            id: assignment.id,
            policyId: policy.id,
            policyName: policy.name || policy.EventCategory?.name || "Leave",
            totalAllowance,
            used: approvedLeave,
            remaining,
            pending: pendingLeave,
          };
        })
      );

      // If no policy assignments found, try LeaveEntitlement table first
      if (balances.length === 0) {
        // Check LeaveEntitlement table for the employee
        const leaveEntitlements = await prisma.leaveEntitlement.findMany({
          where: { employeeId: employee.id },
          include: {
            EventCategory: {
              select: { id: true, name: true },
            },
          },
        });

        if (leaveEntitlements.length > 0) {
          // Get pending counts for each entitlement
          const entitlementBalances = await Promise.all(
            leaveEntitlements.map(async (entitlement) => {
              // Count pending leave requests (each request is typically 1+ days)
              const pendingLeaveCount = await prisma.leaveRequest.count({
                where: {
                  employeeId: employee.id,
                  eventCategoryId: entitlement.eventCategoryId,
                  approvalStatus: "PENDING",
                },
              });

              const remaining = roundToTwoDecimals(
                (entitlement.totalDays + entitlement.carryoverDays) - entitlement.usedDays,
              );

              return {
                id: entitlement.id,
                policyId: entitlement.eventCategoryId,
                policyName: entitlement.EventCategory?.name || "Leave",
                totalAllowance: roundToTwoDecimals(entitlement.totalDays + entitlement.carryoverDays),
                used: roundToTwoDecimals(entitlement.usedDays),
                remaining: Math.max(0, remaining),
                pending: pendingLeaveCount,
              };
            })
          );

          return NextResponse.json(entitlementBalances);
        }

        // Fall back to Employee balance fields (stored in hours, convert to days)
        const basicBalances = [];
        const HOURS_PER_DAY = 8;
        
        if (employee.annualLeaveBalance !== null) {
          const balanceInHours = Number(employee.annualLeaveBalance || 0);
          const remainingDays = roundToTwoDecimals(balanceInHours / HOURS_PER_DAY);
          const totalDays = 20; // Default NZ annual leave (4 weeks)
          const usedDays = Math.max(0, roundToTwoDecimals(totalDays - remainingDays));

          basicBalances.push({
            id: "annual-leave",
            policyId: "annual-leave",
            policyName: "Annual Leave",
            totalAllowance: roundToTwoDecimals(totalDays),
            used: usedDays,
            remaining: remainingDays,
            pending: 0,
          });
        }
        
        if (employee.sickLeaveBalance !== null) {
          const balanceInHours = Number(employee.sickLeaveBalance || 0);
          const entitlementInHours = Number(employee.sickLeaveEntitlement || 80); // Default 80 hours = 10 days
          const remainingDays = roundToTwoDecimals(balanceInHours / HOURS_PER_DAY);
          const totalDays = roundToTwoDecimals(entitlementInHours / HOURS_PER_DAY);
          const usedDays = Math.max(0, roundToTwoDecimals(totalDays - remainingDays));

          basicBalances.push({
            id: "sick-leave",
            policyId: "sick-leave",
            policyName: "Sick Leave",
            totalAllowance: totalDays,
            used: usedDays,
            remaining: remainingDays,
            pending: 0,
          });
        }
        
        return NextResponse.json(basicBalances);
      }

      return NextResponse.json(balances);
    }

    // Only ADMINs may view "all"; managers default to direct reports only      
    const canViewAll =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

    const baseInclude = {
      EventCategory: { select: { id: true, name: true } },
      Employee: { select: { User: { select: { name: true, email: true, profileImageUrl: true } } } },
      LeaveApprovalStage: {
        orderBy: { order: "asc" },
        include: { decisions: { include: { approver: true }, orderBy: { order: "asc" } } },
      },
    } as const;

    let leaveRequests: any[] = [];

    if (scope === "my") {
      const myDecisions = await prisma.leaveApprovalDecision.findMany({
        where: {
          approverId: session.user.id,
          status: "PENDING",
          isActive: true,
          stage: { leaveRequest: { companyId: session.user.companyId } },
        },
        select: { stage: { select: { leaveRequestId: true } } },
        take: take ?? undefined,
      });
      const ids = Array.from(new Set(myDecisions.map((d) => d.stage.leaveRequestId)));
      leaveRequests = await prisma.leaveRequest.findMany({
        where: { id: { in: ids } },
        include: baseInclude,
        orderBy: { startDate: "asc" },
      });
    } else if (scope === "all" && canViewAll) {
      const decisions = await prisma.leaveApprovalDecision.findMany({
        where: {
          status: "PENDING",
          isActive: true,
          stage: {
            leaveRequest: {
              companyId: session.user.companyId,
              Employee: departmentId ? { departmentId } : undefined,
            },
          },
        },
        select: { stage: { select: { leaveRequestId: true } } },
        take: take ?? undefined,
      });
      const ids = Array.from(new Set(decisions.map((d) => d.stage.leaveRequestId)));
      leaveRequests = await prisma.leaveRequest.findMany({
        where: { id: { in: ids } },
        include: baseInclude,
        orderBy: { startDate: "asc" },
      });
    } else {
      // Fallback legacy: by approvalStatus for manager queues
      const employeeFilter: any = {
        ...(departmentId ? { departmentId } : {}),
        ...(!(canViewAll && scope === "all") ? { User: { managerId: session.user.id } } : {}),
      };
      leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          companyId: session.user.companyId,
          approvalStatus: status,
          Employee: Object.keys(employeeFilter).length > 0 ? employeeFilter : undefined,
        },
        include: baseInclude,
        orderBy: { startDate: "asc" },
        take,
      });
    }

    const data = leaveRequests.map((lr: any) => ({
      id: lr.id,
      type: lr.EventCategory?.name ?? "",
      startDate: lr.startDate,
      endDate: lr.endDate,
      reason: lr.reason ?? null,
      approvalStatus: lr.approvalStatus,
      dayType: lr.dayType,
      eventCategory: lr.EventCategory
        ? { id: lr.EventCategory.id, name: lr.EventCategory.name }
        : null,
      employee: lr.Employee,
      approvalStages: (lr.LeaveApprovalStage || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        mode: s.mode,
        status: s.status,
        isActive: s.isActive,
        decisions: s.decisions.map((d: any) => ({
          id: d.id,
          approverId: d.approverId,
          approverName: d.approver?.name ?? null,
          approverEmail: d.approver?.email ?? null,
          order: d.order,
          status: d.status,
          isActive: d.isActive,
        })),
      })),
      myDecision: (() => {
        const active = (lr.LeaveApprovalStage || [])
          .flatMap((s: any) => s.decisions.map((d: any) => ({ ...d, stageId: s.id, mode: s.mode })))
          .find((d: any) => d.approverId === session.user.id && d.status === "PENDING" && d.isActive);
        return active ? { id: active.id, stageId: active.stageId, mode: active.mode } : null;
      })(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching leave requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch leave requests.",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic"; // ensures fresh data, disables ISR for this route

