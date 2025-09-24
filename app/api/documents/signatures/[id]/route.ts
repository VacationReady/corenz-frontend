import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doc = await prisma.document.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        SignatureArtifacts: {
          include: {
            Employee: { include: { User: true } },
          },
        },
        SignatureEmployees: { include: { Employee: { include: { User: true } } } },
        SignatureDepartments: { include: { Department: true } },
        SignatureJobRoles: { include: { JobRole: true } },
      },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Build signed URLs for artifacts
    const artifacts = await Promise.all(
      doc.SignatureArtifacts.map(async (a) => {
        let url: string | null = null;
        if (a.artifactPath) {
          const { data: signed } = await supabase.storage
            .from("documents")
            .createSignedUrl(a.artifactPath, 60 * 5);
          url = signed?.signedUrl ?? null;
        }
        return {
          id: a.id,
          employeeId: a.employeeId,
          employeeName: a.Employee?.User?.name || null,
          method: a.method,
          typedText: a.typedText,
          artifactUrl: url,
          signedAt: a.signedAt,
          ipAddress: a.ipAddress,
          userAgent: a.userAgent,
        };
      }),
    );

    // Compute outstanding signers if explicit targets configured
    const explicitEmpIds = new Set(doc.SignatureEmployees.map((e) => e.employeeId));
    const signedEmpIds = new Set(doc.SignatureArtifacts.map((a) => a.employeeId));
    const outstandingEmployeeIds = [...explicitEmpIds].filter((id) => !signedEmpIds.has(id));

    return NextResponse.json({
      document: {
        id: doc.id,
        name: doc.name,
        requiresSignature: doc.requiresSignature,
        signatureDueAt: doc.signatureDueAt,
      },
      artifacts,
      targets: {
        employees: doc.SignatureEmployees.map((e) => ({
          employeeId: e.employeeId,
          dueAt: e.dueAt,
        })),
        departments: doc.SignatureDepartments.map((d) => d.departmentId),
        jobRoles: doc.SignatureJobRoles.map((r) => r.jobRoleId),
      },
      outstanding: {
        count: outstandingEmployeeIds.length,
        employeeIds: outstandingEmployeeIds,
      },
    });
  } catch (error) {
    console.error("List signatures error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


