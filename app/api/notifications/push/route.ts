import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendPushNotifications } from '@/lib/push-notifications';

const sendPushSchema = z.object({
  employeeIds: z.array(z.string()),
  title: z.string(),
  body: z.string(),
  data: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = sendPushSchema.parse(body);

    // Verify user has permission to send notifications
    // This should be restricted to managers/admins
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        User: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Only allow MANAGER or ADMIN to send push notifications
    if (employee.User.role !== 'MANAGER' && employee.User.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions to send push notifications' },
        { status: 403 }
      );
    }

    // Get push tokens for the specified employees
    const pushTokens = await prisma.pushNotificationToken.findMany({
      where: {
        employeeId: {
          in: data.employeeIds,
        },
        isActive: true,
        employee: {
          companyId: employee.companyId, // Ensure employees are in the same company
        },
      },
      select: {
        token: true,
        employeeId: true,
        platform: true,
      },
    });

    if (pushTokens.length === 0) {
      return NextResponse.json(
        { error: 'No active push tokens found for the specified employees' },
        { status: 404 }
      );
    }

    // Send push notifications
    const result = await sendPushNotifications({
      tokens: pushTokens.map((t) => t.token),
      title: data.title,
      body: data.body,
      data: data.data,
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      message: `Push notifications sent to ${result.sent} device(s)`,
    });
  } catch (error) {
    console.error('Send push notification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to send push notifications' }, { status: 500 });
  }
}
