// /app/api/documents/delete/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth-options";
import prisma from '@/app/lib/prisma';
import supabase from "@/lib/supabase-admin";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { documentId } = await req.json();

  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  try {
    // Fetch doc to get file path
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Delete file from Supabase
    await supabaseAdmin.storage.from('documents').remove([doc.filePath]);

    // Delete DB record (cascade deletes M:N automatically if defined in schema)
    await prisma.document.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete Error:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
