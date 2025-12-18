// Health check endpoint to verify database connection
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[health/db] Database connection error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message,
    }, { status: 500 });
  }
}

