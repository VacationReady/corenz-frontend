import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { z } from "zod";

const documentDownloadSchema = z.object({
  path: z
    .string({ required_error: "path is required" })
    .trim()
    .min(1, "path is required"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  try {
    const { path } = documentDownloadSchema.parse({
      path: searchParams.get("path"),
    });

    // Fetch current user with their employee ID to evaluate access restrictions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        departmentId: true,
        jobRoleId: true,
        Employee: { select: { id: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const viewerEmployeeId = user.Employee?.id;

    // Locate document by path and company
    const document = await prisma.document.findFirst({
      where: { path, companyId: session.user.companyId },
      include: {
        Department: { select: { id: true } },
        JobRole: { select: { id: true } },
        // Include employee info for ownership check and manager verification
        Employee: {
          select: {
            id: true,
            User: { select: { managerId: true } },
          },
        },
      },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // ✅ SECURITY FIX: Check employee-specific document access
    // If document is assigned to a specific employee, enforce ownership/manager access
    if (document.employeeId) {
      const isOwner = viewerEmployeeId === document.employeeId;
      const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
      
      // For managers, check if the document's employee is a direct report
      const isManagerOfEmployee =
        user.role === "MANAGER" &&
        document.Employee?.User?.managerId === session.user.id;

      if (!isOwner && !isAdmin && !isManagerOfEmployee) {
        // User is trying to access another employee's document without authorization
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const companyPrefix = `${session.user.companyId}/`;
    const normalizedPath = document.path.replace(/\\/g, "/");
    let storagePath = normalizedPath;

    const hasTraversal = normalizedPath
      .split("/")
      .some((segment) => segment === "..");

    if (hasTraversal) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isPrefixed = normalizedPath.startsWith(companyPrefix);
    if (!isPrefixed) {
      // Legacy documents may not have been stored with a company prefix. To avoid
      // cross-tenant reuse of a shared path, block access if any other company
      // references the same storage key.
      const otherCompanyReference = await prisma.document.findFirst({
        where: {
          path: normalizedPath,
          companyId: { not: session.user.companyId },
        },
        select: { id: true },
      });

      if (otherCompanyReference) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      storagePath = document.path;
    }

    // Role-based access flags
    // Admins should see ALL documents (bypass role filtering)
    // Managers should only see documents where canViewManager is true
    // Employees should only see documents where canViewEmployee is true
    let allowed = false;
    if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      // Admins bypass role filtering - they can access all documents
      allowed = true;
    } else if (user.role === "MANAGER") {
      // Managers only access documents explicitly marked for managers
      allowed = document.canViewManager;
    } else {
      // Employees only access documents explicitly marked for employees
      allowed = document.canViewEmployee;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Department and job role restrictions
    const unrestricted =
      document.Department.length === 0 && document.JobRole.length === 0;
    const departmentMatch = user.departmentId
      ? document.Department.some((d) => d.id === user.departmentId)
      : false;
    const jobRoleMatch = user.jobRoleId
      ? document.JobRole.some((j) => j.id === user.jobRoleId)
      : false;

    if (!unrestricted && !departmentMatch && !jobRoleMatch) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 5); // 5-minute expiry

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: data?.signedUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("Error generating document download link:", error);
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 },
    );
  }
}

