/**
 * Reconciliation Stats API
 * 
 * GET /api/reconciliation/stats
 * Returns reconciliation statistics for a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { getMobileSession } from '@/lib/mobile-session';
import { prisma } from '@/lib/prisma';
import { getReconciliationStats } from '@/lib/time-tracking/shift-matcher';
import { parseISO, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    // Support both web and mobile sessions
    let session = await auth();
    if (!session?.user?.id) {
      session = await getMobileSession(req);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        User: { select: { role: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const isAdmin = employee.User.role === 'ADMIN' || employee.User.role === 'SUPER_ADMIN';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can access reconciliation stats' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week'; // week, month, custom
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;

    // Calculate date range
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (period === 'custom' && startDateParam && endDateParam) {
      startDate = parseISO(startDateParam);
      endDate = parseISO(endDateParam);
      
      if (!isValid(startDate) || !isValid(endDate)) {
        return NextResponse.json(
          { error: 'Invalid date format for custom period' },
          { status: 400 }
        );
      }
    } else if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      // Default to current week
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    }

    const effectiveDepartmentId = departmentId;

    const stats = await getReconciliationStats(
      employee.companyId,
      startDate,
      endDate,
      {
        departmentId: effectiveDepartmentId,
        employeeId,
      }
    );

    return NextResponse.json({
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      stats,
    });
  } catch (error) {
    console.error('[API] Reconciliation stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation stats' },
      { status: 500 }
    );
  }
}








