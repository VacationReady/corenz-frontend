// Health check endpoint to verify database connection
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check for token query param to test specific lookup
    const testToken = req.nextUrl.searchParams.get("token");
    
    // Try to count tokens - this will fail if DB connection is wrong
    const tokenCount = await prisma.activationToken.count();
    const userCount = await prisma.user.count();
    
    // Get the database URL (masked for security)
    const dbUrl = process.env.DATABASE_URL || "NOT SET";
    const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
    
    // If a test token was provided, try to look it up
    let tokenLookup = null;
    if (testToken) {
      const found = await prisma.activationToken.findUnique({
        where: { token: testToken },
      });
      tokenLookup = found ? {
        found: true,
        userId: found.userId,
        createdAt: found.createdAt.toISOString(),
        tokenLength: found.token.length,
      } : {
        found: false,
        searchedFor: testToken.substring(0, 8) + "...",
        searchLength: testToken.length,
      };
      
      // Also list first 8 chars of all tokens for comparison
      const allTokens = await prisma.activationToken.findMany({
        select: { token: true, userId: true },
      });
      tokenLookup.existingTokens = allTokens.map(t => ({
        prefix: t.token.substring(0, 8) + "...",
        length: t.token.length,
        userId: t.userId,
      }));
    }
    
    return NextResponse.json({
      status: "connected",
      database: maskedUrl.substring(0, 50) + "...",
      counts: {
        activationTokens: tokenCount,
        users: userCount,
      },
      tokenLookup,
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

