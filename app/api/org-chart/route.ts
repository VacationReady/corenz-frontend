import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

type OrgRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

const normalizeRole = (role: string | null | undefined): OrgRole => {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "ADMIN";
    case "MANAGER":
      return "MANAGER";
    default:
      return "EMPLOYEE";
  }
};

const getSignedProfileUrl = async (path: string | null | undefined) => {
  if (!path) {
    return null;
  }

  try {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companyId = session.user.companyId;

    const users = await prisma.user.findMany({
      where: { 
        companyId,
        // Exclude deleted users (those with placeholder emails)
        NOT: {
          email: {
            contains: "@reset.peoplecore.invalid"
          }
        }
      },
      include: {
        Employee: {
          select: {
            id: true,
            isActive: true,
            departmentId: true,
            jobRoleId: true,
            Department: { select: { id: true, name: true } },
            JobRole: { select: { id: true, name: true } },
          },
        },
        Department_User_departmentIdToDepartment: {
          select: { id: true, name: true },
        },
        JobRole: {
          select: { id: true, name: true },
        },
        PermissionProfile: {
          select: { name: true },
        },
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
        { email: "asc" },
      ],
    });

    const enriched = await Promise.all(
      users.map(async (user) => {
        const employee = user.Employee;
        const department =
          employee?.Department ?? user.Department_User_departmentIdToDepartment;
        const jobRole = employee?.JobRole ?? user.JobRole;

        return {
          id: employee?.id ?? user.id,
          userId: user.id,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: user.email ?? "",
          phone: user.phone ?? null,
          role: normalizeRole(user.role as string | null | undefined),
          departmentId: department?.id ?? null,
          departmentName: department?.name ?? null,
          jobRoleId: jobRole?.id ?? null,
          jobRoleName: jobRole?.name ?? null,
          isActive: employee?.isActive ?? true, // If employee record exists, they should be considered active
          profileImageUrl: await getSignedProfileUrl(user.profileImageUrl),
          managerUserId: user.managerId ?? null,
          permissionProfileName: user.PermissionProfile?.name ?? null,
        } as const;
      })
    );

    // Stable sort by full name, then email (merges intent from codex branch)
    const sorted = enriched.sort((a, b) => {
      const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
      const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();

      if (nameA && nameB && nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }

      return (a.email ?? "").localeCompare(b.email ?? "");
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Failed to load org chart data", error);
    return NextResponse.json(
      { error: "Unable to load organisation chart" },
      { status: 500 },
    );
  }
}
