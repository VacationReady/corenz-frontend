import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

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

  try {
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
        },
      });

      documentId = doc.id;
    }

    const updatedRecord = await prisma.trainingRecord.update({
      where: { id: trainingId },
      data: {
        courseId,
        providerId,
        dateCompleted,
        expiryDate,
        ...(documentId && { documentId }),
      },
    });

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
  try {
    const record = await prisma.trainingRecord.findUnique({
      where: { id: params.id },
      include: { Document: true, Course: true, TrainingProvider: true },
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
