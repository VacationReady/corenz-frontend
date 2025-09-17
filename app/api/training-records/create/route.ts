import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const employeeIdRaw = formData.get("employeeId");
  const employeeId = Array.isArray(employeeIdRaw)
    ? employeeIdRaw[0]
    : (employeeIdRaw ?? "");
  const courseId = formData.get("courseId") as string;
  const providerId = formData.get("providerId") as string;
  const dateCompleted = new Date(formData.get("dateCompleted") as string);
  const expiryDateRaw = formData.get("expiryDate") as string;
  const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null;
  const file = formData.get("file") as File | null;
  const reasonsRaw = formData.get("reasons") as string | null;
  if (!reasonsRaw) {
    return NextResponse.json({ error: "Reasons required" }, { status: 400 });
  }
  let reasons: Record<string, string>;
  try {
    reasons = JSON.parse(reasonsRaw);
  } catch {
    return NextResponse.json({ error: "Invalid reasons payload" }, { status: 400 });
  }

  let documentId: string | null = null;

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer);

    if (error) {
      return NextResponse.json(
        { error: "Supabase upload failed", details: error.message },
        { status: 500 },
      );
    }

    const publicUrl = `https://lzthrdwhziggqfbgogij.supabase.co/storage/v1/object/public/documents/${data.path}`;

    const doc = await prisma.document.create({
      data: {
        id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        path: data.path,
        size: file.size,
        type: file.type,
        category: "Training Certificate",
        url: publicUrl,
        uploaderId: session.user.id,
        companyId: session.user.companyId,
        employeeId: employeeId as string,
      },
    });

    documentId = doc.id;
  }

  const trainingRecord = await prisma.trainingRecord.create({
    data: {
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: employeeId as string,
      courseId,
      providerId,
      dateCompleted,
      expiryDate,
      documentId,
      updatedAt: new Date(),
    },
  });

  // Audit logs
  try {
    const diffs = formatDiffsForFormData({ courseId, providerId, dateCompleted, expiryDate, documentId });
    await createAuditLogs({
      companyId: session.user.companyId!,
      employeeId: employeeId as string,
      section: "training",
      diffs,
      reasons,
      changedById: session.user.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json(trainingRecord);
}

