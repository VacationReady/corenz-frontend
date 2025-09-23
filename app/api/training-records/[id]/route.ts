import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { computeDiffs, createAuditLogs } from "@/lib/audit-helpers";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trainingId = params.id;
  const formData = await req.formData();

  const courseId = formData.get("courseId") as string;
  const providerId = formData.get("providerId") as string;
  const dateCompleted = new Date(formData.get("dateCompleted") as string);
  const expiryDateRaw = formData.get("expiryDate") as string;
  const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null;
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

  try {
    const existing = await prisma.trainingRecord.findFirst({
      where: {
        id: trainingId,
        Employee: { companyId: session.user.companyId! },
      },
      select: {
        id: true,
        employeeId: true,
        courseId: true,
        providerId: true,
        dateCompleted: true,
        expiryDate: true,
        documentId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 },
      );
    }

    let documentId: string | null = null;

    if (file && file.size > 0) {
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
          employeeId: existing.employeeId,
        },
      });

      documentId = doc.id;
    }

    const updateResult = await prisma.trainingRecord.updateMany({
      where: {
        id: trainingId,
        Employee: { companyId: session.user.companyId! },
      },
      data: {
        courseId,
        providerId,
        dateCompleted,
        expiryDate,
        ...(documentId && { documentId }),
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 },
      );
    }

    // Audit logs
    try {
      const diffs = computeDiffs(
        existing,
        {
          ...existing,
          courseId,
          providerId,
          dateCompleted,
          expiryDate,
          documentId: documentId ?? existing.documentId,
        },
        ["courseId", "providerId", "dateCompleted", "expiryDate", "documentId"] as const,
      );
      if (diffs.some((d) => d.newValue)) {
        if (!reasons) {
          return NextResponse.json({ error: "Reasons required" }, { status: 400 });
        }
        await createAuditLogs({
          companyId: session.user.companyId!,
          employeeId: existing.employeeId,
          section: "training",
          diffs,
          reasons,
          changedById: session.user.id,
        });
      }
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const updatedRecord = await prisma.trainingRecord.findFirst({
      where: {
        id: trainingId,
        Employee: { companyId: session.user.companyId! },
      },
      include: { Document: true, Course: true, TrainingProvider: true },
    });

    if (!updatedRecord) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const record = await prisma.trainingRecord.findFirst({
      where: {
        id: params.id,
        Employee: { companyId: session.user.companyId! },
      },
      include: { Document: true, Course: true, TrainingProvider: true },
    });
    if (!record) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
