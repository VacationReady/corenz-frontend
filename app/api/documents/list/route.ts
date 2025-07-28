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

  // ✅ Fetch user's department & job role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { departmentId: true, jobRoleId: true },
  });

  // ✅ Base filter for company and (optional) employee scope
  const baseFilter = {
    companyId: session.user.companyId,
    ...(employeeId ? { employeeId } : { employeeId: null }),
  };

  // ✅ Admin bypass: sees everything
  const documents = await prisma.document.findMany({
    where:
      userRole === "ADMIN"
        ? baseFilter
        : {
            ...baseFilter,
            OR: [
              { canViewAdmin: true },
              userRole === "MANAGER" ? { canViewManager: true } : undefined,
              userRole === "EMPLOYEE" ? { canViewEmployee: true } : undefined,
              { departments: { some: { id: user?.departmentId || "" } } },
              { jobRoles: { some: { id: user?.jobRoleId || "" } } },
              {
                AND: [
                  { departments: { none: {} } },
                  { jobRoles: { none: {} } },
                ],
              }, // unrestricted docs
            ].filter(Boolean),
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
