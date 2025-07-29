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

  // ✅ Base filter
  const baseFilter = {
    companyId: session.user.companyId,
    ...(employeeId ? { employeeId } : { employeeId: null }),
  };

  // ✅ Admin bypass
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

    // ✅ Include requiresAck explicitly
    return NextResponse.json(
      adminDocs.map((doc) => ({
        ...doc,
        requiresAck: doc.requiresAck,
      }))
    );
  }

  // ✅ Role flag
  const roleFlag =
    userRole === "MANAGER"
      ? { canViewManager: true }
      : { canViewEmployee: true };

  // ✅ Build OR conditions safely
  const orConditions: Prisma.DocumentWhereInput[] = [
    { AND: [{ departments: { none: {} } }, { jobRoles: { none: {} } }] }, // unrestricted
  ];

  if (user?.departmentId) {
    orConditions.push({ departments: { some: { id: user.departmentId } } });
  }
  if (user?.jobRoleId) {
    orConditions.push({ jobRoles: { some: { id: user.jobRoleId } } });
  }

  // ✅ Final query
  const documents = await prisma.document.findMany({
    where: {
      ...baseFilter,
      AND: [
        roleFlag,
        {
          OR: orConditions,
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

  // ✅ Include requiresAck explicitly
  return NextResponse.json(
    documents.map((doc) => ({
      ...doc,
      requiresAck: doc.requiresAck,
    }))
  );
}
