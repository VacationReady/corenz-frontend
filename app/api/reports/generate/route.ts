import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { reportDefinitions } from "@/lib/reportDefinitions";
import { z } from "zod";

const allowedOperators = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_than_equal",
  "less_than_equal",
  "between",
  "is_null",
  "is_not_null",
  "in",
  "not_in",
  "date_equals",
  "date_before",
  "date_after",
  "date_between",
  "date_in_last",
  "date_in_next",
  "date_preset",
] as const;

const filterRuleSchema = z
  .object({
    field: z.string().trim().min(1),
    operator: z.enum(allowedOperators),
    value: z.any().optional(),
    value2: z.any().optional(),
  })
  .passthrough();

const paginationSchema = z
  .object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(500).optional(),
    sortBy: z.string().trim().min(1).optional().nullable(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

const reportGenerateSchema = z.object({
  reportType: z
    .string({ required_error: "reportType is required" })
    .trim()
    .min(1, "reportType is required"),
  filters: z.union([z.record(z.any()), z.array(filterRuleSchema)]).optional(),
  pagination: paginationSchema,
});

function normalizeFilterRules(input: unknown): Record<string, any> {
  if (!Array.isArray(input)) {
    return (input as Record<string, any>) ?? {};
  }

  const normalized: Record<string, any> = {};
  for (const raw of input) {
    const parsed = filterRuleSchema.safeParse(raw);
    if (!parsed.success) continue;
    const rule = parsed.data;
    const field = rule.field;
    const condition = { operator: rule.operator, value: rule.value, value2: rule.value2 };

    if (field === "Employee.isActive" || field.endsWith(".isActive")) {
      normalized.isActive = condition;
      continue;
    }

    if (
      field === "Employee.Department.name" ||
      field.endsWith(".Department.name") ||
      field === "Employee.department" ||
      field.endsWith(".department")
    ) {
      normalized.departmentName = condition;
      continue;
    }
    if (
      field === "Employee.JobRole.name" ||
      field.endsWith(".JobRole.name") ||
      field === "Employee.title" ||
      field.endsWith(".title")
    ) {
      normalized.jobRoleName = condition;
      continue;
    }
    if (
      field === "LeaveEntitlement.EventCategory.name" ||
      field.endsWith(".EventCategory.name") ||
      field === "EventCategory.name"
    ) {
      normalized.eventCategoryName = condition;
      continue;
    }

    if (field === "Employee.departmentId" || field.endsWith(".Department.id") || field.endsWith(".departmentId")) {
      normalized.departmentId = condition;
      continue;
    }
    if (field === "Employee.jobRoleId" || field.endsWith(".JobRole.id") || field.endsWith(".jobRoleId")) {
      normalized.jobRoleId = condition;
      continue;
    }
    if (field === "LeaveEntitlement.eventCategoryId" || field.endsWith(".EventCategory.id") || field.endsWith(".eventCategoryId")) {
      normalized.eventCategoryId = condition;
      continue;
    }
    if (field === "_computed.remainingEntitlement" || field.endsWith(".remainingEntitlement")) {
      normalized.remainingLT = condition;
      continue;
    }
    if (field === "LeaveRequest.approvalStatus" || field.endsWith(".approvalStatus") || field === "status") {
      normalized.status = condition;
      continue;
    }
    if (field === "LeaveRequest.employeeId" || field.endsWith(".employeeId") || field === "employeeId") {
      normalized.employeeId = condition;
      continue;
    }
  }
  return normalized;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportType, filters, pagination } = reportGenerateSchema.parse(
      await req.json(),
    );

    const normalizedFilters = normalizeFilterRules(filters);
    const normalizedPagination = {
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? 50,
      sortBy: pagination?.sortBy ?? null,
      sortOrder: pagination?.sortOrder ?? "asc",
    };

    if (!reportDefinitions[reportType as keyof typeof reportDefinitions]) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    const definition = reportDefinitions[reportType as keyof typeof reportDefinitions];
    const companyId = session.user.companyId;

    const result = await definition.query(normalizedFilters, normalizedPagination, {
      companyId,
    });

    // Handle both legacy array returns and new { data, total } format
    if (Array.isArray(result)) {
      return NextResponse.json({ data: result, total: result.length });
    }
    
    return NextResponse.json({ data: result.data, total: result.total });
  } catch (error) {
    console.error("Error generating report:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

