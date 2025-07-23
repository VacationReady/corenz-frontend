import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";

export async function POST(req: Request) {
  try {
    const { selectedFields, filters, pagination, sort } = await req.json();

    console.log("🟡 Selected fields:", selectedFields);
    console.log("🟡 Filters:", filters);
    console.log("🟡 Pagination:", pagination);
    console.log("🟡 Sort:", sort);

    if (!selectedFields || selectedFields.length === 0) {
      console.warn("❌ No fields selected in report request.");
      return NextResponse.json(
        { status: "error", message: "No fields selected", data: [] },
        { status: 400 }
      );
    }

    const { queries, computedFields } = buildDynamicQuery({
      selectedFields,
      filters,
      pagination,
      sort,
    });

    const combinedResults: Record<string, any[]> = {};

    for (const { model, prismaQuery } of queries) {
      const prismaModel = model.charAt(0).toUpperCase() + model.slice(1);

      console.log("🔵 Processing model:", model);
      console.log("🔵 Prisma model resolved as:", prismaModel);
      console.log("🔵 Prisma query payload:", JSON.stringify(prismaQuery, null, 2));

      if (!(prismaModel in prisma)) {
        console.error("❌ Invalid model:", model);
        console.error("✅ Available models in Prisma client:", Object.keys(prisma));
        return NextResponse.json(
          { status: "error", message: `Invalid model '${model}'`, data: [] },
          { status: 400 }
        );
      }

      // @ts-ignore – dynamic model access is safe here
      let results = await (prisma[prismaModel as keyof typeof prisma] as any).findMany(prismaQuery);

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
      { status: 500 }
    );
  }
}
