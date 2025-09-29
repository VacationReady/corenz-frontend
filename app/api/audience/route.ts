// app/api/audience/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma"; // Adjust this path if needed

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = new Set(["ADMIN", "MANAGER", "SUPER_ADMIN"]);
    if (!session.user.role || !allowedRoles.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = session.user.companyId;

    const [departments, jobRoles, locations] = await Promise.all([
      prisma.department.findMany({
        where: { companyId },
        select: { id: true, name: true },
      }),
      prisma.jobRole.findMany({
        where: { companyId },
        select: { id: true, name: true },
      }),
      prisma.location.findMany({
        where: { companyId },
        select: { id: true, name: true },
      }),
    ]);

    return NextResponse.json({
      departments,
      jobRoles,
      locations,
    });
  } catch (error) {
    console.error("Error fetching audience data:", error);
    return NextResponse.json(
      { error: "Failed to fetch audience data" },
      { status: 500 },
    );
  }
}

