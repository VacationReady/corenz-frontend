import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const {
    documentId,
    canViewAdmin,
    canViewManager,
    canViewEmployee,
    departmentIds,
    jobRoleIds,
    requiresAck,
    requiresSignature,
    signatureDueAt,
    signerDepartments,
    signerJobRoles,
  } = await req.json();

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  try {
    // Update access flags, requiresAck, and reset department/job role M:N relations
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        canViewAdmin,
        canViewManager,
        canViewEmployee,
        requiresAck: requiresAck ?? false, // ✅ NEW: Toggle for acknowledgement
        requiresSignature: requiresSignature ?? false,
        signatureDueAt: signatureDueAt ?? null,
        Department: {
          set: departmentIds?.map((id: string) => ({ id })) || [], // Clear if empty
        },
        JobRole: {
          set: jobRoleIds?.map((id: string) => ({ id })) || [], // Clear if empty
        },
      },
      include: {
        Department: true,
        JobRole: true,
      },
    });

    // Update signature targets if requiresSignature set
    if (requiresSignature) {
      // Clear existing targets for this doc, then re-insert
      await prisma.documentSignatureDepartment.deleteMany({ where: { documentId } });
      await prisma.documentSignatureJobRole.deleteMany({ where: { documentId } });

      if (Array.isArray(signerDepartments) && signerDepartments.length > 0) {
        await prisma.documentSignatureDepartment.createMany({
          data: signerDepartments.map((deptId: string) => ({ documentId, departmentId: deptId })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(signerJobRoles) && signerJobRoles.length > 0) {
        await prisma.documentSignatureJobRole.createMany({
          data: signerJobRoles.map((roleId: string) => ({ documentId, jobRoleId: roleId })),
          skipDuplicates: true,
        });
      }

      // Queue Resend emails to all targeted employees (only when explicitly re-enabled via access update)
      const document = await prisma.document.findUnique({ where: { id: documentId } });
      if (document) {
        const departmentIds = signerDepartments || [];
        const jobRoleIds = signerJobRoles || [];

        let employees: { id: string; userId: string | null }[] = [];
        if (departmentIds.length === 0 && jobRoleIds.length === 0) {
          employees = await prisma.employee.findMany({
            where: { isActive: true, User: { companyId: document.companyId } },
            select: { id: true, userId: true },
          });
        } else {
          employees = await prisma.employee.findMany({
            where: {
              isActive: true,
              User: { companyId: document.companyId },
              OR: [
                departmentIds.length > 0 ? { departmentId: { in: departmentIds } } : undefined,
                jobRoleIds.length > 0 ? { jobRoleId: { in: jobRoleIds } } : undefined,
              ].filter(Boolean) as any,
            },
            select: { id: true, userId: true },
          });
        }

        const users = await prisma.user.findMany({
          where: { id: { in: employees.map((e) => e.userId!).filter(Boolean) as string[] }, companyId: document.companyId },
          select: { id: true, email: true, name: true },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
        const docLink = document.employeeId
          ? `${baseUrl}/employees/${document.employeeId}/documents`
          : `${baseUrl}/documents`;

        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
          const chunk = users.slice(i, i + chunkSize);
          // fire-and-forget
          // eslint-disable-next-line no-await-in-loop
          await Promise.all(
            chunk.map(async (user) => {
              try {
                const resendRes = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "noreply@peoplecore.co.nz",
                    to: user.email,
                    subject: "Document Requires Your Signature",
                    html: `
                      <p>Hi ${user.name || "there"},</p>
                      <p>The document <b>${document.name}</b> requires your signature.</p>
                      <p><a href="${docLink}">Open Document</a></p>
                    `,
                  }),
                });
                await resendRes.json();
              } catch (err) {
                console.error("Resend error (signature notify):", err);
              }
            }),
          );
        }
      }
    }

    return NextResponse.json(updatedDoc);
  } catch (err) {
    console.error("Update Access Error:", err);
    return NextResponse.json(
      { error: "Failed to update document access" },
      { status: 500 },
    );
  }
}

