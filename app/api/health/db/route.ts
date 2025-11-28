// Health check endpoint to verify database connection
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Try to count tokens - this will fail if DB connection is wrong
    const tokenCount = await prisma.activationToken.count();
    const userCount = await prisma.user.count();
    
    // Get the database URL (masked for security)
    const dbUrl = process.env.DATABASE_URL || "NOT SET";
    const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
    
    return NextResponse.json({
      status: "connected",
      database: maskedUrl.substring(0, 50) + "...",
      counts: {
        activationTokens: tokenCount,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[health/db] Database connection error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      database: process.env.DATABASE_URL ? "SET BUT FAILED" : "NOT SET",
    }, { status: 500 });
  }
}

