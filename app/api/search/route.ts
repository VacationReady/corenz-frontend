import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { ensurePrismaConnected, prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

const querySchema = z.object({
  q: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, " "))
    .optional(),
  limit: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(1).max(50))
    .optional(),
});

const DEFAULT_LIMIT = 10;

const CASE_INSENSITIVE_CONTAINS = (value: string) => ({
  contains: value,
  mode: "insensitive" as const,
});

function appendEmployeeSearchFilters(
  employeeWhere: Prisma.EmployeeWhereInput,
  searchTerms: string[],
) {
  if (!searchTerms.length) {
    return;
  }

  const andFilters = searchTerms.map<Prisma.EmployeeWhereInput>((term) => ({
    OR: [
      { User: { firstName: CASE_INSENSITIVE_CONTAINS(term) } },
      { User: { lastName: CASE_INSENSITIVE_CONTAINS(term) } },
      { User: { email: CASE_INSENSITIVE_CONTAINS(term) } },
      { Department: { name: CASE_INSENSITIVE_CONTAINS(term) } },
      { JobRole: { name: CASE_INSENSITIVE_CONTAINS(term) } },
    ],
  }));

  const existing = employeeWhere.AND;
  const normalised = Array.isArray(existing)
    ? existing
    : existing
      ? [existing]
      : [];

  employeeWhere.AND = [...normalised, ...andFilters];
}

async function buildEmployeeResults(
  employeeWhere: Prisma.EmployeeWhereInput,
  limit: number,
) {
  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      User: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImageUrl: true,
        },
      },
      Department: { select: { id: true, name: true } },
      JobRole: { select: { id: true, name: true } },
    },
    take: limit,
    orderBy: { User: { updatedAt: "desc" } },
  });

  return Promise.all(
    employees.map(async (employee) => {
      let profileUrl: string | null = null;

      if (employee.User.profileImageUrl) {
        try {
          const { data } = await supabase.storage
            .from("documents")
            .createSignedUrl(employee.User.profileImageUrl, 60 * 5);

          profileUrl = data?.signedUrl ?? null;
        } catch (error) {
          console.error("Failed to sign profile image", error);
          profileUrl = null;
        }
      }

      return {
        type: "employee" as const,
        id: employee.id,
        userId: employee.User.id,
        firstName: employee.User.firstName,
        lastName: employee.User.lastName,
        email: employee.User.email,
        department: employee.Department
          ? { id: employee.Department.id, name: employee.Department.name }
          : null,
        jobRole: employee.JobRole
          ? { id: employee.JobRole.id, name: employee.JobRole.name }
          : null,
        profileImageUrl: profileUrl,
        isActive: employee.isActive,
      };
    }),
  );
}

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const query = parsed.data.q ?? "";
    const limit = parsed.data.limit ?? DEFAULT_LIMIT;
    const searchTerms = query
      .split(" ")
      .map((term) => term.trim())
      .filter(Boolean);

    const employeeWhere: Prisma.EmployeeWhereInput = {
      companyId: session.user.companyId,
      isActive: true,
    };

    appendEmployeeSearchFilters(employeeWhere, searchTerms);

    const employees = await buildEmployeeResults(employeeWhere, limit);

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Global search failed", error);
    return NextResponse.json(
      { error: "Failed to run search" },
      { status: 500 },
    );
  }
}
