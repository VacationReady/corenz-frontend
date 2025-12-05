/**
 * API Endpoint: Validate Manual Overtime Entry
 * 
 * POST /api/timesheets/entries/validate-overtime
 * 
 * Validates manual overtime entries before submission
 * Ensures compliance with working pattern hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { validateManualOvertimeEntry } from '@/lib/overtime-validation';

const validateOvertimeSchema = z.object({
  employeeId: z.string(),
  companyId: z.string(),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isOvertime: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateOvertimeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { employeeId, companyId, date, startTime, endTime, isOvertime } = validationResult.data;

    // Validate overtime entry
    const result = await validateManualOvertimeEntry(
      employeeId,
      companyId,
      new Date(date),
      new Date(startTime),
      new Date(endTime),
      isOvertime
    );

    return NextResponse.json({
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      workingHours: result.workingHours,
    });
  } catch (error) {
    console.error('Error validating overtime:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
