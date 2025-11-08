import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isManualEntryAllowed } from '@/types/time-tracking-settings';

const employeeManualEntrySchema = z.object({
  clockInTime: z.string().datetime(),
  clockOutTime: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = employeeManualEntrySchema.parse(body);

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Check if manual entry is allowed for this company
    const settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: requestingEmployee.companyId },
    });

    // Use type-safe helper function instead of type coercion
    if (!isManualEntryAllowed(settings)) {
      return NextResponse.json(
        { error: 'Manual time entry is not enabled for your organization' },
        { status: 403 }
      );
    }

    // Validate times
    const clockInTime = new Date(data.clockInTime);
    const clockOutTime = new Date(data.clockOutTime);

    if (clockOutTime <= clockInTime) {
      return NextResponse.json(
        { error: 'Clock out time must be after clock in time' },
        { status: 400 }
      );
    }

    // Check if date is not in the future
    const now = new Date();
    if (clockInTime > now || clockOutTime > now) {
      return NextResponse.json(
        { error: 'Cannot add entries for future dates' },
        { status: 400 }
      );
    }

    // Check for overlapping entries
    const overlappingEntry = await prisma.clockEntry.findFirst({
      where: {
        employeeId: requestingEmployee.id,
        OR: [
          {
            // New entry starts during existing entry
            AND: [
              { clockInTime: { lte: clockInTime } },
              {
                OR: [
                  { clockOutTime: { gte: clockInTime } },
                  { clockOutTime: null }, // Active entry
                ],
              },
            ],
          },
          {
            // New entry ends during existing entry
            AND: [
              { clockInTime: { lte: clockOutTime } },
              {
                OR: [
                  { clockOutTime: { gte: clockOutTime } },
                  { clockOutTime: null },
                ],
              },
            ],
          },
          {
            // Existing entry is completely within new entry
            AND: [
              { clockInTime: { gte: clockInTime } },
              { clockInTime: { lte: clockOutTime } },
            ],
          },
        ],
      },
    });

    if (overlappingEntry) {
      return NextResponse.json(
        { error: 'This time entry overlaps with an existing entry' },
        { status: 400 }
      );
    }

    // Create manual clock entry for the employee themselves
    const clockEntry = await prisma.clockEntry.create({
      data: {
        employeeId: requestingEmployee.id,
        companyId: requestingEmployee.companyId,
        clockInTime,
        clockOutTime,
        notes: data.notes,
        status: 'COMPLETED',
      },
    });

    // Log the manual entry creation
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        companyId: requestingEmployee.companyId,
        actorId: session.user.id,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: requestingEmployee.id,
        metadata: {
          type: 'EMPLOYEE_MANUAL_TIME_ENTRY',
          clockEntryId: clockEntry.id,
          clockInTime: clockInTime.toISOString(),
          clockOutTime: clockOutTime.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      clockEntry,
      message: 'Manual time entry created successfully',
    });
  } catch (error) {
    console.error('Employee manual entry error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create manual entry' }, { status: 500 });
  }
}
