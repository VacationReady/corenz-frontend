import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companyId = session.user.companyId;

    const employees = await prisma.employee.findMany({
      where: { companyId },
      include: {
        Department: { select: { id: true, name: true } },
        JobRole: { select: { id: true, name: true } },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActivated: true,
            managerId: true,
            profileImageUrl: true,
            PermissionProfile: { select: { name: true } },
            Department_User_departmentIdToDepartment: {
              select: { id: true, name: true },
            },
            JobRole: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { User: { firstName: "asc" } },
        { User: { lastName: "asc" } },
        { User: { email: "asc" } },
      ],
    });

    const employeeUserIds = new Set(employees.map((employee) => employee.userId));

    const standaloneUsers = await prisma.user.findMany({
      where: {
        companyId,
        id: { notIn: Array.from(employeeUserIds) },
      },
      include: {
        Department_User_departmentIdToDepartment: {
          select: { id: true, name: true },
        },
        JobRole: { select: { id: true, name: true } },
        PermissionProfile: { select: { name: true } },
        Employee: {
          select: { id: true },
        },
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
        { email: "asc" },
      ],
    });

    const formattedEmployees = await Promise.all(
      employees.map(async (employee) => {
        const user = employee.User;
        const department =
          employee.Department ?? user?.Department_User_departmentIdToDepartment;
        const jobRole = employee.JobRole ?? user?.JobRole;

        return {
          id: employee.id,
          userId: user?.id ?? employee.userId,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          email: user?.email ?? "",
          phone: user?.phone ?? null,
          role: normalizeRole(user?.role),
          departmentId: department?.id ?? null,
          departmentName: department?.name ?? null,
          jobRoleId: jobRole?.id ?? null,
          jobRoleName: jobRole?.name ?? null,
          isActive: employee.isActive,
          profileImageUrl: await getSignedProfileUrl(user?.profileImageUrl),
          managerUserId: user?.managerId ?? null,
          permissionProfileName: user?.PermissionProfile?.name ?? null,
        } as const;
      }),
    );

    const formattedStandaloneUsers = await Promise.all(
      standaloneUsers.map(async (user) => {
        const department = user.Department_User_departmentIdToDepartment;
        const jobRole = user.JobRole;

        return {
          id: user.Employee?.id ?? user.id,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: normalizeRole(user.role),
          departmentId: department?.id ?? null,
          departmentName: department?.name ?? null,
          jobRoleId: jobRole?.id ?? null,
          jobRoleName: jobRole?.name ?? null,
          isActive: user.isActivated ?? false,
          profileImageUrl: await getSignedProfileUrl(user.profileImageUrl),
          managerUserId: user.managerId,
          permissionProfileName: user.PermissionProfile?.name ?? null,
        } as const;
      }),
    );

    const combined = [...formattedEmployees, ...formattedStandaloneUsers].sort(
      (a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`
          .trim()
          .toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`
          .trim()
          .toLowerCase();

        if (nameA && nameB && nameA !== nameB) {
          return nameA.localeCompare(nameB);
        }

        return a.email.localeCompare(b.email);
      },
    );

    return NextResponse.json(combined);
  } catch (error) {
    console.error("Failed to load org chart data", error);
    return NextResponse.json(
      { error: "Unable to load organisation chart" },
      { status: 500 },
    );
  }
}
