import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { reportFields } from "@/lib/reportFields";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { selectedFields, filters, pagination, sort } = await req.json();

    console.log("🟡 Selected fields:", selectedFields);
    console.log("🟡 Filters:", filters);
    console.log("🟡 Pagination:", pagination);
    console.log("🟡 Sort:", sort);

    if (!selectedFields || selectedFields.length === 0) {
      console.warn("❌ No fields selected in report request.");
      return NextResponse.json(
        { status: "error", message: "No fields selected", data: [] },
        { status: 400 },
      );
    }

    // Restrict selectedFields to allowed reportFields list
    const allowedFieldSet = new Set(reportFields.map((f) => f.field));
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
    return NextResponse.json(
      { status: "error", message: "Internal server error", data: [] },
      { status: 500 },
    );
  }
}
