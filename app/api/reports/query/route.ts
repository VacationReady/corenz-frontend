import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hrReportFields } from "@/lib/hrReportFields";
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
    if (field.startsWith("EventCategory.")) return field.replace("EventCategory.", "LeaveRequest.EventCategory.");
    return field;
}

function rewriteFieldsForLeaveContext(fields: string[]): string[] {
    const hasLeave = fields.some((f) => f.startsWith("LeaveRequest."));
    if (!hasLeave) return fields;
    const result: string[] = [];
    for (const f of fields) {
        const anchored = anchorFieldToLeave(f);
        // Special handling: Job Role fallback via computed field
        if (
            f === "User.JobRole.name" ||
            anchored === "LeaveRequest.Employee.User.JobRole.name" ||
            anchored === "LeaveRequest.Employee.JobRole.name"
        ) {
            // Push the underlying sources for computation (hidden) and the computed field for display
            if (!result.includes("LeaveRequest.Employee.User.JobRole.name")) result.push("LeaveRequest.Employee.User.JobRole.name");
            if (!result.includes("LeaveRequest.Employee.JobRole.name")) result.push("LeaveRequest.Employee.JobRole.name");
            if (!result.includes("_computed.jobRoleName")) result.push("_computed.jobRoleName");
            continue;
        }
        result.push(anchored);
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
		const { selectedFields, filters = [], pagination, sort } = {
			...parsedBody,
			filters: parsedBody.filters ?? [],
		};

		// Translate legacy keys first
        // Always guarantee first and last name are present
        let translatedSelectedFields = (selectedFields as string[]).map(translateFieldKey);
        const ensure = (arr: string[], f: string) => (arr.includes(f) ? arr : [...arr, f]);
        translatedSelectedFields = ensure(ensure(translatedSelectedFields, "User.firstName"), "User.lastName");
        let translatedFilters = (filters as any[]).map((f) => ({ ...f, field: translateFieldKey(f.field) }));
        let translatedSort = sort?.field ? { ...sort, field: translateFieldKey(sort.field) } : sort;

        // Rewrite to leave-anchored equivalents if applicable (includes LeaveEntitlement -> LeaveRequest.Employee.LeaveEntitlement)
        translatedSelectedFields = rewriteFieldsForLeaveContext(translatedSelectedFields);
        translatedFilters = translatedFilters.map((f) => ({ ...f, field: rewriteFieldsForLeaveContext([f.field])[0] }));
        if (translatedSort?.field) {
            const newSortField = rewriteFieldsForLeaveContext([translatedSort.field])[0];
            translatedSort = { ...translatedSort, field: newSortField } as any;
        }

		// Restrict selectedFields to allowed hrReportFields list
        const baseAllowed = hrReportFields.map((f) => f.field);
        const anchoredAllowed = baseAllowed.map(anchorFieldToLeave);
        const allowedFieldSet = new Set([...baseAllowed, ...anchoredAllowed, "_computed.durationDays", "_computed.jobRoleName", "LeaveRequest.Employee.User.JobRole.name", "LeaveRequest.Employee.JobRole.name"]);
		const sanitizedSelectedFields = translatedSelectedFields.filter((f) =>
			allowedFieldSet.has(f),
		);

		if (sanitizedSelectedFields.length === 0) {
			return NextResponse.json(
				{ status: "error", message: "No valid fields selected", data: [] },
				{ status: 400 },
			);
		}

		// Enforce tenant boundaries across common models by appending a hidden filter per model
		const tenantCompanyId = session.user.companyId;
		const modelsWithCompanyId = [
			"User","Employee","Department","JobRole","LeaveRequest","LeaveEntitlement",
			"EventCategory","EventSubcategory","TrainingRecord","Course","TrainingProvider",
			"Document","EmploymentCheck","EmployeeOffboarding","SavedReport",
		];

		const enforcedFilters = Array.isArray(translatedFilters) ? [...translatedFilters] : [];
		for (const model of modelsWithCompanyId) {
			enforcedFilters.push({ field: `${model}.companyId`, operator: "equals", value: tenantCompanyId });
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

