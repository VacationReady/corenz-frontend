// /app/api/documents/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase-admin';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { randomUUID } from 'crypto';

export const runtime = "nodejs"; // Ensure Node runtime for stability with FormData uploads

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const companyId = session.user.companyId;
  const uploaderId = session.user.id;

  if (!file || !name || !category) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const path = `${companyId}/${randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error(uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // ✅ Retrieve the public URL from Supabase after upload
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
  const fileUrl = urlData.publicUrl;

  // ✅ Create the document record including the URL
  await prisma.document.create({
    data: {
      name,
      category,
      path,
      url: fileUrl, // ✅ Added
      size: file.size,
      type: file.type,
      uploaderId,
      companyId,
    },
  });

  return NextResponse.json({ success: true });
}
