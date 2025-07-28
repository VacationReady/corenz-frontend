// /app/api/documents/list-employee/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const companyId = session.user.companyId;

    if (!employeeId) {
        return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    // ✅ Determine user role
    const userRole = session.user.role; // e.g., "admin" | "manager" | "employee"

    // ✅ Build role-based filter
    let accessFilter = {};
    if (userRole === "admin") {
        accessFilter = { canViewAdmin: true };
    } else if (userRole === "manager") {
        accessFilter = { canViewManager: true };
    } else {
        accessFilter = { canViewEmployee: true };
    }

    const documents = await prisma.document.findMany({
        where: {
            employeeId,
            companyId,
            deletedAt: null,
            ...accessFilter, // ✅ Enforce access rights
        },
        include: {
            uploader: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return NextResponse.json(documents);
}
