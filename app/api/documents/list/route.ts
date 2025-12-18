import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import supabase from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const bootstrap = searchParams.get("bootstrap") === "1";

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

  // ✅ Determine if user can manage documents (edit/delete)
  const canManageDocuments =
    hasPermission(user as any, "documents", "edit") ||
    hasPermission(user as any, "documents", "delete");

  // ✅ Log role and permissions for debugging
  console.log(`[Documents API] User ${session.user.id} - Role: ${user.role}, canManageDocuments: ${canManageDocuments}`);

  // ✅ Admin/Manager bypass for document managers
  if (canManageDocuments) {
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

        // Acknowledgement counts (only if enabled)
        let ackCompletedCount = 0;
        let ackTargetCount = 0;
        let ackOutstandingCount = 0;
        if (doc.requiresAck) {
          ackCompletedCount = await prisma.documentAcknowledgement.count({
            where: { documentId: doc.id },
          });

          if (doc.employeeId) {
            ackTargetCount = 1;
          } else {
            const deptIds = (doc.Department || []).map((d) => d.id);
            const roleIds = (doc.JobRole || []).map((r) => r.id);
            const hasDeptOrRole = deptIds.length > 0 || roleIds.length > 0;

            if (hasDeptOrRole) {
              ackTargetCount = await prisma.employee.count({
                where: {
                  isActive: true,
                  User: { companyId: session.user.companyId },
                  OR: [
                    deptIds.length > 0 ? { departmentId: { in: deptIds } } : undefined,
                    roleIds.length > 0 ? { jobRoleId: { in: roleIds } } : undefined,
                  ].filter(Boolean) as any,
                },
              });
            } else {
              ackTargetCount = await prisma.employee.count({
                where: { isActive: true, User: { companyId: session.user.companyId } },
              });
            }
          }
          ackOutstandingCount = Math.max(ackTargetCount - ackCompletedCount, 0);
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
          ackCompletedCount,
          ackTargetCount,
          ackOutstandingCount,
        } as any;
      }),
    );
    if (!bootstrap) {
      return NextResponse.json(withUrls);
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const employee = employeeId
      ? await prisma.employee.findFirst({
          where: { id: employeeId, companyId: session.user.companyId },
          select: {
            id: true,
            User: { select: { firstName: true, lastName: true, name: true } },
          },
        })
      : null;

    const employeeName = employee
      ? `${employee.User?.firstName || ""} ${employee.User?.lastName || ""}`.trim() ||
        employee.User?.name ||
        "Employee"
      : null;

    return NextResponse.json({
      documents: withUrls,
      viewer: { role: user.role },
      company: { name: company?.name || "" },
      employee: employeeId ? { id: employeeId, name: employeeName } : null,
    });
  }

  // ✅ Role flag - based on actual user role, not edit/delete permissions
  // Managers with read-only access should still see canViewManager documents
  // Only employees should be restricted to canViewEmployee
  const roleFlag =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? { canViewAdmin: true } // Admins see admin-level docs
      : user.role === "MANAGER"
        ? { canViewManager: true } // Managers (even read-only) see manager-level docs
        : { canViewEmployee: true }; // Employees see employee-level docs

  console.log(`[Documents API] RoleFlag for non-manager user: ${JSON.stringify(roleFlag)}`);

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
      SignatureArtifacts: true,
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

      // Acknowledgement counts (only if enabled)
      let ackCompletedCount = 0;
      let ackTargetCount = 0;
      let ackOutstandingCount = 0;
      if (doc.requiresAck) {
        ackCompletedCount = await prisma.documentAcknowledgement.count({
          where: { documentId: doc.id },
        });

        if (doc.employeeId) {
          ackTargetCount = 1;
        } else {
          const deptIds = (doc.Department || []).map((d) => d.id);
          const roleIds = (doc.JobRole || []).map((r) => r.id);
          const hasDeptOrRole = deptIds.length > 0 || roleIds.length > 0;

          if (hasDeptOrRole) {
            ackTargetCount = await prisma.employee.count({
              where: {
                isActive: true,
                User: { companyId: session.user.companyId },
                OR: [
                  deptIds.length > 0 ? { departmentId: { in: deptIds } } : undefined,
                  roleIds.length > 0 ? { jobRoleId: { in: roleIds } } : undefined,
                ].filter(Boolean) as any,
              },
            });
          } else {
            ackTargetCount = await prisma.employee.count({
              where: { isActive: true, User: { companyId: session.user.companyId } },
            });
          }
        }
        ackOutstandingCount = Math.max(ackTargetCount - ackCompletedCount, 0);
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
        ackCompletedCount,
        ackTargetCount,
        ackOutstandingCount,
      } as any;
    }),
  );

  if (!bootstrap) {
    return NextResponse.json(withUrls);
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  });

  const employee = employeeId
    ? await prisma.employee.findFirst({
        where: { id: employeeId, companyId: session.user.companyId },
        select: {
          id: true,
          User: { select: { firstName: true, lastName: true, name: true } },
        },
      })
    : null;

  const employeeName = employee
    ? `${employee.User?.firstName || ""} ${employee.User?.lastName || ""}`.trim() ||
      employee.User?.name ||
      "Employee"
    : null;

  return NextResponse.json({
    documents: withUrls,
    viewer: { role: user.role },
    company: { name: company?.name || "" },
    employee: employeeId ? { id: employeeId, name: employeeName } : null,
  });
}

