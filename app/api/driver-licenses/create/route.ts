import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import supabase from '@/lib/supabase-admin';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const employeeId = formData.get('employeeId') as string;
  const type = formData.get('type') as string;
  const licenceNumber = formData.get('licenceNumber') as string;
  const issueDate = new Date(formData.get('issueDate') as string);
  const expiryDate = new Date(formData.get('expiryDate') as string);
  const file = formData.get('file') as File | null;

  let documentId = null;

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('documents').upload(fileName, buffer);

    if (error) {
      return NextResponse.json({ error: 'Supabase upload failed' }, { status: 500 });
    }

    const doc = await prisma.document.create({
      data: {
        employeeId,
        fileName: file.name,
        filePath: data.path,
        category: 'Driver Licence',
        uploadedByUserId: session.user.id,
      },
    });

    documentId = doc.id;
  }

  const licence = await prisma.driverLicence.create({
    data: {
      employeeId,
      type,
      licenceNumber,
      issueDate,
      expiryDate,
      documentId,
    },
  });

  return NextResponse.json(licence);
}