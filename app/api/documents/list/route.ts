import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import supabase from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  // ✅ Fetch user with permission profile, department & job role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      departmentId: true,
      jobRoleId: true,
      PermissionProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ✅ Base filter
  const baseFilter = {
    companyId: session.user.companyId,
    ...(employeeId ? { employeeId } : { employeeId: null }),
  };

  // ✅ Check if user has admin permissions for documents
  const hasAdminAccess = hasPermission(user as any, "documents", "read");
  const hasEditAccess = hasPermission(user as any, "documents", "edit");

  // ✅ Admin bypass - if user has read access to documents
  if (hasAdminAccess) {
    const adminDocs = await prisma.document.findMany({
      where: baseFilter,
      include: {
        User: { select: { name: true, email: true } },
        Department: { select: { id: true, name: true } },
        JobRole: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const withUrls = await Promise.all(
      adminDocs.map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.path, 60 * 5);
        return { ...doc, url: signed?.signedUrl ?? null, requiresAck: doc.requiresAck };
      }),
    );
    return NextResponse.json(withUrls);
  }

  // ✅ Role flag - fallback to basic access if no admin permissions
  const roleFlag = hasEditAccess
    ? { canViewManager: true }
    : { canViewEmployee: true };

  // ✅ Build OR conditions safely
  const orConditions: Prisma.DocumentWhereInput[] = [
    { AND: [{ Department: { none: {} } }, { JobRole: { none: {} } }] }, // unrestricted
  ];

  if (user?.departmentId) {
    orConditions.push({ Department: { some: { id: user.departmentId } } });
  }
  if (user?.jobRoleId) {
    orConditions.push({ JobRole: { some: { id: user.jobRoleId } } });
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
      User: { select: { name: true, email: true } },
      Department: { select: { id: true, name: true } },
      JobRole: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    documents.map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.path, 60 * 5);
      return { ...doc, url: signed?.signedUrl ?? null, requiresAck: doc.requiresAck };
    }),
  );
  return NextResponse.json(withUrls);
}
