import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const fields = await prisma.fieldMetadata.findMany({
      where: { isReportable: true },
      orderBy: [{ model: "asc" }, { label: "asc" }],
    });

    // Group by model for the report builder
    const groupedFields: Record<string, { label: string; value: string }[]> = {};

    fields.forEach((field) => {
      if (!groupedFields[field.model]) {
        groupedFields[field.model] = [];
      }
      groupedFields[field.model].push({
        label: field.label,
        value: `${field.model}.${field.field}`,
      });
    });

    return NextResponse.json(groupedFields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
