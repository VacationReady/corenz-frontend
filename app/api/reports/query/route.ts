import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";

export async function POST(req: Request) {
  try {
    const { model, selectedFields, filters, pagination, sort } = await req.json();

    if (!model || !selectedFields || selectedFields.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Invalid request parameters", data: [] },
        { status: 400 }
      );
    }

    const { prismaQuery, computedFields } = buildDynamicQuery({
      selectedFields,
      filters,
      pagination,
      sort,
    });

    // @ts-ignore – dynamic access to model
    const results = await prisma[model].findMany(prismaQuery);

    const finalResults = await attachComputedFields(results, selectedFields, model);

    return NextResponse.json({
      status: "success",
      message: "Report generated successfully",
      data: finalResults,
    });
  } catch (error: any) {
    console.error("Error in report query API:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error", data: [] },
      { status: 500 }
    );
  }
}
