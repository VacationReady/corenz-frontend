import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { config, employeeId } = await req.json();

    // Fetch the new employee
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: {
        Department: true,
        User: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const criteria = config.criteria || 'same_department';
    const minTenure = config.minTenure || 180;
    let buddy = null;

    // Calculate minimum start date for tenure
    const minStartDate = new Date();
    minStartDate.setDate(minStartDate.getDate() - minTenure);

    if (criteria === 'specific' && config.buddyId) {
      // Use specific buddy
      buddy = await prisma.employee.findFirst({
        where: { id: config.buddyId, companyId: session.user.companyId, isActive: true },
        include: { User: true },
      });
    } else if (criteria === 'same_department') {
      // Find buddy in same department with minimum tenure
      const candidates = await prisma.employee.findMany({
        where: {
          companyId: session.user.companyId,
          departmentId: employee.departmentId,
          isActive: true,
          id: { not: employeeId }, // Exclude the new employee
          startDate: { lte: minStartDate },
        },
        include: { User: true },
        orderBy: { startDate: 'asc' }, // Prefer longer-tenured employees
      });
      
      // Random selection from eligible candidates
      if (candidates.length > 0) {
        buddy = candidates[Math.floor(Math.random() * candidates.length)];
      }
    } else if (criteria === 'same_location') {
      // Find buddy in same location
      const candidates = await prisma.employee.findMany({
        where: {
          companyId: session.user.companyId,
          locationId: employee.locationId,
          isActive: true,
          id: { not: employeeId },
          startDate: { lte: minStartDate },
        },
        include: { User: true },
        orderBy: { startDate: 'asc' },
      });
      
      if (candidates.length > 0) {
        buddy = candidates[Math.floor(Math.random() * candidates.length)];
      }
    } else {
      // Random from entire company
      const candidates = await prisma.employee.findMany({
        where: {
          companyId: session.user.companyId,
          isActive: true,
          id: { not: employeeId },
          startDate: { lte: minStartDate },
        },
        include: { User: true },
        take: 20, // Limit to reduce query size
      });
      
      if (candidates.length > 0) {
        buddy = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (!buddy) {
      return NextResponse.json({
        success: false,
        error: "No eligible buddy found",
        fallback: "hr_team",
      });
    }

    // Store buddy assignment (you could add a BuddyAssignment model or use Employee fields)
    // For now, return the buddy information
    
    // Fetch department name if needed
    let departmentName = null;
    if (buddy.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: buddy.departmentId },
        select: { name: true },
      });
      departmentName = dept?.name;
    }

    return NextResponse.json({
      success: true,
      buddy: {
        id: buddy.id,
        name: `${buddy.User?.firstName || ''} ${buddy.User?.lastName || ''}`.trim(),
        email: buddy.User?.email,
        department: departmentName,
      },
      criteria: criteria,
      message: `Assigned ${buddy.User?.firstName} ${buddy.User?.lastName} as buddy`,
    });
  } catch (error: any) {
    console.error('Buddy assignment failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign buddy' },
      { status: 500 }
    );
  }
}

