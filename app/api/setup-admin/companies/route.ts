import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/setup-admin/companies
 * 
 * Fetches available companies for the admin setup flow.
 * This endpoint is intentionally unauthenticated to support initial setup.
 */
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

