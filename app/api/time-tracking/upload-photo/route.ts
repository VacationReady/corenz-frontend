import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { uploadClockPhoto } from '@/lib/storage/clock-photos';

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

    // Upload to Supabase storage with tenant isolation and 6-year retention
    let photoUrl: string;
    try {
      const uploadResult = await uploadClockPhoto(data.photoBase64, {
        entryId: data.entryId,
        photoType: data.photoType,
        employeeId: employee.id,
        companyId: employee.companyId,
      });
      photoUrl = uploadResult.url;
      
      console.log(`[upload-photo] Successfully uploaded photo for entry ${data.entryId} (${data.photoType})`);
    } catch (uploadError) {
      console.error('[upload-photo] Upload to Supabase failed:', uploadError);
      return NextResponse.json(
        { 
          error: 'Failed to upload photo to storage',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

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

