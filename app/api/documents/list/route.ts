import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  // ✅ Determine user role
  const userRole = session.user.role; // Assumes you have session.user.role populated (e.g., "admin" | "manager" | "employee")

  // ✅ Build role-based filter
  let accessFilter = {};
  if (userRole === "admin") {
    accessFilter = { canViewAdmin: true };
  } else if (userRole === "manager") {
    accessFilter = { canViewManager: true };
  } else {
    // Default to employee-level access
    accessFilter = { canViewEmployee: true };
  }

  const documents = await prisma.document.findMany({
    where: {
      companyId: session.user.companyId,
      ...(employeeId
        ? { employeeId }
        : { employeeId: null }), // If no employeeId, fetch company docs only
      ...accessFilter, // ✅ Enforce access rights
    },
    include: { uploader: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
