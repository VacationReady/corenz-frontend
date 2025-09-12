// /app/api/documents/list-employee/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const companyId = session.user.companyId;

  if (!employeeId) {
    return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
  }

  // ✅ Determine user role (uppercase from session type)
  const userRole = session.user.role; // "ADMIN" | "MANAGER" | "EMPLOYEE"

  // ✅ Build role-based filter using uppercase matches
  let accessFilter = {};
  if (userRole === "ADMIN") {
    accessFilter = { canViewAdmin: true };
  } else if (userRole === "MANAGER") {
    accessFilter = { canViewManager: true };
  } else if (userRole === "EMPLOYEE") {
    accessFilter = { canViewEmployee: true };
  }

  const documents = await prisma.document.findMany({
    where: {
      employeeId,
      companyId,
      deletedAt: null,
      ...accessFilter, // ✅ Enforce access rights
    },
    include: {
      uploader: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(documents);
}
