import { NextResponse } from "next/server";
import { reportFields } from "@/lib/reportFields";

export async function GET() {
  return NextResponse.json(reportFields);
}
