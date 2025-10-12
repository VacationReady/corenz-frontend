import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const uploadPhotoSchema = z.object({
  entryId: z.string(),
  photoType: z.enum(['clockIn', 'clockOut']),
  photoBase64: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = uploadPhotoSchema.parse(body);

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Verify the clock entry belongs to this employee
    const clockEntry = await prisma.clockEntry.findFirst({
      where: {
        id: data.entryId,
        employeeId: employee.id,
      },
    });

    if (!clockEntry) {
      return NextResponse.json(
        { error: 'Clock entry not found or does not belong to you' },
        { status: 404 }
      );
    }

    // In production, upload to cloud storage (S3, Azure Blob, etc.)
    // For now, we'll simulate the upload and return a mock URL
    // You should replace this with actual cloud storage integration
    const photoUrl = await uploadToCloudStorage(data.photoBase64, {
      entryId: data.entryId,
      photoType: data.photoType,
      employeeId: employee.id,
      companyId: employee.companyId,
    });

    // Update the clock entry with the photo URL
    const updateData =
      data.photoType === 'clockIn'
        ? { clockInPhotoUrl: photoUrl }
        : { clockOutPhotoUrl: photoUrl };

    await prisma.clockEntry.update({
      where: { id: data.entryId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      url: photoUrl,
      message: 'Photo uploaded successfully',
    });
  } catch (error) {
    console.error('Photo upload error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}

/**
 * Upload photo to cloud storage
 * Replace this with your actual cloud storage integration (S3, Azure Blob, Cloudinary, etc.)
 */
async function uploadToCloudStorage(
  photoBase64: string,
  metadata: {
    entryId: string;
    photoType: string;
    employeeId: string;
    companyId: string;
  }
): Promise<string> {
  // TODO: Implement actual cloud storage upload
  // Example with AWS S3:
  // const buffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  // const fileName = `time-tracking/${metadata.companyId}/${metadata.employeeId}/${metadata.entryId}_${metadata.photoType}_${Date.now()}.jpg`;
  // await s3.upload({
  //   Bucket: process.env.S3_BUCKET_NAME,
  //   Key: fileName,
  //   Body: buffer,
  //   ContentType: 'image/jpeg',
  // }).promise();
  // return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;

  // For now, return a mock URL
  const timestamp = Date.now();
  return `https://storage.corenz.app/time-tracking/${metadata.companyId}/${metadata.employeeId}/${metadata.entryId}_${metadata.photoType}_${timestamp}.jpg`;
}
