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
        SignatureEmployees: true,
        SignatureDepartments: true,
        SignatureJobRoles: true,
        SignatureArtifacts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const withUrls = await Promise.all(
      adminDocs.map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.path, 60 * 5);

        // Signature counts (only if enabled)
        let signatureCompletedCount = 0;
        let signatureTargetCount = 0;
        let signatureOutstandingCount = 0;
        if (doc.requiresSignature) {
          signatureCompletedCount = await prisma.documentSignatureArtifact.count({
            where: { documentId: doc.id },
          });

          if (doc.employeeId) {
            signatureTargetCount = 1;
          } else {
            const explicitEmpIds = new Set(
              (doc.SignatureEmployees || []).map((e) => e.employeeId),
            );
            const deptIds = (doc.SignatureDepartments || []).map((d) => d.departmentId);
            const roleIds = (doc.SignatureJobRoles || []).map((r) => r.jobRoleId);
            const hasAnyTarget =
              explicitEmpIds.size > 0 || deptIds.length > 0 || roleIds.length > 0;

            if (hasAnyTarget) {
              const scopedCount = await prisma.employee.count({
                where: {
                  isActive: true,
                  User: { companyId: session.user.companyId },
                  OR: [
                    deptIds.length > 0 ? { departmentId: { in: deptIds } } : undefined,
                    roleIds.length > 0 ? { jobRoleId: { in: roleIds } } : undefined,
                  ].filter(Boolean) as any,
                },
              });
              signatureTargetCount = scopedCount + explicitEmpIds.size;
            } else {
              signatureTargetCount = await prisma.employee.count({
                where: { isActive: true, User: { companyId: session.user.companyId } },
              });
            }
          }
          signatureOutstandingCount = Math.max(
            signatureTargetCount - signatureCompletedCount,
            0,
          );
        }

        return {
          ...doc,
          url: signed?.signedUrl ?? null,
          requiresAck: doc.requiresAck,
          requiresSignature: doc.requiresSignature,
          signatureDueAt: doc.signatureDueAt,
          signatureCompletedCount,
          signatureTargetCount,
          signatureOutstandingCount,
        } as any;
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
      SignatureEmployees: true,
      SignatureDepartments: true,
      SignatureJobRoles: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const withUrls = await Promise.all(
    documents.map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.path, 60 * 5);
      let signatureCompletedCount = 0;
      let signatureTargetCount = 0;
      let signatureOutstandingCount = 0;
      if (doc.requiresSignature) {
        signatureCompletedCount = await prisma.documentSignatureArtifact.count({
          where: { documentId: doc.id },
        });

        if (doc.employeeId) {
          signatureTargetCount = 1;
        } else {
          const explicitEmpIds = new Set(
            (doc.SignatureEmployees || []).map((e) => e.employeeId),
          );
          const deptIds = (doc.SignatureDepartments || []).map((d) => d.departmentId);
          const roleIds = (doc.SignatureJobRoles || []).map((r) => r.jobRoleId);
          const hasAnyTarget =
            explicitEmpIds.size > 0 || deptIds.length > 0 || roleIds.length > 0;

          if (hasAnyTarget) {
            const scopedCount = await prisma.employee.count({
              where: {
                isActive: true,
                User: { companyId: session.user.companyId },
                OR: [
                  deptIds.length > 0 ? { departmentId: { in: deptIds } } : undefined,
                  roleIds.length > 0 ? { jobRoleId: { in: roleIds } } : undefined,
                ].filter(Boolean) as any,
              },
            });
            signatureTargetCount = scopedCount + explicitEmpIds.size;
          } else {
            signatureTargetCount = await prisma.employee.count({
              where: { isActive: true, User: { companyId: session.user.companyId } },
            });
          }
        }
        signatureOutstandingCount = Math.max(
          signatureTargetCount - signatureCompletedCount,
          0,
        );
      }

      return {
        ...doc,
        url: signed?.signedUrl ?? null,
        requiresAck: doc.requiresAck,
        requiresSignature: doc.requiresSignature,
        signatureDueAt: doc.signatureDueAt,
        signatureCompletedCount,
        signatureTargetCount,
        signatureOutstandingCount,
      } as any;
    }),
  );
  return NextResponse.json(withUrls);
}

