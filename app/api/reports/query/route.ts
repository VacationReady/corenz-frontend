import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hrReportFields } from "@/lib/hrReportFields";
import { z } from "zod";

const filterSchema = z
  .object({
    field: z.string().trim().min(1, "Filter field is required"),
    value: z.any(),
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

    console.log("🟡 Selected fields:", selectedFields);
    console.log("🟡 Filters:", filters);
    console.log("🟡 Pagination:", pagination);
    console.log("🟡 Sort:", sort);

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

    // Inject tenant filter for User model queries
    const enforcedFilters = Array.isArray(filters) ? [...filters] : [];
    enforcedFilters.push({ field: "User.companyId", value: session.user.companyId });

    const { queries, computedFields } = buildDynamicQuery({
      selectedFields: sanitizedSelectedFields,
      filters: enforcedFilters,
      pagination,
      sort,
    });

    const combinedResults: Record<string, any[]> = {};

    for (const { model, prismaQuery } of queries) {
      const prismaModelKey = model; // Use model name as-is (case-sensitive)

      console.log("🔵 Processing model:", model);
      console.log("🔵 Prisma model resolved as:", prismaModelKey);
      console.log(
        "🔵 Prisma query payload:",
        JSON.stringify(prismaQuery, null, 2),
      );

      if (!(prismaModelKey in prisma)) {
        console.error("❌ Invalid model:", model);
        console.error(
          "✅ Available models in Prisma client:",
          Object.keys(prisma),
        );
        return NextResponse.json(
          { status: "error", message: `Invalid model '${model}'`, data: [] },
          { status: 400 },
        );
      }

      // @ts-ignore – dynamic model access is safe here
      let results = await (
        prisma[prismaModelKey as keyof typeof prisma] as any
      ).findMany(prismaQuery);

      results = await attachComputedFields(results, selectedFields, model);
      combinedResults[model] = results;
    }

    return NextResponse.json({
      status: "success",
      message: "Report generated successfully",
      data: combinedResults,
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

