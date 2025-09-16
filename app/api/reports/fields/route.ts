import { NextResponse } from "next/server";
import { hrReportFields } from "@/lib/hrReportFields";

export async function GET() {
  // Return only HR-curated fields
  return NextResponse.json(hrReportFields);
}

