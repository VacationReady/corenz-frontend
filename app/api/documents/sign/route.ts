import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

type SignRequestBody = {
  documentId: string;
  method: "DRAWN" | "TYPED";
  typedText?: string;
  drawnDataUrl?: string; // base64 data URL (image/png)
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SignRequestBody;
    const { documentId, method, typedText, drawnDataUrl } = body;

    if (!documentId || !method) {
      return NextResponse.json(
        { error: "documentId and method are required" },
        { status: 400 },
      );
    }

    if (method === "TYPED" && (!typedText || !typedText.trim())) {
      return NextResponse.json(
        { error: "typedText is required for typed signature" },
        { status: 400 },
      );
    }
    if (method === "DRAWN" && (!drawnDataUrl || !drawnDataUrl.startsWith("data:image"))) {
      return NextResponse.json(
        { error: "drawnDataUrl must be a base64 image data URL" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    const employee = await prisma.employee.findFirst({
      where: { userId, companyId },
      select: { id: true, departmentId: true, jobRoleId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, companyId },
      include: {
        Employee: true,
        Department: { select: { id: true } },
        JobRole: { select: { id: true } },
        SignatureDepartments: true,
        SignatureJobRoles: true,
        SignatureEmployees: true,
      },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (!document.requiresSignature) {
      return NextResponse.json(
        { error: "This document does not require a signature" },
        { status: 400 },
      );
    }

    // Validate eligibility
    let isEligible = false;
    if (document.employeeId) {
      isEligible = document.employeeId === employee.id;
    } else {
      const explicitEmpIds = new Set(
        (document.SignatureEmployees || []).map((s) => s.employeeId),
      );
      const deptIds = new Set((document.SignatureDepartments || []).map((d) => d.departmentId));
      const roleIds = new Set((document.SignatureJobRoles || []).map((r) => r.jobRoleId));

      const hasAnyTarget =
        explicitEmpIds.size > 0 || deptIds.size > 0 || roleIds.size > 0;

      if (explicitEmpIds.has(employee.id)) isEligible = true;
      if (employee.departmentId && deptIds.has(employee.departmentId)) isEligible = true;
      if (employee.jobRoleId && roleIds.has(employee.jobRoleId)) isEligible = true;
      // Fallback: if no explicit targets defined, allow any employee in the company
      if (!hasAnyTarget) isEligible = true;
    }

    // Additionally, allow if the employee is explicitly assigned to any field
    if (!isEligible) {
      const assignedField = await prisma.documentSignatureField.findFirst({
        where: { documentId, assignedEmployeeId: employee.id },
        select: { id: true },
      });
      if (assignedField) isEligible = true;
    }

    if (!isEligible) {
      return NextResponse.json(
        { error: "You are not eligible to sign this document" },
        { status: 403 },
      );
    }

    // If already signed, short-circuit
    const existing = await prisma.documentSignatureArtifact.findUnique({
      where: { documentId_employeeId: { documentId, employeeId: employee.id } },
    });
    if (existing) {
      return NextResponse.json({ message: "Already signed" }, { status: 200 });
    }

    let artifactPath: string | null = null;
    if (method === "DRAWN" && drawnDataUrl) {
      const [meta, base64] = drawnDataUrl.split(",");
      const extension = meta.includes("image/png") ? "png" : "png";
      const buffer = Buffer.from(base64, "base64");
      const fileName = `${companyId}/signatures/${documentId}/${employee.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, buffer, { contentType: "image/png", upsert: false });
      if (uploadError) {
        console.error("Signature upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload signature artifact" },
          { status: 500 },
        );
      }
      artifactPath = fileName;
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    await prisma.documentSignatureArtifact.create({
      data: {
        id: crypto.randomUUID(),
        documentId,
        employeeId: employee.id,
        method: method as any,
        typedText: method === "TYPED" ? (typedText || "") : null,
        artifactPath: artifactPath || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    // Optionally create acknowledgement if required
    if (document.requiresAck) {
      await prisma.documentAcknowledgement.upsert({
        where: {
          documentId_employeeId: { documentId, employeeId: employee.id },
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          documentId,
          employeeId: employee.id,
          acknowledgedAt: new Date(),
        },
      });
    }

    // Create a signed URL for the artifact (if any) for immediate preview
    let artifactUrl: string | null = null;
    if (artifactPath) {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(artifactPath, 60 * 5);
      artifactUrl = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      ok: true,
      documentId,
      signature: {
        method,
        typedText: method === "TYPED" ? typedText : undefined,
        artifactUrl,
        signedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Document sign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


