import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import { getFieldByKey } from "@/lib/hrReportFields";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

export const runtime = "nodejs";

const allowedOperators = [
	"equals","not_equals","contains","not_contains","starts_with","ends_with",
	"greater_than","less_than","greater_than_equal","less_than_equal","between",
	"is_null","is_not_null","in","not_in",
	"date_equals","date_before","date_after","date_between","date_in_last","date_in_next",
] as const;

type Operator = typeof allowedOperators[number];

// Legacy-to-current field key mapping for backwards compatibility
const legacyFieldMap: Record<string, string> = {
    "User.department.name": "User.Department_User_departmentIdToDepartment.name",
    "User.jobRole.name": "User.JobRole.name",
};

function translateFieldKey(field: string): string {
    return legacyFieldMap[field] || field;
}

// When any LeaveRequest field is present, rewrite generic User/EventCategory selections
// to their leave-anchored equivalents so the primary model can remain LeaveRequest.
function anchorFieldToLeave(field: string): string {
    if (field === "LeaveEntitlement.usedDays") return "_computed.durationDays";
    if (field.startsWith("LeaveEntitlement.")) return field.replace("LeaveEntitlement.", "LeaveRequest.Employee.LeaveEntitlement.");
    if (field.startsWith("User.")) return field.replace("User.", "LeaveRequest.Employee.User.");
    if (field.startsWith("Employee.")) return field.replace("Employee.", "LeaveRequest.Employee.");
    if (field.startsWith("Department.")) return field.replace("Department.", "LeaveRequest.Employee.Department.");
    if (field.startsWith("JobRole.")) return field.replace("JobRole.", "LeaveRequest.Employee.JobRole.");
    if (field.startsWith("WorkingPattern.")) return field.replace("WorkingPattern.", "LeaveRequest.Employee.WorkingPattern.");
    if (field.startsWith("EventCategory.")) return field.replace("EventCategory.", "LeaveRequest.EventCategory.");
    return field;
}

function rewriteFieldsForLeaveContext(fields: string[]): string[] {
    const hasLeave = fields.some((f) => f.startsWith("LeaveRequest."));
    const result: string[] = [];
    for (const f of fields) {
        const maybeAnchored = hasLeave ? anchorFieldToLeave(f) : f;
        // Always normalize Job Role into a single computed field, independent of context
        if (
            f === "User.JobRole.name" ||
            f === "Employee.JobRole.name" ||
            maybeAnchored === "LeaveRequest.Employee.User.JobRole.name" ||
            maybeAnchored === "LeaveRequest.Employee.JobRole.name"
        ) {
            // Include both source paths so the computed can resolve, plus the computed field
            const userPath = hasLeave ? "LeaveRequest.Employee.User.JobRole.name" : "User.JobRole.name";
            const employeePath = hasLeave ? "LeaveRequest.Employee.JobRole.name" : "Employee.JobRole.name";
            if (!result.includes(userPath)) result.push(userPath);
            if (!result.includes(employeePath)) result.push(employeePath);
            if (!result.includes("_computed.jobRoleName")) result.push("_computed.jobRoleName");
            continue;
        }
        // Ensure Working Pattern name is resolvable when requested via model alias
        if (
            f === "WorkingPattern.name" ||
            maybeAnchored === "LeaveRequest.Employee.WorkingPattern.name"
        ) {
            const wpPath = hasLeave ? "LeaveRequest.Employee.WorkingPattern.name" : "WorkingPattern.name";
            if (!result.includes(wpPath)) result.push(wpPath);
            continue;
        }
        result.push(maybeAnchored);
    }
    return result;
}

const filterSchema = z
	.object({
		field: z.string().trim().min(1, "Filter field is required"),
		operator: z.enum(allowedOperators),
		value: z.any().optional(),
		value2: z.any().optional(),
	})
	.passthrough();

const paginationSchema = z
	.object({
		limit: z.number().int().positive().optional(),
		page: z.number().int().positive().optional(),
	})
	.optional();

const sortSchema = z
	.object({
		field: z.string().trim().min(1, "Sort field is required"),
		direction: z.enum(["asc", "desc"]).optional(),
	})
	.passthrough()
	.optional();

const reportQuerySchema = z.object({
	selectedFields: z
		.array(z.string().trim().min(1, "Field name is required"))
		.min(1, "At least one field must be selected"),
	filters: z.array(filterSchema).optional(),
	pagination: paginationSchema,
	sort: sortSchema,
});

