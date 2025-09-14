import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  // Fetch current user to evaluate department/job role restrictions
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, departmentId: true, jobRoleId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Locate document by path and company
  const document = await prisma.document.findFirst({
    where: { path, companyId: session.user.companyId },
    include: {
      departments: { select: { id: true } },
      jobRoles: { select: { id: true } },
    },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Role-based access flags
  let allowed = false;
  if (user.role === "ADMIN") allowed = document.canViewAdmin;
  else if (user.role === "MANAGER") allowed = document.canViewManager;
  else allowed = document.canViewEmployee;

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Department and job role restrictions
  const unrestricted =
    document.departments.length === 0 && document.jobRoles.length === 0;
  const departmentMatch = user.departmentId
    ? document.departments.some((d) => d.id === user.departmentId)
    : false;
  const jobRoleMatch = user.jobRoleId
    ? document.jobRoles.some((j) => j.id === user.jobRoleId)
    : false;

  if (!unrestricted && !departmentMatch && !jobRoleMatch) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.path, 60 * 5); // 5-minute expiry

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data?.signedUrl });
}
