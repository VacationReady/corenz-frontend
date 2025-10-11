import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const COOKIE_NAME = "tenant_admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === "authenticated";
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Find or create a super admin user for this tenant
    let adminUser = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
      },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "No admin user found for this tenant. Create users first." },
        { status: 404 }
      );
    }

    // Create a temporary switch token (valid for 5 minutes)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.tenantSwitchToken.create({
      data: {
        token,
        userId: adminUser.id,
        companyId: company.id,
        expiresAt,
      },
    });

    return NextResponse.json({
      token,
      companyId: company.id,
      companyName: company.name,
    });
  } catch (error) {
    console.error("Tenant admin - switch error:", error);
    return NextResponse.json(
      { error: "Failed to generate switch token" },
      { status: 500 }
    );
  }
}