export async function POST(req: Request) {
	try {
    await ensurePrismaConnected();
		const session = await getServerSession(authOptions);
		if (!session?.user?.companyId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

        const parsedBody = reportQuerySchema.parse(await req.json());
        const { selectedFields: requestedFields, filters = [], pagination, sort } = {
                ...parsedBody,
                filters: parsedBody.filters ?? [],
        };

		const companyId = session.user.companyId;

        // Expand computed field dependencies before any translation
        const initialFieldSet = new Set<string>(requestedFields as string[]);
        for (const fieldKey of initialFieldSet) {
            const definition = getFieldByKey(fieldKey);
            if (definition?.dependsOn) {
                for (const dependency of definition.dependsOn) {
                    if (typeof dependency === "string" && dependency.trim().length > 0) {
                        initialFieldSet.add(dependency);
                    }
                }
            }
        }
        const selectedFields = Array.from(initialFieldSet);

        // Translate legacy keys first
        let translatedSelectedFields = (selectedFields as string[]).map(translateFieldKey);
        let translatedFilters = (filters as any[]).map((f) => ({ ...f, field: translateFieldKey(f.field) }));
        let translatedSort = sort?.field ? { ...sort, field: translateFieldKey(sort.field) } : sort;

        // Rewrite to leave-anchored equivalents if applicable (includes LeaveEntitlement -> LeaveRequest.Employee.LeaveEntitlement)
        translatedSelectedFields = rewriteFieldsForLeaveContext(translatedSelectedFields);
        translatedFilters = translatedFilters.map((f) => ({ ...f, field: rewriteFieldsForLeaveContext([f.field])[0] }));
        if (translatedSort?.field) {
            const newSortField = rewriteFieldsForLeaveContext([translatedSort.field])[0];
            translatedSort = { ...translatedSort, field: newSortField } as any;
        }

        // Do not restrict fields by an allowlist; accept all translated selections
        let sanitizedSelectedFields = Array.from(new Set(translatedSelectedFields));

        // If Working Pattern name is requested in any alias, include computed fallback
        if (
          sanitizedSelectedFields.includes("WorkingPattern.name") ||
          sanitizedSelectedFields.includes("Employee.WorkingPattern.name") ||
          sanitizedSelectedFields.includes("LeaveRequest.Employee.WorkingPattern.name")
        ) {
          if (!sanitizedSelectedFields.includes("_computed.workingPatternName")) {
            sanitizedSelectedFields.push("_computed.workingPatternName");
          }
          // Also include latest assignment relation for fallback resolution
          const needsEmployee = sanitizedSelectedFields.some((f) => f.startsWith("Employee."));
          const needsLeave = sanitizedSelectedFields.some((f) => f.startsWith("LeaveRequest."));
          if (needsLeave) {
            // Ensure nested include contains assignments and WP under LeaveRequest.Employee
            sanitizedSelectedFields.push("LeaveRequest.Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("LeaveRequest.Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          } else if (needsEmployee || sanitizedSelectedFields.some((f) => f.startsWith("User."))) {
            sanitizedSelectedFields.push("Employee.EmployeeWorkingPatternAssignment.WorkingPattern.name");
            sanitizedSelectedFields.push("Employee.EmployeeWorkingPatternAssignment.effectiveDate");
          }
        }

		if (sanitizedSelectedFields.length === 0) {
			return NextResponse.json(
				{ status: "error", message: "No valid fields selected", data: [] },
				{ status: 400 },
			);
		}

                // Enforce tenant boundaries across every model exposed through the reporting API.
		const tenantCompanyId = session.user.companyId;
                const tenantScopedFilters = [
                        { field: "User.companyId" },
                        { field: "Employee.companyId" },
                        { field: "Department.companyId" },
                        { field: "JobRole.companyId" },
                        { field: "LeaveRequest.companyId" },
                        { field: "LeaveEntitlement.companyId" },
                        { field: "EventCategory.companyId" },
                        { field: "EventSubcategory.companyId" },
                        { field: "Document.companyId" },
                        { field: "SavedReport.companyId" },
                        { field: "WorkingPattern.companyId" },
                        { field: "GenderOption.companyId" },
                        { field: "Course.companyId", operator: "in", includeNull: true },
                        { field: "TrainingProvider.companyId", operator: "in", includeNull: true },
                        { field: "TrainingRecord.Employee.companyId" },
                        { field: "EmploymentCheck.Employee.companyId" },
                        { field: "DriverLicence.Employee.companyId" },
                        { field: "EmployeeOffboarding.Employee.companyId" },
                ] satisfies Array<{
                        field: string;
                        operator?: Operator;
                        includeNull?: boolean;
                }>;

                const enforcedFilters = Array.isArray(translatedFilters) ? [...translatedFilters] : [];
                for (const { field, operator = "equals", includeNull } of tenantScopedFilters) {
                        const value = operator === "in"
                                ? includeNull
                                        ? [tenantCompanyId, null]
                                        : [tenantCompanyId]
                                : tenantCompanyId;
                        enforcedFilters.push({ field, operator, value });
                }

		// Build and execute the constrained query
		const { queries } = buildDynamicQuery({
			selectedFields: sanitizedSelectedFields,
			filters: enforcedFilters,
			pagination,
			sort: translatedSort,
		});

                if (queries.length === 0) {
                        return NextResponse.json({ status: "success", message: "No data", data: [], total: 0 });
                }

                // Single primary dataset
                const primary = queries[0];
                const model = primary.model as keyof typeof prisma;

                const countArgs = primary.prismaQuery.where
                        ? { where: primary.prismaQuery.where }
                        : {};

                // @ts-ignore dynamic access
		const total = await (prisma[model] as any).count(countArgs);
		// @ts-ignore dynamic access
		let results = await (prisma[model] as any).findMany(primary.prismaQuery);
                results = await attachComputedFields(results, sanitizedSelectedFields, primary.model);

                return NextResponse.json({
                        status: "success",
                        message: "Report generated successfully",
                        data: results,
                        total,
                });
	} catch (error: any) {
		console.error("🔥 Error in report query API:", error);
		if (error instanceof z.ZodError) {
                        return NextResponse.json(
                                {
                                        status: "error",
                                        message: "Invalid request body",
                                        details: error.flatten(),
                                        data: [],
                                        total: 0,
                                },
                                { status: 400 },
                        );
                }
                return NextResponse.json(
                        { status: "error", message: error?.message || "Internal server error", data: [], total: 0 },
                        { status: 500 },
                );
        }
}

