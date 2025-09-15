import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { documentId } = await req.json();

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  try {
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
    await supabase.storage.from("documents").remove([doc.path]);

    // Delete DB record (scoped)
    await prisma.document.delete({ where: { id: doc.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete Error:", err);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
