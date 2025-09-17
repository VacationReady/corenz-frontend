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
  const employeeId = formData.get("employeeId") as string;
  const type = formData.get("type") as string;
  const licenceNumber = formData.get("licenceNumber") as string;
  const issueDate = new Date(formData.get("issueDate") as string);
  const expiryDate = new Date(formData.get("expiryDate") as string);
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

  let documentId: string | null = null; // ✅ FIXED TYPING

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
        id: crypto.randomUUID(),
        name: file.name,
        path: data.path,
        size: file.size,
        type: file.type,
        category: "Driver Licence",
        url: publicUrl,
        uploaderId: session.user.id,
        companyId: session.user.companyId,
        employeeId: employeeId,
      },
    });

    documentId = doc.id; // ✅ now valid
  }

  const licence = await prisma.driverLicence.create({
    data: {
      id: crypto.randomUUID(),
      employeeId,
      type,
      licenceNumber,
      issueDate,
      expiryDate,
      documentId,
      updatedAt: new Date(),
    },
  });

  // Build and write audit logs
  try {
    const valueSummary: Record<string, any> = {
      type,
      licenceNumber,
      issueDate,
      expiryDate,
      documentId,
    };
    const diffs = formatDiffsForFormData(valueSummary);
    await createAuditLogs({
      companyId: session.user.companyId!,
      employeeId,
      section: "driver-licenses",
      diffs,
      reasons,
      changedById: session.user.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json(licence);
}

