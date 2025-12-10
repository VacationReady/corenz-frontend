import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch form by slug
export async function GET(
  req: NextRequest,
  context: any,
) {
  const session = await auth();

  console.log("📡 Incoming request to /api/forms/by-slug/[slug]");

  if (!session?.user?.companyId) {
    console.warn("⛔ No companyId found in session.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  console.log("👤 Employee ID:", employeeId);

  try {
    let employee = null;

    if (employeeId) {
      employee = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          companyId: session.user.companyId,
        },
        include: {
          User: {
            include: {
              JobRole: true,
              Department_User_departmentIdToDepartment: true,
            },
          },
        },
      });

      console.log("✅ Found employee:", JSON.stringify(employee, null, 2));
    }

    // Build visibility filter
    let visibilityFilter = {};
    if (employee) {
      const user = employee.User;

      const userRole = user?.role || "EMPLOYEE";
      const userDepartmentId = user?.Department_User_departmentIdToDepartment?.id?.trim(); // ✅ trim for safety
      // Use job role ID for matching - forms store job role IDs, not names
      const userJobRoleId = user?.JobRole?.id;

      console.log("🔍 Role:", userRole);
      console.log("🏢 Department ID:", userDepartmentId);
      console.log("🛠 Job Role ID:", userJobRoleId);

      // ✅ TEMP: manually test department match
    const formDebug = await prisma.form.findFirst({
        where: {
        slug: slug,
          companyId: session.user.companyId,
          isActive: true,
        },
        select: {
          visibleToDepartments: true,
        },
      });

      console.log("🧪 Manual dept match test:");
      console.log("  Dept ID in form:", formDebug?.visibleToDepartments);
      console.log("  Dept ID on user:", userDepartmentId);
      console.log(
        "  Match result:",
        userDepartmentId &&
          formDebug?.visibleToDepartments?.includes(userDepartmentId),
      );

      visibilityFilter = {
        AND: [
          {
            OR: [
              { visibleToRoles: { isEmpty: true } },
              { visibleToRoles: { has: userRole } },

              ...(userDepartmentId
                ? [
                    {
                      visibleToDepartments: { has: userDepartmentId },
                    },
                  ]
                : []),

              ...(userJobRoleId
                ? [
                    {
                      visibleToJobRoles: { has: userJobRoleId },
                    },
                  ]
                : []),
            ],
          },
        ],
      };
    }

    console.log(
      "🧩 Final visibility filter:",
      JSON.stringify(visibilityFilter, null, 2),
    );

    const form = await prisma.form.findFirst({
      where: {
        slug: slug,
        companyId: session.user.companyId,
        isActive: true,
        formType: { not: "SURVEY" }, // BLOCK SURVEY FORMS FROM EMPLOYEE ROUTES
        ...visibilityFilter,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        formType: true,
        schema: true,
      },
    });

    console.log("📄 Form found:", form ? "Yes" : "No");

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error: any) {
    console.error(
      "🔥 Error fetching form by slug:",
      error.message,
      error.stack,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
