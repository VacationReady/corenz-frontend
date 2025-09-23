export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { randomUUID } from "crypto";
import { computeDiffs, createAuditLogs } from "@/lib/audit-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const typeOfCheck = formData.get("typeOfCheck") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfIssue = formData.get("dateOfIssue") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const file = formData.get("file") as File | null;
  const reasonsRaw = formData.get("reasons") as string | null;
  let reasons: Record<string, string> | undefined = undefined;
  if (reasonsRaw) {
    try {
      reasons = JSON.parse(reasonsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid reasons payload" }, { status: 400 });
    }
  }

  const existing = await prisma.employmentCheck.findUnique({
    where: { id: params.id },
    include: {
      Employee: {
        include: {
          Company: true,
          User: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const companyId = session.user.companyId;
  if (!companyId || existing.Employee?.companyId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let documentUrl: string | undefined = undefined;
  let signedUrl: string | undefined = undefined;

  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, file.stream(), {
        contentType: file.type,
      });
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
    documentUrl = data.path;
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.path, 60 * 5);
    signedUrl = signed?.signedUrl;
  }

  const updated = await prisma.employmentCheck.update({
    where: { id: params.id },
    data: {
      typeOfCheck,
      documentNumber,
      dateOfIssue: new Date(dateOfIssue),
      expiryDate: new Date(expiryDate),
      ...(documentUrl && { documentUrl }),
    },
  });

  if (!signedUrl && updated.documentUrl) {
    const { data: signedExisting } = await supabase.storage
      .from("documents")
      .createSignedUrl(updated.documentUrl, 60 * 5);
    signedUrl = signedExisting?.signedUrl;
  }

  // Audit logs
  try {
    if (existing) {
      const diffs = computeDiffs(
        existing,
        { ...existing, typeOfCheck, documentNumber, dateOfIssue: new Date(dateOfIssue), expiryDate: new Date(expiryDate), ...(documentUrl && { documentUrl }) },
        ["typeOfCheck", "documentNumber", "dateOfIssue", "expiryDate", "documentUrl"] as const,
      );
      if (diffs.some((d) => d.newValue)) {
        if (!reasons) {
          return NextResponse.json({ error: "Reasons required" }, { status: 400 });
        }
        await createAuditLogs({
          companyId: existing.Employee.companyId,
          employeeId: existing.employeeId,
          section: "employment-checks",
          diffs,
          reasons,
          changedById: session.user.id,
        });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json({ ...updated, documentUrl: signedUrl ?? null });
}
