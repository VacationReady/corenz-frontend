import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { calculateShiftCost } from '@/lib/timesheet-calculations';

const shiftInclude = {
  Template: true,
  Employee: {
    include: {
      User: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },
      Department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  Location: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ShiftInclude;

type ShiftWithRelations = Prisma.ShiftGetPayload<{ include: typeof shiftInclude }>;

const createShiftSchema = z.object({
  employeeId: z.string().optional(),
  templateId: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  breakDuration: z.number().default(0),
  notes: z.string().optional(),
  role: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  requiresConfirmation: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const employeeId = searchParams.get('employeeId');
    const isPublished = searchParams.get('isPublished');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    const page = Math.max(1, Number.parseInt(pageParam || '1', 10));
    const pageSize = Math.min(
      Math.max(10, Number.parseInt(pageSizeParam || '50', 10)),
      200
    );
    const skip = (page - 1) * pageSize;

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
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

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);

    // Build where clause
    const where: any = {
      companyId: requestingEmployee.companyId,
    };

    // Regular employees can only see their own published shifts
    if (!isAdminOrManager) {
      where.employeeId = requestingEmployee.id;
      where.isPublished = true;
    } else {
      if (employeeId) {
        where.employeeId = employeeId;
      }
      if (departmentId) {
        where.departmentId = departmentId;
      }
      if (isPublished !== null) {
        where.isPublished = isPublished === 'true';
      }
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [shifts, totalCount, companySettings] = await prisma.$transaction([
      prisma.shift.findMany({
        where,
        include: shiftInclude,
        orderBy: [
          { startTime: 'asc' },
          { id: 'asc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.shift.count({ where }),
      prisma.timeTrackingSettings.findUnique({
        where: { companyId: requestingEmployee.companyId },
      }),
    ]);

    const overtimeThreshold = companySettings?.overtimeThreshold
      ? Number(companySettings.overtimeThreshold)
      : 40;

    const filters: Prisma.Sql[] = [
      Prisma.sql`"companyId" = ${requestingEmployee.companyId}`,
    ];

    if (startDate && endDate) {
      filters.push(
        Prisma.sql`"startTime" BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}`
      );
    }
    if (where.employeeId) {
      filters.push(Prisma.sql`"employeeId" = ${where.employeeId}`);
    }
    if (where.departmentId) {
      filters.push(Prisma.sql`"departmentId" = ${where.departmentId}`);
    }
    if (where.isPublished !== undefined) {
      filters.push(Prisma.sql`"isPublished" = ${where.isPublished}`);
    }

    const whereClause = filters.length
      ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
      : Prisma.sql``;

    const [summaryRow] = await prisma.$queryRaw<
      Array<{
        scheduledhours: number;
        overtimehours: number;
        publishedcount: bigint;
        unpublishedcount: bigint;
        totalcost: number;
      }>
    >(
      Prisma.sql`
        WITH base AS (
          SELECT
            "id",
            "isPublished",
            GREATEST(
              EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 3600 - ("breakDuration"::numeric / 60),
              0
            ) AS hours,
            COALESCE("cost"::numeric, 0) AS cost
          FROM "Shift"
          ${whereClause}
        )
        SELECT
          COALESCE(SUM(hours), 0) AS scheduledhours,
          COALESCE(SUM(GREATEST(hours - ${overtimeThreshold}, 0)), 0) AS overtimehours,
          COALESCE(SUM(CASE WHEN "isPublished" THEN 1 ELSE 0 END), 0) AS publishedcount,
          COALESCE(SUM(CASE WHEN "isPublished" THEN 0 ELSE 1 END), 0) AS unpublishedcount,
          COALESCE(SUM(cost), 0) AS totalcost
        FROM base;
      `
    );

    const departmentBreakdownRaw = await prisma.$queryRaw<
      Array<{
        departmentid: string | null;
        hours: number;
        cost: number;
        employeecount: bigint;
        shiftcount: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          "departmentId" AS departmentid,
          COALESCE(SUM(
            GREATEST(
              EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 3600 - ("breakDuration"::numeric / 60),
              0
            )
          ), 0) AS hours,
          COALESCE(SUM("cost"::numeric), 0) AS cost,
          COUNT(DISTINCT "employeeId") AS employeecount,
          COUNT(*) AS shiftcount
        FROM "Shift"
        ${whereClause}
        GROUP BY "departmentId"
      `
    );

    const rawShifts = shifts as ShiftWithRelations[];
    const shiftDepartmentIds = rawShifts
      .map(shift => shift.departmentId)
      .filter((id): id is string => Boolean(id));

    const departmentIdsFromBreakdown = departmentBreakdownRaw
      .map(entry => entry.departmentid)
      .filter((id): id is string => Boolean(id));

    const referencedDepartmentIds = Array.from(
      new Set([...departmentIdsFromBreakdown, ...shiftDepartmentIds])
    );

    const departments = referencedDepartmentIds.length
      ? await prisma.department.findMany({
          where: { id: { in: referencedDepartmentIds } },
          select: { id: true, name: true },
        })
      : [];

    const departmentMap = new Map(departments.map(dept => [dept.id, dept.name]));

    const normalizedShifts = rawShifts.map(({
      Employee,
      Location,
      ...rest
    }) => ({
      ...rest,
      employee: Employee
        ? {
            id: Employee.id,
            User: Employee.User,
            Department: Employee.Department,
          }
        : null,
      department: rest.departmentId
        ? {
            id: rest.departmentId,
            name: departmentMap.get(rest.departmentId) ?? 'Unknown Department',
          }
        : null,
      location: Location,
    }));

    const departmentBreakdown = departmentBreakdownRaw.map(entry => ({
      departmentId: entry.departmentid ?? 'unassigned',
      departmentName: entry.departmentid
        ? departmentMap.get(entry.departmentid) ?? 'Unknown Department'
        : 'Unassigned',
      cost: Number(entry.cost ?? 0),
      hours: Number(entry.hours ?? 0),
      employeeCount: Number(entry.employeecount ?? 0),
      shiftCount: Number(entry.shiftcount ?? 0),
    }));

    return NextResponse.json({
      shifts: normalizedShifts,
      pagination: {
        page,
        pageSize,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: page * pageSize < totalCount,
      },
      summary: {
        totalCost: Number(summaryRow?.totalcost ?? 0),
        scheduledHours: Number(summaryRow?.scheduledhours ?? 0),
        overtimeHours: Number(summaryRow?.overtimehours ?? 0),
        publishedCount: Number(summaryRow?.publishedcount ?? 0),
        unpublishedCount: Number(summaryRow?.unpublishedcount ?? 0),
      },
      departmentBreakdown,
    });
  } catch (error) {
    console.error('Shifts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createShiftSchema.parse(body);

    // Get requesting user's employee record
    const requestingEmployee = await prisma.employee.findUnique({
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

    if (!requestingEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Check permission (ADMIN or MANAGER only)
    const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
    if (!isAdminOrManager) {
      return NextResponse.json(
        { error: 'You do not have permission to create shifts' },
        { status: 403 }
      );
    }

    // Validate times
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Calculate cost if employee assigned
    let cost = null;
    if (data.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: data.employeeId },
        select: { hourlyRate: true },
      });

      if (employee?.hourlyRate) {
        const shiftHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        cost = calculateShiftCost(
          shiftHours,
          data.breakDuration,
          parseFloat(employee.hourlyRate.toString())
        );
      }
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        companyId: requestingEmployee.companyId,
        employeeId: data.employeeId,
        templateId: data.templateId,
        departmentId: data.departmentId,
        locationId: data.locationId,
        startTime,
        endTime,
        breakDuration: data.breakDuration,
        notes: data.notes,
        role: data.role,
        requiredSkills: data.requiredSkills,
        requiresConfirmation: data.requiresConfirmation,
        cost: cost,
        createdBy: session.user.id,
      },
      include: {
        Template: true,
      },
    });

    return NextResponse.json({
      success: true,
      shift,
      message: 'Shift created successfully',
    });
  } catch (error) {
    console.error('Shift creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}
