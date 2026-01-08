import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { canAccessEmployee } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ signed: false, eligible: false });
    }

    // Check for optional employeeId query param (for admin/manager viewing another employee's status)
    const { searchParams } = new URL(req.url);
    const targetEmployeeId = searchParams.get("employeeId");

    const currentEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id, companyId: session.user.companyId },
      select: { id: true, departmentId: true, jobRoleId: true },
    });
    if (!currentEmployee) return NextResponse.json({ signed: false, eligible: false });

    // Determine which employee's signature status to check
    let checkEmployee = currentEmployee;
    
    if (targetEmployeeId && targetEmployeeId !== currentEmployee.id) {
      // Verify the requesting user has permission to access the target employee's data
      const canAccess = await canAccessEmployee(
        {
          id: session.user.id,
          role: session.user.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN",
          companyId: session.user.companyId,
        },
        targetEmployeeId
      );
      
      if (!canAccess) {
        // User doesn't have permission to view this employee's signature status
        // Return current user's status to avoid information disclosure
        checkEmployee = currentEmployee;
      } else {
        // Fetch the target employee's details for eligibility check
        const targetEmployee = await prisma.employee.findFirst({
          where: {
            id: targetEmployeeId,
            companyId: session.user.companyId,
          },
          select: { id: true, departmentId: true, jobRoleId: true },
        });
        
        if (targetEmployee) {
          checkEmployee = targetEmployee;
        }
      }
    }

    const artifact = await prisma.documentSignatureArtifact.findUnique({
      where: {
        documentId_employeeId: { documentId: id, employeeId: checkEmployee.id },
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
        eligible = document.employeeId === checkEmployee.id;
      } else {
        const explicitEmpIds = new Set(
          (document.SignatureEmployees || []).map((s) => s.employeeId),
        );
        const deptIds = new Set((document.SignatureDepartments || []).map((d) => d.departmentId));
        const roleIds = new Set((document.SignatureJobRoles || []).map((r) => r.jobRoleId));
        const hasAnyTarget = explicitEmpIds.size > 0 || deptIds.size > 0 || roleIds.size > 0;
        if (explicitEmpIds.has(checkEmployee.id)) eligible = true;
        if (checkEmployee.departmentId && deptIds.has(checkEmployee.departmentId)) eligible = true;
        if (checkEmployee.jobRoleId && roleIds.has(checkEmployee.jobRoleId)) eligible = true;
        if (!hasAnyTarget) eligible = true;
      }
      if (!eligible) {
        const assignedField = await prisma.documentSignatureField.findFirst({
          where: { documentId: id, assignedEmployeeId: checkEmployee.id },
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


