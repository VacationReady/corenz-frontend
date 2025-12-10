/**
 * NZ IRD-Compliant Payroll Export API Endpoint
 * 
 * POST /api/payroll/export
 * Generates payroll exports with full NZ compliance
 * 
 * @version 2.0 - Enhanced with IRD compliance
 * @date 2024-11-09
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PayrollExportService } from "@/lib/payroll/payroll-export-service";

const exportRequestSchema = z.object({
  payPeriodStart: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format",
  }),
  payPeriodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format",
  }),
  paymentDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid payment date format",
  }),
  format: z.enum(["csv", "json", "excel"], {
    errorMap: () => ({ message: "Format must be csv, json, or excel" }),
  }),
  departmentIds: z.array(z.string()).optional(),
  employeeIds: z.array(z.string()).optional(),
  // Legacy support
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Types are now imported from the export service

/**
 * POST /api/payroll/export
 * Export NZ IRD-compliant payroll data
 * 
 * Permissions: ADMIN or MANAGER (own department only)
 * 
 * Features:
 * - Complete IRD compliance with PAYE, KiwiSaver, Student Loan calculations
 * - Overtime aggregation with proper multipliers
 * - Pre-export validation (blocks on errors, warnings for review)
 * - Multiple formats: CSV, JSON, Excel
 * - Audit trail logging
 * - Tenant isolation (company-scoped)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const singleDepartmentId =
      typeof body.departmentId === "string" && body.departmentId !== "all"
        ? body.departmentId
        : undefined;

    const normalizedBody = {
      ...body,
      payPeriodStart: body.payPeriodStart ?? body.startDate,
      payPeriodEnd: body.payPeriodEnd ?? body.endDate,
      format:
        typeof body.format === "string"
          ? body.format.toLowerCase()
          : body.format,
      departmentIds:
        body.departmentIds ?? (singleDepartmentId ? [singleDepartmentId] : undefined),
    };

    const data = exportRequestSchema.parse(normalizedBody);

    // Support legacy field names
    const payPeriodStart = data.payPeriodStart || data.startDate;
    const payPeriodEnd = data.payPeriodEnd || data.endDate;

    if (!payPeriodStart || !payPeriodEnd) {
      return NextResponse.json(
        { error: "Pay period start and end dates are required" },
        { status: 400 }
      );
    }

    // Get employee record for permissions check
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        User: {
          select: {
            role: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    const isAdmin = employee.User.role === "ADMIN";
    const isManager = employee.User.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: "Only admins and managers can export payroll data" },
        { status: 403 }
      );
    }

    // Filter employees by department if manager (not admin)
    let employeeIds = data.employeeIds;
    if (isManager && !isAdmin && employee.departmentId) {
      // Manager can only export their department
      const departmentEmployees = await prisma.employee.findMany({
        where: {
          companyId: employee.companyId,
          departmentId: employee.departmentId,
        },
        select: { id: true },
      });
      
      const deptEmployeeIds = departmentEmployees.map((e) => e.id);
      
      // Intersect with requested employee IDs if provided
      if (employeeIds && employeeIds.length > 0) {
        employeeIds = employeeIds.filter((id) => deptEmployeeIds.includes(id));
      } else {
        employeeIds = deptEmployeeIds;
      }

      if (employeeIds.length === 0) {
        return NextResponse.json(
          { error: "No employees found in your department for export" },
          { status: 403 }
        );
      }
    }

    // Initialize export service
    const exportService = new PayrollExportService();

    // Generate export
    console.log(`[API] Starting payroll export for company ${employee.companyId}`);
    
    const result = await exportService.generateExport({
      companyId: employee.companyId,
      payPeriodStart: new Date(payPeriodStart),
      payPeriodEnd: new Date(payPeriodEnd),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      format: data.format,
      employeeIds,
      departmentIds: data.departmentIds,
      exportedBy: employee.id,
    });

    console.log(`[API] Export completed: ${result.filename}, ${result.recordCount} records`);

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn(`[API] Export warnings:`, result.warnings);
    }

    // Return file download
    // Convert data to appropriate format for NextResponse
    const responseData = typeof result.data === 'string' 
      ? result.data 
      : Buffer.from(result.data);

    return new NextResponse(responseData, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Export-Record-Count": result.recordCount.toString(),
        "X-Export-Warnings": result.warnings.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] Payroll export error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid export parameters",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Check if it's a validation error
      if (error.message.includes("validation failed")) {
        return NextResponse.json(
          {
            error: "Export validation failed",
            message: error.message,
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to generate payroll export",
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate payroll export" },
      { status: 500 }
    );
  }
}
