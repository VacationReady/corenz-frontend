import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Fetch the document, including departments & jobRoles, scoped by company
    const doc = await prisma.document.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        Department: true,
        JobRole: true,
        Employee: { include: { User: true } }, // for employee-specific docs
        SignatureArtifacts: {
          include: { Employee: { include: { User: true } } },
        },
        SignatureEmployees: true,
        SignatureDepartments: true,
        SignatureJobRoles: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // ✅ Handle company-level documents (no employee link)
    if (!doc.Employee) {
      const deptIds = doc.Department.map((d: any) => d.id);
      const jobRoleIds = doc.JobRole.map((jr: any) => jr.id);

      // ✅ Fetch all employees in scope (filtered by dept/role if present)
      const employeesInScope = await prisma.employee.findMany({
        where: {
          User: { companyId: session.user.companyId },
          ...(deptIds.length > 0 ? { departmentId: { in: deptIds } } : {}),
          ...(jobRoleIds.length > 0
            ? { User: { jobRoleId: { in: jobRoleIds } } }
            : {}),
        },
        include: {
          User: { include: { JobRole: true } },
          Department: true,
        },
      });

      // ✅ Fetch acknowledgements for this document
      const acknowledgements = await prisma.documentAcknowledgement.findMany({
        where: { documentId: doc.id },
        include: {
          Employee: {
            include: {
              User: { include: { JobRole: true } },
              Department: true,
            },
          },
        },
        orderBy: { acknowledgedAt: "desc" },
      });

      // ✅ Split acknowledged vs pending
      const acknowledgedIds = acknowledgements.map((ack: any) => ack.employeeId);
      // Note: Prisma include returns PascalCase relation properties (Employee, User, Department, JobRole)
      const acknowledged = acknowledgements.map((ack: any) => ({
        name: ack.Employee.User.name,
        email: ack.Employee.User.email,
        department: ack.Employee.Department?.name || "—",
        jobRole: ack.Employee.User.JobRole?.name || "—",
        acknowledgedAt: ack.acknowledgedAt,
      }));

      const pending = employeesInScope
        .filter((emp) => !acknowledgedIds.includes(emp.id))
        .map((emp) => ({
          name: emp.User.name,
          email: emp.User.email,
          department: emp.Department?.name || "—",
          jobRole: emp.User.JobRole?.name || "—",
        }));

      // Signature metrics for admin review modal
      let signature = null as any;
      if (doc.requiresSignature) {
        const artifacts = doc.SignatureArtifacts || [];
        const explicitEmpIds = new Set(doc.SignatureEmployees.map((e) => e.employeeId));
        const signedEmpIds = new Set(artifacts.map((a) => a.employeeId));
        const outstandingEmployeeIds = [...explicitEmpIds].filter((id) => !signedEmpIds.has(id));
        signature = {
          completed: artifacts.length,
          outstanding: outstandingEmployeeIds.length,
        };
      }

      return NextResponse.json({ acknowledged, pending, signature });
    }

    // ✅ Handle employee-specific documents
    const ack = await prisma.documentAcknowledgement.findFirst({
      where: { documentId: doc.id, employeeId: doc.Employee.id },
    });

    // Include signature info for employee-specific document
    let mySignature: any = null;
    if (doc.requiresSignature) {
      const art = await prisma.documentSignatureArtifact.findUnique({
        where: {
          documentId_employeeId: { documentId: doc.id, employeeId: doc.Employee.id },
        },
      });
      mySignature = art
        ? { signedAt: art.signedAt, method: art.method, hasArtifact: !!art.artifactPath }
        : null;
    }

    return NextResponse.json({
      employee: {
        name: doc.Employee.User.name,
        email: doc.Employee.User.email,
      },
      acknowledged: !!ack,
      acknowledgedAt: ack?.acknowledgedAt || null,
      requiresSignature: doc.requiresSignature,
      signatureDueAt: doc.signatureDueAt,
      mySignature,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
