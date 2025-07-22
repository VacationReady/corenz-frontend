// /api/reports/query/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reportFields } from "@/lib/reportFields";
import { buildDynamicQuery } from "@/lib/queryBuilder";

export async function POST(req: Request) {
  try {
    const { model, selectedFields, filters, pagination, sort } = await req.json();

    if (!model || !selectedFields || selectedFields.length === 0) {
      return NextResponse.json({ status: "error", message: "Invalid request parameters", data: [] }, { status: 400 });
    }

    const { prismaQuery, computedFields } = buildDynamicQuery({ model, selectedFields, filters, pagination, sort });

    // @ts-ignore - dynamic model access
    const result = await prisma[model].findMany(prismaQuery);

    if (!result || result.length === 0) {
      return NextResponse.json({ status: "success", message: "No data found", data: [] });
    }

    const finalResult = result.map((row: any) => {
      const computedData = computedFields.reduce((acc: any, computed: any) => {
        acc[computed.field] = computed.compute(row);
        return acc;
      }, {});
      return { ...row, ...computedData };
    });

    return NextResponse.json({ status: "success", message: "Report generated successfully", data: finalResult });
  } catch (error: any) {
    console.error("Error in report query API:", error);
    return NextResponse.json({ status: "error", message: "Internal server error", data: [] }, { status: 500 });
  }
}
