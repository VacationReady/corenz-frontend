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
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ signed: false, eligible: false });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, companyId: session.user.companyId },
      select: { id: true, departmentId: true, jobRoleId: true },
    });
    if (!employee) return NextResponse.json({ signed: false, eligible: false });

    const artifact = await prisma.documentSignatureArtifact.findUnique({
      where: {
        documentId_employeeId: { documentId: id, employeeId: employee.id },
      },
    });
    // Determine eligibility (mirror sign route logic)
    const document = await prisma.document.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        Employee: true,
        Department: { select: { id: true } },
        JobRole: { select: { id: true } },
        SignatureDepartments: true,
        SignatureJobRoles: true,
        SignatureEmployees: true,
      },
    });

    let eligible = false;
    if (document?.requiresSignature) {
      if (document.employeeId) {
        eligible = document.employeeId === employee.id;
      } else {
        const explicitEmpIds = new Set(
          (document.SignatureEmployees || []).map((s) => s.employeeId),
        );
        const deptIds = new Set((document.SignatureDepartments || []).map((d) => d.departmentId));
        const roleIds = new Set((document.SignatureJobRoles || []).map((r) => r.jobRoleId));
        const hasAnyTarget = explicitEmpIds.size > 0 || deptIds.size > 0 || roleIds.size > 0;
        if (explicitEmpIds.has(employee.id)) eligible = true;
        if (employee.departmentId && deptIds.has(employee.departmentId)) eligible = true;
        if (employee.jobRoleId && roleIds.has(employee.jobRoleId)) eligible = true;
        if (!hasAnyTarget) eligible = true;
      }
      if (!eligible) {
        const assignedField = await prisma.documentSignatureField.findFirst({
          where: { documentId: id, assignedEmployeeId: employee.id },
          select: { id: true },
        });
        if (assignedField) eligible = true;
      }
    }

    if (!artifact) return NextResponse.json({ signed: false, eligible });

    let artifactUrl: string | null = null;
    if (artifact.artifactPath) {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(artifact.artifactPath, 60 * 5);
      artifactUrl = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      signed: true,
      eligible,
      method: artifact.method,
      typedText: artifact.typedText,
      artifactUrl,
      signedAt: artifact.signedAt,
    });
  } catch (e) {
    console.error("Sign check error:", e);
    return NextResponse.json({ signed: false, eligible: false });
  }
}


