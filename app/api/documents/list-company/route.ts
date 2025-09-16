import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  // ✅ Fetch user details for filtering
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { departmentId: true, jobRoleId: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ✅ Build role-based access filter
  let roleFilter: any = {};
  if (user.role === "ADMIN") {
    roleFilter = { canViewAdmin: true };
  } else if (user.role === "MANAGER") {
    roleFilter = { canViewManager: true };
  } else {
    roleFilter = { canViewEmployee: true };
  }

  // ✅ Fetch company documents with access control & department/job role restrictions
  const documents = await prisma.document.findMany({
    where: {
      companyId: session.user.companyId,
      ...(employeeId ? { employeeId } : { employeeId: null }),
      ...roleFilter,
      OR: [
        { Department: { some: { id: user.departmentId || "" } } },
        { JobRole: { some: { id: user.jobRoleId || "" } } },
        { AND: [{ Department: { none: {} } }, { JobRole: { none: {} } }] }, // ✅ Unrestricted (global) docs
      ],
    },
    include: {
      User: true,
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
      return { ...doc, url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json(withUrls);
}

