// /app/api/documents/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase-admin';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-options';
import { randomUUID } from 'crypto';

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

  await prisma.document.create({
    data: {
      name,
      category,
      path,
      size: file.size,
      type: file.type,
      uploaderId: session.user.id,
      companyId,
    },
  });

  return NextResponse.json({ success: true });
}
