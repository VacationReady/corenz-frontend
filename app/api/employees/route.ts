// app/api/employees/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      jobRole,
      managerId,
    } = body;

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        department,
        jobRole,
        role: "EMPLOYEE",
        managerId: managerId || null,
      },
    });

    // Promote manager if they're still just an EMPLOYEE
    if (managerId) {
      const current = await prisma.user.findUnique({ where: { id: managerId } });
      if (current?.role === "EMPLOYEE") {
        await prisma.user.update({
          where: { id: managerId },
          data: { role: "MANAGER" },
        });
      }
    }

    return NextResponse.json(newUser);
  } catch (err) {
    console.error("Create error:", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
