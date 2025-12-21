import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { z } from "zod";
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";

const querySchema = z.object({
  status: z.enum(["active", "archived", "all"]).default("active"),
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => Number.isFinite(v) && v > 0, {
      message: "limit must be a positive number",
    })
    .optional(),
});

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();

    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, cursor } = parsed.data;
    const rawLimit = parsed.data.limit ?? 50;
    const limit = Math.min(Math.max(1, rawLimit), 100);

    const where: any = {
      companyId: session.user.companyId,
    };

    if (status === "active") {
      where.isActive = true;
    } else if (status === "archived") {
      where.isActive = false;
    }

    const employees = await prisma.employee.findMany({
      where,
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
        Department: {
          select: { id: true },
        },
        JobRole: {
          select: { id: true },
        },
      },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = employees.length > limit;
    const results = hasMore ? employees.slice(0, limit) : employees;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    const profileSignRequests = results
      .filter((emp) => emp.User.profileImageUrl)
      .map((emp) => ({
        id: emp.User.id,
        path: emp.User.profileImageUrl!,
      }));

    const signedUrlMap =
      profileSignRequests.length > 0
        ? await batchSignProfileUrlsAsMap(profileSignRequests)
        : new Map<string, string | null>();

    const data = results.map((emp) => {
      const user = emp.User;
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`
        .trim()
        .replace(/\s+/g, " ");

      const avatarPath = user.profileImageUrl ?? null;
      const avatarSignedUrl =
        avatarPath && signedUrlMap.size
          ? signedUrlMap.get(user.id) ?? null
          : null;

      return {
        id: emp.id,
        userId: user.id,
        fullName: fullName || user.email || emp.id,
        email: user.email ?? null,
        departmentId: emp.Department?.id ?? null,
        jobRoleId: emp.JobRole?.id ?? null,
        avatar: {
          path: avatarPath,
          signedUrl: avatarSignedUrl,
        },
      } as const;
    });

    return NextResponse.json({
      data,
      pagination: {
        limit,
        cursor: nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    console.error("[employees/minimal] Error:", error);
    return NextResponse.json(
      { error: "Error loading employees" },
      { status: 500 },
    );
  }
}


