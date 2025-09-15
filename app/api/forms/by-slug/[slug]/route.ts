import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch form by slug
export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions);

  console.log("📡 Incoming request to /api/forms/by-slug/[slug]");

  if (!session?.user?.companyId) {
    console.warn("⛔ No companyId found in session.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          user: {
            include: {
              jobRole: true,
              department: true,
            },
          },
        },
      });

      console.log("✅ Found employee:", JSON.stringify(employee, null, 2));
    }

    // Build visibility filter
    let visibilityFilter = {};
    if (employee) {
      const user = employee.user;

      const userRole = user?.role || "EMPLOYEE";
      const userDepartmentId = user?.department?.id?.trim(); // ✅ trim for safety
      const userJobRole = user?.jobRole?.name;

      console.log("🔍 Role:", userRole);
      console.log("🏢 Department ID:", userDepartmentId);
      console.log("🛠 Job Role:", userJobRole);

      // ✅ TEMP: manually test department match
      const formDebug = await prisma.form.findFirst({
        where: {
          slug: params.slug,
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

              ...(userJobRole
                ? [
                    {
                      visibleToJobRoles: { has: userJobRole },
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
        slug: params.slug,
        companyId: session.user.companyId,
        isActive: true,
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
