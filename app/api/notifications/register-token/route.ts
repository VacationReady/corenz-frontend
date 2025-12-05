import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const registerTokenSchema = z.object({
  token: z.string(),
  deviceId: z.string(),
  platform: z.enum(['ios', 'android']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = registerTokenSchema.parse(body);

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Upsert push notification token
    const pushToken = await prisma.pushNotificationToken.upsert({
      where: {
        employeeId_deviceId: {
          employeeId: employee.id,
          deviceId: data.deviceId,
        },
      },
      update: {
        token: data.token,
        platform: data.platform,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        employeeId: employee.id,
        token: data.token,
        deviceId: data.deviceId,
        platform: data.platform,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      token: pushToken,
      message: 'Push notification token registered successfully',
    });
  } catch (error) {
    console.error('Register token error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to register push notification token' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Deactivate the token instead of deleting
    await prisma.pushNotificationToken.updateMany({
      where: {
        employeeId: employee.id,
        deviceId: deviceId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Push notification token unregistered successfully',
    });
  } catch (error) {
    console.error('Unregister token error:', error);
    return NextResponse.json({ error: 'Failed to unregister push notification token' }, { status: 500 });
  }
}
