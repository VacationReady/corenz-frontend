import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hrReportFields } from "@/lib/hrReportFields";
import { z } from "zod";

const allowedOperators = [
	"equals","not_equals","contains","not_contains","starts_with","ends_with",
	"greater_than","less_than","greater_than_equal","less_than_equal","between",
	"is_null","is_not_null","in","not_in",
	"date_equals","date_before","date_after","date_between","date_in_last","date_in_next",
] as const;

type Operator = typeof allowedOperators[number];

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
		const session = await getServerSession(authOptions);
		if (!session?.user?.companyId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const parsedBody = reportQuerySchema.parse(await req.json());
		const { selectedFields, filters = [], pagination, sort } = {
			...parsedBody,
			filters: parsedBody.filters ?? [],
		};

		// Restrict selectedFields to allowed hrReportFields list
		const allowedFieldSet = new Set(hrReportFields.map((f) => f.field));
		const sanitizedSelectedFields = (selectedFields as string[]).filter((f) =>
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

		const enforcedFilters = Array.isArray(filters) ? [...filters] : [];
		for (const model of modelsWithCompanyId) {
			enforcedFilters.push({ field: `${model}.companyId`, operator: "equals", value: tenantCompanyId });
		}

		// Build and execute the constrained query
		const { queries } = buildDynamicQuery({
			selectedFields: sanitizedSelectedFields,
			filters: enforcedFilters,
			pagination,
			sort,
		});

		if (queries.length === 0) {
			return NextResponse.json({ status: "success", message: "No data", data: [] });
		}

		// Single primary dataset
		const primary = queries[0];
		const model = primary.model as keyof typeof prisma;
		// @ts-ignore dynamic access
		let results = await (prisma[model] as any).findMany(primary.prismaQuery);
		results = await attachComputedFields(results, sanitizedSelectedFields, primary.model);

		return NextResponse.json({
			status: "success",
			message: "Report generated successfully",
			data: results,
		});
	} catch (error: any) {
		console.error("🔥 Error in report query API:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ status: "error", message: "Invalid request body", details: error.flatten(), data: [] },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ status: "error", message: "Internal server error", data: [] },
			{ status: 500 },
		);
	}
}

