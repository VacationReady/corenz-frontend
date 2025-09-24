export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type SignRequestBody = {
  documentId: string;
  method: "DRAWN" | "TYPED";
  typedText?: string;
  drawnDataUrl?: string; // base64 data URL (image/png)
  fieldId?: string; // optional: specific field being signed
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SignRequestBody;
    const { documentId, method, typedText, drawnDataUrl, fieldId } = body;

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
        SignatureFields: true,
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

    // If a specific field is provided, validate assignment strictly against that field
    if (fieldId) {
      const field = await prisma.documentSignatureField.findFirst({
        where: { id: fieldId, documentId },
        select: { id: true, assignedEmployeeId: true },
      });
      if (field) {
        if (!field.assignedEmployeeId) {
          // Unassigned field: fall through to broader eligibility checks below
        } else if (field.assignedEmployeeId === employee.id) {
          isEligible = true;
        } else {
          // Field assigned to someone else
          return NextResponse.json(
            { error: "This field is assigned to a different signer" },
            { status: 403 },
          );
        }
      }
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
    let drawnPngBuffer: Buffer | null = null;
    if (method === "DRAWN" && drawnDataUrl) {
      const [meta, base64] = drawnDataUrl.split(",");
      const extension = meta.includes("image/png") ? "png" : "png";
      const buffer = Buffer.from(base64, "base64");
      drawnPngBuffer = buffer;
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

    // Consolidated IP detection
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = (forwardedFor?.split(",")[0]?.trim() || realIp || undefined);
    const userAgent = req.headers.get("user-agent") || undefined;

    const createdArtifact = await prisma.documentSignatureArtifact.create({
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

    // If a drawn signature and a single field target, stamp the PDF visually and upload a new version
    try {
      if (method === "DRAWN") {
        let origArrayBuffer: ArrayBuffer | null = null;
        try {
          const download = await supabase.storage.from("documents").download(document.path);
          const origFile = download.data;
          if (origFile) {
            origArrayBuffer = await origFile.arrayBuffer();
          }
        } catch {}
        if (!origArrayBuffer) {
          try {
            const { data: signed } = await supabase.storage
              .from("documents")
              .createSignedUrl(document.path, 60);
            if (signed?.signedUrl) {
              const resp = await fetch(signed.signedUrl);
              origArrayBuffer = await resp.arrayBuffer();
            }
          } catch {}
        }
        if (origArrayBuffer) {
          const origBytes = origArrayBuffer;
          let pdfDoc: PDFDocument;
          let isPdf = true;
          try {
            pdfDoc = await PDFDocument.load(origBytes);
          } catch {
            isPdf = false;
            pdfDoc = await PDFDocument.create();
            // Try embed original as image background
            try {
              const imgPng = await pdfDoc.embedPng(Buffer.from(origBytes));
              const page = pdfDoc.addPage([imgPng.width, imgPng.height]);
              page.drawImage(imgPng, { x: 0, y: 0, width: imgPng.width, height: imgPng.height });
            } catch {
              const imgJpg = await pdfDoc.embedJpg(Buffer.from(origBytes));
              const page = pdfDoc.addPage([imgJpg.width, imgJpg.height]);
              page.drawImage(imgJpg, { x: 0, y: 0, width: imgJpg.width, height: imgJpg.height });
            }
          }

          const fieldsForEmployeeAll = (document.SignatureFields || []).filter((f) => !f.assignedEmployeeId || f.assignedEmployeeId === employee.id);
          let fieldsForEmployee = fieldId
            ? fieldsForEmployeeAll.filter((f) => f.id === fieldId)
            : fieldsForEmployeeAll;
          // Fallbacks for multi-page docs where fields lack correct page mapping
          const pages = pdfDoc.getPages();
          if (fieldsForEmployee.length === 0) {
            fieldsForEmployee = [
              { pageNumber: pages.length, x: 0.5, y: 0.15, width: 0.25, height: 0.08 } as any,
            ];
          } else if (!fieldId && pages.length > 1 && fieldsForEmployee.every((f: any) => (f.pageNumber ?? 1) === 1)) {
            fieldsForEmployee = fieldsForEmployee.map((f: any) => ({ ...f, pageNumber: pages.length }));
          }

          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          let pngImage = null as any;
          if (drawnPngBuffer) {
            pngImage = await pdfDoc.embedPng(drawnPngBuffer);
          }

          for (const f of fieldsForEmployee) {
            const pageIndex = Math.max(0, Math.min(f.pageNumber - 1, pages.length - 1));
            const page = pages[pageIndex];
            const { width: pw, height: ph } = page.getSize();
            const x = f.x * pw;
            const y = ph - f.y * ph; // PDF coordinate space
            const w = f.width * pw;
            const h = f.height * ph;

            if (pngImage) {
              page.drawImage(pngImage, { x: x - w / 2, y: y - h / 2, width: w, height: h });
            }
            page.drawText(new Date().toLocaleString(), { x: x - w / 2 + 4, y: y - h / 2 + 4, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
          }

          const stampedBytes = await pdfDoc.save();
          const stampedPath = `${companyId}/documents/${documentId}/stamped-${Date.now()}.pdf`;
          const { error: stampedErr } = await supabase.storage
            .from("documents")
            .upload(stampedPath, Buffer.from(stampedBytes), { contentType: "application/pdf" });
          if (!stampedErr) {
            await prisma.document.update({ where: { id: documentId }, data: { path: stampedPath } });
            const { data: signedUrlData } = await supabase.storage.from("documents").createSignedUrl(stampedPath, 60 * 5);
            (document as any).stampedUrl = signedUrlData?.signedUrl;
          }
        }
      }
    } catch (stampErr) {
      console.warn("PDF stamping failed (non-fatal):", stampErr);
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
      stampedUrl: (document as any).stampedUrl || null,
    });
  } catch (error) {
    console.error("Document sign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
