import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { env } from "@/lib/env.server";

/**
 * GET /api/setup-admin/companies
 * 
 * Fetches available companies for the admin setup flow.
 * This endpoint is intentionally unauthenticated to support initial setup.
 */
export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      const session = await auth();
      const key =
        req.headers.get("x-setup-admin-key") ||
        req.nextUrl.searchParams.get("key");

      const hasSuperAdminSession = session?.user?.role === "SUPER_ADMIN";
      const hasValidKey =
        !!env.TENANT_ADMIN_PASSWORD && key === env.TENANT_ADMIN_PASSWORD;

      if (!hasSuperAdminSession && !hasValidKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

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

