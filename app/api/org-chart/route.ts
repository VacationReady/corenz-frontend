import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companyId = session.user.companyId;

    const users = await prisma.user.findMany({
      where: { companyId },
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
        let profileUrl: string | null = null;

        if (user.profileImageUrl) {
          try {
            const { data } = await supabase.storage
              .from("documents")
              .createSignedUrl(user.profileImageUrl, 60 * 5);
            profileUrl = data?.signedUrl ?? null;
          } catch {
            profileUrl = null;
          }
        }

        const employee = user.Employee;
        const department =
          employee?.Department ?? user.Department_User_departmentIdToDepartment;
        const jobRole = employee?.JobRole ?? user.JobRole;

        return {
          id: employee?.id ?? user.id,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          departmentId: department?.id ?? null,
          departmentName: department?.name ?? null,
          jobRoleId: jobRole?.id ?? null,
          jobRoleName: jobRole?.name ?? null,
          isActive: employee?.isActive ?? user.isActivated ?? false,
          profileImageUrl: profileUrl,
          managerUserId: user.managerId,
          permissionProfileName: user.PermissionProfile?.name ?? null,
        } as const;
      }),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to load org chart data", error);
    return NextResponse.json(
      { error: "Unable to load organisation chart" },
      { status: 500 },
    );
  }
}
