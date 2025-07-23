import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const fields = await prisma.fieldMetadata.findMany({
      where: { isReportable: true },
      orderBy: { model: "asc" },
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Error fetching report fields:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
