import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";

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

  // ✅ Base filter for company and optional employee scope
  const baseFilter = {
    companyId: session.user.companyId,
    ...(employeeId ? { employeeId } : { employeeId: null }),
  };

  // ✅ Admin bypass: sees everything
  if (userRole === "ADMIN") {
    const adminDocs = await prisma.document.findMany({
      where: baseFilter,
      include: {
        uploader: { select: { name: true, email: true } },
        departments: { select: { id: true, name: true } },
        jobRoles: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(adminDocs);
  }

  // ✅ Role-based flag
  const roleFlag =
    userRole === "MANAGER"
      ? { canViewManager: true }
      : { canViewEmployee: true };

  // ✅ Non-admin conditions: must meet roleFlag AND department/job role (or unrestricted)
  const documents = await prisma.document.findMany({
    where: {
      ...baseFilter,
      AND: [
        roleFlag,
        {
          OR: [
            // unrestricted docs (no dept/job restriction)
            { AND: [{ departments: { none: {} } }, { jobRoles: { none: {} } }] },
            // same department
            user?.departmentId
              ? { departments: { some: { id: user.departmentId } } }
              : undefined,
            // same job role
            user?.jobRoleId
              ? { jobRoles: { some: { id: user.jobRoleId } } }
              : undefined,
          ].filter(Boolean),
        },
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
