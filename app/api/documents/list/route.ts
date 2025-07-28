import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const userRole = session.user.role;

  // ✅ Fetch user's department & job role (for filtering non-admins)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { departmentId: true, jobRoleId: true },
  });

  // ✅ ADMIN BYPASS LOGIC
  const documents = await prisma.document.findMany({
    where:
      userRole === "ADMIN"
        ? {
            companyId: session.user.companyId, // Admin sees everything for their company
            ...(employeeId ? { employeeId } : {}),
          }
        : {
            companyId: session.user.companyId,
            ...(employeeId ? { employeeId } : { employeeId: null }),
            OR: [
              { canViewAdmin: true }, // Admin-flagged docs visible
              { canViewManager: userRole === "MANAGER" ? true : undefined },
              { canViewEmployee: userRole === "EMPLOYEE" ? true : undefined },
              { departments: { some: { id: user?.departmentId || "" } } },
              { jobRoles: { some: { id: user?.jobRoleId || "" } } },
              { departments: { none: {} }, jobRoles: { none: {} } }, // Docs with no restriction
            ],
          },
    include: {
      uploader: { select: { name: true, email: true } },
      departments: { select: { id: true, name: true } },
      jobRoles: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
