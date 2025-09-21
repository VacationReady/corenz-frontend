import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fields = await prisma.documentSignatureField.findMany({
    where: { documentId: params.documentId },
    orderBy: { pageNumber: "asc" },
  });
  return NextResponse.json(fields);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const items = Array.isArray(body) ? body : [body];

  const created = await prisma.$transaction(
    items.map((f: any) =>
      prisma.documentSignatureField.create({
        data: {
          id: crypto.randomUUID(),
          documentId: params.documentId,
          pageNumber: f.pageNumber ?? 1,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          label: f.label ?? null,
          required: f.required ?? true,
          assignedEmployeeId: f.assignedEmployeeId ?? null,
          assignedDepartmentId: f.assignedDepartmentId ?? null,
          assignedJobRoleId: f.assignedJobRoleId ?? null,
        },
      }),
    ),
  );

  // After placement, automatically notify targeted signers if the document requires signatures
  try {
    const document = await prisma.document.findFirst({
      where: { id: params.documentId, companyId: session.user.companyId },
      include: {
        SignatureEmployees: true,
        SignatureDepartments: true,
        SignatureJobRoles: true,
      },
    });

    if (document?.requiresSignature) {
      // Build target employee list
      const explicitEmpIds = new Set((document.SignatureEmployees || []).map((e) => e.employeeId));
      if (document.employeeId) explicitEmpIds.add(document.employeeId);
      const deptIds = (document.SignatureDepartments || []).map((d) => d.departmentId);
      const roleIds = (document.SignatureJobRoles || []).map((r) => r.jobRoleId);

      let employees: { id: string; userId: string | null }[] = [];
      if (deptIds.length === 0 && roleIds.length === 0 && explicitEmpIds.size === 0) {
        // If no scopes defined, default to all active employees in company
        employees = await prisma.employee.findMany({
          where: { isActive: true, User: { companyId: document.companyId } },
          select: { id: true, userId: true },
        });
      } else {
        const scoped = await prisma.employee.findMany({
          where: {
            isActive: true,
            User: { companyId: document.companyId },
            OR: [
              deptIds.length > 0 ? { departmentId: { in: deptIds } } : undefined,
              roleIds.length > 0 ? { jobRoleId: { in: roleIds } } : undefined,
            ].filter(Boolean) as any,
          },
          select: { id: true, userId: true },
        });
        const seen = new Set<string>();
        for (const s of scoped) { seen.add(s.id); employees.push(s); }
        if (explicitEmpIds.size > 0) {
          const explicit = await prisma.employee.findMany({
            where: { id: { in: Array.from(explicitEmpIds) } },
            select: { id: true, userId: true },
          });
          for (const e of explicit) if (!seen.has(e.id)) employees.push(e);
        }
      }

      const users = await prisma.user.findMany({
        where: {
          id: { in: employees.map((e) => e.userId!).filter(Boolean) as string[] },
          companyId: document.companyId,
        },
        select: { id: true, email: true, name: true },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
      const link = document.employeeId
        ? `${baseUrl}/employees/${document.employeeId}/documents?open=${document.id}`
        : `${baseUrl}/documents?open=${document.id}`;

      const chunkSize = 50;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(
          chunk.map(async (u) => {
            try {
              const resp = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "noreply@peoplecore.co.nz",
                  to: u.email,
                  subject: "Document Requires Your Signature",
                  html: `
                    <p>Hi ${u.name || "there"},</p>
                    <p>The document <b>${document.name}</b> requires your signature.</p>
                    ${document.signatureDueAt ? `<p>Due by: <b>${new Date(document.signatureDueAt).toLocaleString()}</b></p>` : ""}
                    <p><a href="${link}">Open Document</a></p>
                  `,
                }),
              });
              await resp.json();
            } catch (err) {
              console.error("Resend (placement notify) error:", err);
            }
          }),
        );
      }
    }
  } catch (err) {
    console.error("Notify after placement error:", err);
  }

  return NextResponse.json(created, { status: 201 });
}


