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

  const userRole = session.user.role; // ADMIN | MANAGER | EMPLOYEE

  // ✅ Role-based filter
  let roleFilter: any = {};
  if (userRole === "ADMIN") roleFilter = { canViewAdmin: true };
  else if (userRole === "MANAGER") roleFilter = { canViewManager: true };
  else roleFilter = { canViewEmployee: true };

  // ✅ Fetch user department & job role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { departmentId: true, jobRoleId: true },
  });

  const documents = await prisma.document.findMany({
    where: {
      companyId: session.user.companyId,
      ...(employeeId ? { employeeId } : { employeeId: null }),
      ...roleFilter,
      OR: [
        { departments: { none: {} }, jobRoles: { none: {} } }, // Global docs
        { departments: { some: { id: user?.departmentId || "" } } },
        { jobRoles: { some: { id: user?.jobRoleId || "" } } },
      ],
    },
    include: {
      uploader: true,
      departments: true,
      jobRoles: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
