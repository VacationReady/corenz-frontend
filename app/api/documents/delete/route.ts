import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { z } from "zod";

const documentDeleteSchema = z.object({
  documentId: z
    .string({ required_error: "documentId is required" })
    .trim()
    .min(1, "documentId is required"),
});

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { documentId } = documentDeleteSchema.parse(await req.json());

    // Fetch doc to get file path and enforce company scoping
    const doc = await prisma.document.findFirst({
      where: { id: documentId, companyId: session.user.companyId },
    });
    if (!doc)
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );

    // Delete file from Supabase using `path`
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.path]);
    if (storageError) {
      console.error("Supabase remove error:", storageError);
      return NextResponse.json(
        { error: "Failed to delete document file" },
        { status: 500 },
      );
    }

    // Delete DB record (scoped)
    await prisma.document.delete({ where: { id: doc.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete Error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}

