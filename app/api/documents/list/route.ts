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

  // ✅ Build OR conditions for MANAGER/EMPLOYEE
  const orConditions: Prisma.DocumentWhereInput[] = [
    { canViewAdmin: true },
    ...(userRole === "MANAGER" ? [{ canViewManager: true }] : []),
    ...(userRole === "EMPLOYEE" ? [{ canViewEmployee: true }] : []),
    { departments: { some: { id: user?.departmentId || "" } } },
    { jobRoles: { some: { id: user?.jobRoleId || "" } } },
    { AND: [{ departments: { none: {} } }, { jobRoles: { none: {} } }] }, // unrestricted docs
  ];

  const documents = await prisma.document.findMany({
    where: {
      ...baseFilter,
      OR: orConditions,
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
