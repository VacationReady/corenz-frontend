import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filterType = searchParams.get("filterType");
  const filterValue = searchParams.get("filterValue");
  const companyId = searchParams.get("companyId");

  if (!filterType || !filterValue || !companyId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  if (companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let whereClause: any = { companyId };

    // Build filter based on filterType
    switch (filterType) {
      case "all":
        // Show all active employees
        whereClause.isActive = true;
        break;
      case "department":
        whereClause.departmentId = filterValue;
        break;
      case "location":
        whereClause.locationId = filterValue;
        break;
      case "jobRole":
        whereClause.jobRoleId = filterValue;
        break;
      case "employmentType":
        if (filterValue === "unspecified") {
          whereClause.employmentType = null;
        } else {
          whereClause.employmentType = filterValue;
        }
        break;
      case "contractType":
        whereClause.contractType = filterValue;
        break;
      case "newHires":
        // Employees who started in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        whereClause.startDate = {
          gte: thirtyDaysAgo,
        };
        break;
      case "departures":
        // Employees who left in the last 30 days
        const thirtyDaysAgoForDepartures = new Date();
        thirtyDaysAgoForDepartures.setDate(thirtyDaysAgoForDepartures.getDate() - 30);
        whereClause.OR = [
          { lastWorkingDate: { gte: thirtyDaysAgoForDepartures } },
          { offboardingDate: { gte: thirtyDaysAgoForDepartures } },
        ];
        break;
      case "contractsExpiring":
        // Employees with contracts expiring in the next 60 days
        const now = new Date();
        const sixtyDaysAhead = new Date();
        sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);
        whereClause.contractEndDate = {
          gte: now,
          lte: sixtyDaysAhead,
        };
        break;
      case "tenureBand":
        // Handle tenure bands
        const currentDate = new Date();
        switch (filterValue) {
          case "under_1":
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            whereClause.startDate = { gte: oneYearAgo };
            break;
          case "1_to_3":
            const threeYearsAgo = new Date();
            threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
            const oneYearAgoFor3 = new Date();
            oneYearAgoFor3.setFullYear(oneYearAgoFor3.getFullYear() - 1);
            whereClause.startDate = {
              gte: threeYearsAgo,
              lt: oneYearAgoFor3,
            };
            break;
          case "3_to_5":
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            const threeYearsAgoFor5 = new Date();
            threeYearsAgoFor5.setFullYear(threeYearsAgoFor5.getFullYear() - 3);
            whereClause.startDate = {
              gte: fiveYearsAgo,
              lt: threeYearsAgoFor5,
            };
            break;
          case "5_plus":
            const fiveYearsAgoForPlus = new Date();
            fiveYearsAgoForPlus.setFullYear(fiveYearsAgoForPlus.getFullYear() - 5);
            whereClause.startDate = { lt: fiveYearsAgoForPlus };
            break;
        }
        break;
      default:
        return NextResponse.json(
          { error: "Invalid filter type" },
          { status: 400 }
        );
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        isActive: true,
        startDate: true,
        lastWorkingDate: true,
        offboardingDate: true,
        employmentType: true,
        contractType: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
        Location: {
          select: {
            id: true,
            name: true,
          },
        },
        JobRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { User: { firstName: "asc" } },
      ],
    });

    // Transform the data to match the expected format
    const transformedEmployees = employees.map((emp) => ({
      id: emp.id,
      firstName: emp.User.firstName,
      lastName: emp.User.lastName,
      email: emp.User.email,
      isActive: emp.isActive,
      startDate: emp.startDate?.toISOString(),
      department: emp.Department,
      location: emp.Location,
      jobRole: emp.JobRole,
      employmentType: emp.employmentType,
      contractType: emp.contractType,
    }));

    return NextResponse.json({
      employees: transformedEmployees,
      total: transformedEmployees.length,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
